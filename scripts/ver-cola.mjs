#!/usr/bin/env node
/**
 * Muestra que hay publicado y que hay esperando turno.
 *
 *   npm run cola
 */

import { leerEntradas, leerZona } from './lib/comun.mjs';

const zona = leerZona();
const entradas = await leerEntradas();

const fmtHora = new Intl.DateTimeFormat('es-ES', {
  timeZone: zona,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

if (entradas.length === 0) {
  console.log('\n  No hay entradas todavia. Crea una con: npm run nueva -- "Titulo"\n');
  process.exit(0);
}

// Se compara el momento exacto, no solo el dia: una entrada de hoy a las 20:00
// todavia no esta publicada si son las 14:00.
const ahora = new Date();

const publicadas = entradas.filter((e) => !e.borrador && e.momento <= ahora);
const enCola = entradas.filter((e) => !e.borrador && e.momento > ahora);
const borradores = entradas.filter((e) => e.borrador);

function imprimir(titulo, lista, marca) {
  if (lista.length === 0) return;
  console.log(`\n  ${titulo} (${lista.length})`);
  for (const e of lista) {
    const hora = e.llevaHora ? ` ${fmtHora.format(e.momento)}` : '      ';
    console.log(`    ${marca} ${e.fecha}${hora}  ${e.titulo}`);
  }
}

imprimir('PUBLICADAS', publicadas.slice().reverse(), 'o');
imprimir('EN COLA', enCola, '.');
imprimir('BORRADORES (no se publican)', borradores, 'x');

if (enCola.length > 0) {
  const dias = enCola.length;
  console.log(
    `\n  Tienes contenido para ${dias} ${dias === 1 ? 'dia' : 'dias'} mas sin tocar nada.\n`
  );
} else {
  console.log('\n  La cola esta vacia. Escribe algunas entradas cuando puedas.\n');
}
