#!/usr/bin/env node
/**
 * Descarga las portadas de los volumenes a public/portadas/.
 *
 *   npm run portadas              -> baja las que falten
 *   npm run portadas -- --forzar  -> vuelve a bajar todas
 *
 * Por que descargarlas y no enlazarlas:
 *   - Enlazar a otra web se rompe el dia que esa web cambia o te limita.
 *   - Blogger copia el HTML tal cual: necesita direcciones que existan siempre.
 *
 * De donde salen: Open Library (Internet Archive), que sirve portadas por ISBN
 * y por su propio identificador. No las tiene todas, y va anadiendo con el
 * tiempo, asi que vale la pena volver a correr esto de vez en cuando.
 *
 * AniList NO sirve aqui: solo guarda UNA imagen para toda la obra (la del
 * volumen 1), no una por volumen.
 */

import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { RAIZ } from './lib/comun.mjs';

const DIR = path.join(RAIZ, 'public', 'portadas');

// ISBN de la edicion inglesa (Yen Press). Sacados de las fichas de
// yenpress.com/series/that-time-i-got-reincarnated-as-a-slime-light-novel
const ISBN = {
  1: ['9780316414203'],
  2: ['9781975301118'],
  4: ['9781975301156', '9781975301149'],
  5: ['9781975301163'],
  6: ['9781975301187'],
  7: ['9781975301200'],
  8: ['9781975312992'],
  9: ['9781975314378'],
  10: ['9781975314392'],
  11: ['9781975314415'],
  12: ['9781975314439'],
  13: ['9781975314453'],
  14: ['9781975314477'],
  15: ['9781975314491'],
  16: ['9781975369750'],
  17: ['9781975375539'],
  18: ['9781975375553'],
  19: ['9781975375577'],
  20: ['9781975375591'],
  21: ['9798855403374'],
  22: ['9798855425062'],
};

const TOTAL = 23;
const MINIMO = 2000; // Open Library devuelve ~43 bytes cuando no tiene portada

const forzar = process.argv.includes('--forzar');

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function bajar(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.length > MINIMO ? buf : null;
}

/**
 * Pregunta a Open Library por ese volumen y devuelve TODAS las pistas que
 * tenga: identificadores de portada e ISBN de cualquier edicion. Una sola
 * edicion puede no tener portada mientras otra del mismo volumen si.
 */
async function buscarPistas(vol) {
  const q = encodeURIComponent(`That Time I Got Reincarnated as a Slime Vol ${vol} light novel`);
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${q}&fields=title,cover_i,isbn,edition_key&limit=20`
  );
  if (!res.ok) return { covers: [], isbns: [] };

  const { docs = [] } = await res.json();
  // Solo el volumen exacto: "Vol. 3" no puede colarse en la busqueda del 13.
  const patron = new RegExp(`Vol\\.?\\s*${vol}(?!\\d)`, 'i');
  const suyos = docs.filter((d) => patron.test(d.title ?? ''));

  return {
    covers: [...new Set(suyos.map((d) => d.cover_i).filter(Boolean))],
    isbns: [...new Set(suyos.flatMap((d) => d.isbn ?? []))].slice(0, 12),
  };
}

await mkdir(DIR, { recursive: true });

const nuevas = [];
const yaEstaban = [];
const sinSuerte = [];

for (let vol = 1; vol <= TOTAL; vol++) {
  const nombre = `vol-${String(vol).padStart(2, '0')}.jpg`;
  const destino = path.join(DIR, nombre);

  if (!forzar) {
    try {
      await access(destino);
      yaEstaban.push(vol);
      continue;
    } catch {
      // no existe, seguimos
    }
  }

  let datos = null;

  // 1) por los ISBN que ya conocemos de Yen Press
  for (const isbn of ISBN[vol] ?? []) {
    datos = await bajar(`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`);
    await esperar(300);
    if (datos) break;
  }

  // 2) si no, se le pregunta a Open Library por otras ediciones del mismo
  //    volumen: una puede no tener portada y otra si.
  if (!datos) {
    const { covers, isbns } = await buscarPistas(vol);
    await esperar(300);

    for (const id of covers) {
      datos = await bajar(`https://covers.openlibrary.org/b/id/${id}-L.jpg`);
      await esperar(300);
      if (datos) break;
    }

    if (!datos) {
      for (const isbn of isbns) {
        datos = await bajar(`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`);
        await esperar(300);
        if (datos) break;
      }
    }
  }

  if (datos) {
    await writeFile(destino, datos);
    nuevas.push(vol);
    console.log(`  vol ${String(vol).padStart(2)}  descargada  (${datos.length} bytes)`);
  } else {
    sinSuerte.push(vol);
    console.log(`  vol ${String(vol).padStart(2)}  no disponible`);
  }
}

console.log('\n  ---');
if (yaEstaban.length) console.log(`  Ya estaban  (${yaEstaban.length}): ${yaEstaban.join(', ')}`);
if (nuevas.length) console.log(`  Descargadas (${nuevas.length}): ${nuevas.join(', ')}`);
if (sinSuerte.length) {
  console.log(`  Sin portada (${sinSuerte.length}): ${sinSuerte.join(', ')}`);
  console.log('\n  Para esas: guarda la imagen a mano en public/portadas/ con el');
  console.log('  nombre vol-NN.jpg, o vuelve a correr esto dentro de unos meses.');
}
console.log('');
