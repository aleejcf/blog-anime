import { getCollection, type CollectionEntry } from 'astro:content';

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

export function formatearFecha(fecha: Date): string {
  // En UTC a proposito: las fechas del frontmatter son solo dia (2026-07-29),
  // asi que Astro las lee como medianoche UTC. Formatearlas en una zona con
  // desfase negativo mostraria el dia anterior.
  return fecha.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
