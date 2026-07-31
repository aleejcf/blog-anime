import { readFileSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(fileURLToPath(import.meta.url), '../../..');
export const DIR_ENTRADAS = path.join(RAIZ, 'src', 'content', 'entradas');

/**
 * Lee la zona horaria de src/consts.ts para no tenerla escrita en dos sitios.
 * Es un archivo TypeScript y esto es un .mjs, asi que se saca con una busqueda
 * de texto en vez de importarlo. Si algo falla, se cae a UTC.
 */
export function leerZona() {
  try {
    const texto = readFileSync(path.join(RAIZ, 'src', 'consts.ts'), 'utf8');
    return texto.match(/ZONA\s*=\s*validarZona\(\s*['"]([^'"]+)['"]/)?.[1] ?? 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Desfase de una zona en una fecha dada, en formato "-06:00".
 * Se calcula (no se escribe a mano) para que el horario de verano, donde
 * aplique, no descuadre las fechas.
 */
export function offsetDeZona(fecha, zona) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    timeZoneName: 'longOffset',
  }).formatToParts(fecha);

  const nombre = partes.find((p) => p.type === 'timeZoneName')?.value ?? '';
  // Viene como "GMT-06:00", o solo "GMT" cuando el desfase es cero.
  return nombre.match(/GMT([+-]\d{2}:\d{2})/)?.[1] ?? '+00:00';
}

/**
 * Junta un dia (medianoche UTC) con una hora local y devuelve un ISO completo
 * con el desfase explicito, por ejemplo "2026-08-03T14:30:00-06:00".
 * Guardar el desfase en el archivo lo hace legible y sin ambiguedad.
 */
export function componerFechaISO(dia, hora, zona) {
  if (!hora) return aISO(dia);

  const [h, m] = hora.split(':');
  const hh = String(Number(h)).padStart(2, '0');
  const mm = String(Number(m ?? 0)).padStart(2, '0');

  return `${aISO(dia)}T${hh}:${mm}:00${offsetDeZona(dia, zona)}`;
}

// Marcas diacriticas combinantes. Se construye desde una cadena para que el
// archivo quede en ASCII puro y ningun editor lo rompa al guardar.
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g');

/** Convierte "Re:Zero - Temporada 3" en "rezero-temporada-3". */
export function slugificar(texto) {
  return texto
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

/** Fecha en formato YYYY-MM-DD (siempre en UTC, para que no baile el dia). */
export function aISO(fecha) {
  return fecha.toISOString().slice(0, 10);
}

export function hoyUTC() {
  const ahora = new Date();
  return new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
}

/**
 * El dia de hoy SEGUN TU RELOJ, no segun UTC.
 *
 * A las 22:00 en Honduras ya es el dia siguiente en UTC, asi que usar hoyUTC()
 * para calcular "manana" se salta un dia entero. Esto devuelve el dia que
 * marca tu calendario.
 */
export function hoyLocal(zona) {
  // en-CA da el formato aaaa-mm-dd, que es justo lo que necesitamos.
  const dia = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  return new Date(`${dia}T00:00:00Z`);
}

export function sumarDias(fecha, dias) {
  const copia = new Date(fecha.getTime());
  copia.setUTCDate(copia.getUTCDate() + dias);
  return copia;
}

/**
 * Lee las entradas existentes y devuelve solo lo que necesitamos: el archivo,
 * su fecha y si es borrador. Sin librerias de YAML: el frontmatter que
 * generamos es siempre simple y predecible.
 */
export async function leerEntradas() {
  let archivos;
  try {
    archivos = await readdir(DIR_ENTRADAS);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const entradas = [];

  for (const archivo of archivos.filter((n) => n.endsWith('.md') || n.endsWith('.mdx'))) {
    const ruta = path.join(DIR_ENTRADAS, archivo);
    const texto = await readFile(ruta, 'utf8');

    // Acepta "2026-08-03" y tambien "2026-08-03T14:30:00-06:00".
    const bruta = texto.match(/^fecha:\s*['"]?([0-9T:+\-]{10,25})['"]?\s*$/m)?.[1];
    const titulo = texto.match(/^titulo:\s*['"](.+?)['"]\s*$/m)?.[1];
    // Admite un comentario detras: "borrador: true # ponlo en false cuando..."
    const borrador = /^borrador:\s*true\s*(#.*)?$/m.test(texto);

    if (!bruta) continue;

    const fecha = bruta.slice(0, 10);
    const momento = new Date(bruta.length > 10 ? bruta : `${bruta}T00:00:00Z`);

    entradas.push({
      archivo,
      ruta,
      fecha, // solo el dia, para ordenar y comparar
      bruta, // tal como esta en el archivo
      momento, // Date exacto, con hora si la lleva
      llevaHora: bruta.length > 10,
      titulo: titulo ?? archivo,
      borrador,
    });
  }

  return entradas.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/**
 * Devuelve la siguiente fecha libre de la cola: el dia despues de la entrada
 * programada mas lejana, o hoy si la cola esta vacia. Asi cada entrada nueva
 * se publica un dia despues de la anterior.
 */
export async function siguienteFechaLibre() {
  const entradas = await leerEntradas();
  const hoy = hoyUTC();

  if (entradas.length === 0) return hoy;

  const ultima = new Date(`${entradas[entradas.length - 1].fecha}T00:00:00Z`);
  const siguiente = sumarDias(ultima, 1);

  return siguiente.getTime() > hoy.getTime() ? siguiente : hoy;
}
