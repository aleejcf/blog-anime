import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(fileURLToPath(import.meta.url), '../../..');
export const DIR_ENTRADAS = path.join(RAIZ, 'src', 'content', 'entradas');

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

    const fecha = texto.match(/^fecha:\s*['"]?(\d{4}-\d{2}-\d{2})/m)?.[1];
    const titulo = texto.match(/^titulo:\s*['"](.+?)['"]\s*$/m)?.[1];
    // Admite un comentario detras: "borrador: true # ponlo en false cuando..."
    const borrador = /^borrador:\s*true\s*(#.*)?$/m.test(texto);

    if (!fecha) continue;
    entradas.push({ archivo, ruta, fecha, titulo: titulo ?? archivo, borrador });
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
