import { getCollection, type CollectionEntry } from 'astro:content';
import { ZONA } from '../consts';

export type Entrada = CollectionEntry<'entradas'>;
export type TipoEntrada = Entrada['data']['tipo'];

/**
 * El corazon de la automatizacion.
 *
 * Devuelve solo las entradas que ya "tocan": las que no son borrador y cuya
 * fecha ya paso. Como GitHub Actions reconstruye el sitio todos los dias, una
 * entrada con fecha futura aparece sola ese dia sin que toques nada.
 */
export async function getEntradasPublicadas(): Promise<Entrada[]> {
  const ahora = new Date();

  const publicadas = await getCollection('entradas', ({ data }) => {
    if (data.borrador) return false;
    return data.fecha.getTime() <= ahora.getTime();
  });

  return publicadas.sort((a, b) => b.data.fecha.getTime() - a.data.fecha.getTime());
}

/** Entradas en cola: escritas, con fecha futura, esperando su turno. */
export async function getEntradasEnCola(): Promise<Entrada[]> {
  const ahora = new Date();

  const cola = await getCollection('entradas', ({ data }) => {
    if (data.borrador) return false;
    return data.fecha.getTime() > ahora.getTime();
  });

  return cola.sort((a, b) => a.data.fecha.getTime() - b.data.fecha.getTime());
}

const ETIQUETAS_TIPO: Record<TipoEntrada, string> = {
  novela: 'Novela ligera',
  anime: 'Anime',
  manga: 'Manga',
  personaje: 'Personaje',
  analisis: 'Análisis',
  automatico: 'Boletín',
};

export function nombreTipo(tipo: TipoEntrada): string {
  return ETIQUETAS_TIPO[tipo];
}

const AVISOS_SPOILER: Record<Entrada['data']['spoilers'], string | null> = {
  ninguno: null,
  leves: 'Contiene spoilers leves. Nada que arruine un giro importante.',
  totales: 'Contiene spoilers grandes. Si no has llegado hasta aquí, mejor vuelve luego.',
};

export function avisoSpoiler(nivel: Entrada['data']['spoilers']): string | null {
  return AVISOS_SPOILER[nivel];
}

/**
 * Una fecha "solo dia" (2026-07-29) la lee Astro como medianoche UTC exacta.
 * Si trae hora (2026-07-29T19:30:00-06:00) ya no cae en medianoche UTC.
 * Esa es la forma de distinguirlas una vez convertidas en Date.
 */
export function llevaHora(fecha: Date): boolean {
  return (
    fecha.getUTCHours() !== 0 || fecha.getUTCMinutes() !== 0 || fecha.getUTCSeconds() !== 0
  );
}

export function formatearFecha(fecha: Date): string {
  // Las fechas de solo dia se formatean en UTC a proposito: en una zona con
  // desfase negativo, medianoche UTC caeria en el dia anterior. Las que llevan
  // hora si se muestran en la zona local, que es donde tienen sentido.
  return fecha.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: llevaHora(fecha) ? ZONA : 'UTC',
  });
}

/** Solo la hora, para las entradas programadas a una hora concreta. */
export function formatearHora(fecha: Date): string {
  return fecha.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: ZONA,
  });
}
