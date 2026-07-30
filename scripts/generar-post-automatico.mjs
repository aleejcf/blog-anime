#!/usr/bin/env node
/**
 * Genera el boletin "Estado de la franquicia" con datos reales de AniList.
 *
 *   npm run auto              -> crea el boletin de este mes
 *   npm run auto -- --forzar  -> lo regenera aunque ya exista
 *
 * Parte de la novela ligera (AniList 86355) y sigue sus RELACIONES, asi que
 * descubre solo las adaptaciones y spin-offs nuevos: si anuncian una temporada
 * 4, aparece en el siguiente boletin sin tocar el codigo.
 *
 * Publica DATOS, no opiniones: formato, estado, numero de episodios o
 * capitulos, nota media de la comunidad y enlace a la ficha. Son hechos
 * verificables y cambian con el tiempo, que es justo lo que hace que valga la
 * pena regenerarlo. Las sinopsis no se copian: se enlaza a la fuente.
 */

import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { DIR_ENTRADAS, aISO, hoyUTC } from './lib/comun.mjs';

const ID_NOVELA = 86355; // Tensei Shitara Slime Datta Ken (novela ligera)
const API = 'https://graphql.anilist.co';

const CONSULTA = `
query ($id: Int) {
  Media(id: $id) {
    ...ficha
    relations {
      edges {
        relationType(version: 2)
        node { ...ficha }
      }
    }
  }
}

fragment ficha on Media {
  id
  type
  format
  status
  episodes
  chapters
  volumes
  seasonYear
  season
  averageScore
  popularity
  isAdult
  title { romaji english }
  siteUrl
}`;

async function consultar() {
  const respuesta = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: CONSULTA, variables: { id: ID_NOVELA } }),
  });

  if (!respuesta.ok) {
    throw new Error(`AniList respondio ${respuesta.status} ${respuesta.statusText}`);
  }

  const datos = await respuesta.json();
  if (datos.errors?.length) {
    throw new Error(`AniList devolvio errores: ${JSON.stringify(datos.errors)}`);
  }
  return datos.data.Media;
}

const FORMATOS = {
  TV: 'Serie de TV',
  TV_SHORT: 'Serie corta',
  MOVIE: 'Pelicula',
  SPECIAL: 'Especial',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'Musical',
  MANGA: 'Manga',
  NOVEL: 'Novela ligera',
  ONE_SHOT: 'One-shot',
};

const ESTADOS = {
  FINISHED: 'Terminado',
  RELEASING: 'En curso',
  NOT_YET_RELEASED: 'Anunciado',
  CANCELLED: 'Cancelado',
  HIATUS: 'En pausa',
};

const formato = (m) => FORMATOS[m.format] ?? m.format ?? '—';
const estado = (m) => ESTADOS[m.status] ?? m.status ?? '—';

function extension(m) {
  if (m.type === 'ANIME') return m.episodes ? `${m.episodes} ep.` : '—';
  if (m.volumes) return `${m.volumes} vol.`;
  if (m.chapters) return `${m.chapters} cap.`;
  return '—';
}

function titulo(m) {
  return m.title.romaji ?? m.title.english ?? `AniList ${m.id}`;
}

function escapar(texto) {
  return String(texto).replace(/\|/g, '\\|');
}

function tabla(medios) {
  const filas = medios.map((m) => {
    const nota = m.averageScore ? `${m.averageScore}` : '—';
    const anio = m.seasonYear ?? '—';
    return `| [${escapar(titulo(m))}](${m.siteUrl}) | ${formato(m)} | ${anio} | ${extension(m)} | ${estado(m)} | ${nota} |`;
  });

  return [
    '| Obra | Formato | Año | Extensión | Estado | Nota |',
    '| --- | --- | --- | --- | --- | --- |',
    ...filas,
  ].join('\n');
}

// ------------------------- ejecucion -------------------------

const forzar = process.argv.includes('--forzar');
const hoy = hoyUTC();
const mes = aISO(hoy).slice(0, 7); // YYYY-MM

const destino = path.join(DIR_ENTRADAS, `${aISO(hoy)}-estado-franquicia.md`);

if (!forzar) {
  try {
    await access(destino);
    console.log(`\n  El boletin de ${aISO(hoy)} ya existe. Nada que hacer.`);
    console.log('  (usa --forzar para regenerarlo)\n');
    process.exit(0);
  } catch {
    // No existe: lo generamos.
  }
}

let novela;
try {
  novela = await consultar();
} catch (error) {
  console.error(`\n  No se pudo consultar AniList: ${error.message}`);
  console.error('  El boletin de este mes se salta. El resto del blog sigue igual.\n');
  process.exit(1);
}

// La novela mas todo lo que cuelga de ella, sin duplicados ni contenido adulto.
const relacionadas = (novela.relations?.edges ?? [])
  .map((e) => e.node)
  .filter((m) => m && !m.isAdult);

const vistos = new Set([novela.id]);
const franquicia = [novela];
for (const m of relacionadas) {
  if (vistos.has(m.id)) continue;
  vistos.add(m.id);
  franquicia.push(m);
}

const animes = franquicia
  .filter((m) => m.type === 'ANIME')
  .sort((a, b) => (a.seasonYear ?? 0) - (b.seasonYear ?? 0));

const papel = franquicia
  .filter((m) => m.type === 'MANGA')
  .sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0));

const enCurso = franquicia.filter((m) => m.status === 'RELEASING');
const anunciadas = franquicia.filter((m) => m.status === 'NOT_YET_RELEASED');

const lineas = [];

lineas.push(
  `Boletín generado automáticamente con datos de [AniList](https://anilist.co) el ${aISO(hoy)}.`,
  `La franquicia tiene **${franquicia.length} obras** registradas: ${animes.length} en formato anime y ${papel.length} en papel.`,
  ''
);

if (enCurso.length > 0) {
  lineas.push(
    '## En curso ahora mismo',
    '',
    enCurso.map((m) => `- [${titulo(m)}](${m.siteUrl}) — ${formato(m)}`).join('\n'),
    ''
  );
}

if (anunciadas.length > 0) {
  lineas.push(
    '## Anunciado, sin fecha de estreno',
    '',
    anunciadas.map((m) => `- [${titulo(m)}](${m.siteUrl}) — ${formato(m)}`).join('\n'),
    ''
  );
}

lineas.push('## Adaptaciones en anime', '', tabla(animes), '');
lineas.push('## Novela y manga', '', tabla(papel), '');

lineas.push(
  '---',
  '',
  '*Las notas son la media de la comunidad de AniList en el momento de la consulta',
  'y cambian con el tiempo. Los enlaces llevan a la ficha original de cada obra.*'
);

const contenido = `---
titulo: "Estado de la franquicia — ${mes}"
resumen: "Foto fija de las ${franquicia.length} obras de Tensura registradas en AniList: formato, estado, extensión y nota de la comunidad."
fecha: ${aISO(hoy)}
tipo: automatico
etiquetas: ["datos", "franquicia"]
borrador: false
---

${lineas.join('\n')}
`;

await mkdir(DIR_ENTRADAS, { recursive: true });
await writeFile(destino, contenido, 'utf8');

console.log(`\n  Boletin creado: ${path.relative(process.cwd(), destino)}`);
console.log(`  ${franquicia.length} obras (${animes.length} anime, ${papel.length} en papel).`);
if (enCurso.length) console.log(`  En curso: ${enCurso.map(titulo).join(', ')}`);
console.log('');
