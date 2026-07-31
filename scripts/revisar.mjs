#!/usr/bin/env node
/**
 * Revisa el blog entero y avisa de problemas antes de que se publiquen.
 *
 *   npm run revisar
 *
 * Comprueba:
 *   - videos de YouTube repetidos en varias entradas
 *   - videos que ya no existen o son privados
 *   - portadas que apuntan a archivos que no estan
 *   - entradas publicadas que todavia tienen PENDIENTE
 *   - volumenes sin portada disponible
 *
 * Nacio porque el mismo trailer acabo en dos entradas distintas sin que nadie
 * se diera cuenta. Corrigelo antes de subir y no vuelve a pasar.
 */

import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { RAIZ, DIR_ENTRADAS } from './lib/comun.mjs';

const DIR_PORTADAS = path.join(RAIZ, 'public', 'portadas');
const comprobarRed = !process.argv.includes('--rapido');

const problemas = [];
const avisos = [];

/** Quita los comentarios MDX para no analizar codigo de ejemplo. */
const sinComentarios = (t) => t.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const archivos = (await readdir(DIR_ENTRADAS)).filter(
  (n) => n.endsWith('.md') || n.endsWith('.mdx')
);

const videos = new Map(); // id -> [archivos]
const portadas = new Map(); // ruta -> [archivos]

for (const archivo of archivos) {
  const bruto = await readFile(path.join(DIR_ENTRADAS, archivo), 'utf8');
  const texto = sinComentarios(bruto);
  const esBorrador = /^borrador:\s*true/m.test(bruto);

  for (const m of texto.matchAll(/youtube\.com\/watch\?v=([\w-]{11})/g)) {
    if (!videos.has(m[1])) videos.set(m[1], []);
    videos.get(m[1]).push(archivo);
  }

  for (const m of texto.matchAll(/(?:src|portada:)\s*"?(\/[^"'\s)]+\.(?:jpg|jpeg|png|webp))"?/g)) {
    if (!portadas.has(m[1])) portadas.set(m[1], []);
    portadas.get(m[1]).push(archivo);
  }

  if (!esBorrador) {
    const n = (texto.match(/PENDIENTE/g) ?? []).length;
    if (n > 0) problemas.push(`${archivo}: publicada con ${n} PENDIENTE sin rellenar`);
  }
}

// --- videos repetidos ---
for (const [id, donde] of videos) {
  if (donde.length > 1) {
    problemas.push(`video ${id} repetido en ${donde.length} entradas:\n      ${donde.join('\n      ')}`);
  }
}

// --- portadas que no existen ---
for (const [ruta, donde] of portadas) {
  const local = path.join(RAIZ, 'public', ruta.replace(/^\/blog-anime\//, ''));
  try {
    await access(local);
  } catch {
    problemas.push(`imagen que no existe: ${ruta}\n      usada en: ${donde.join(', ')}`);
  }
}

// --- volumenes sin portada ---
const hay = new Set(
  (await readdir(DIR_PORTADAS).catch(() => []))
    .map((n) => Number(n.match(/^vol-(\d\d)\.jpg$/)?.[1]))
    .filter(Boolean)
);
const faltan = [];
for (let v = 1; v <= 23; v++) if (!hay.has(v)) faltan.push(v);
if (faltan.length) avisos.push(`volumenes sin portada: ${faltan.join(', ')}  (prueba: npm run portadas)`);

// --- videos vivos ---
if (comprobarRed) {
  for (const id of videos.keys()) {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        problemas.push(`video ${id} no disponible (${res.status}) en ${videos.get(id).join(', ')}`);
      }
    } catch {
      avisos.push(`no se pudo comprobar el video ${id} (sin conexion?)`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }
}

// --- informe ---
console.log(`\n  ${archivos.length} entradas | ${videos.size} videos | ${hay.size}/23 portadas\n`);

if (problemas.length) {
  console.log(`  PROBLEMAS (${problemas.length}):`);
  for (const p of problemas) console.log(`    x ${p}`);
  console.log('');
}

if (avisos.length) {
  console.log(`  AVISOS (${avisos.length}):`);
  for (const a of avisos) console.log(`    . ${a}`);
  console.log('');
}

if (!problemas.length && !avisos.length) console.log('  Todo en orden.\n');

process.exit(problemas.length ? 1 : 0);
