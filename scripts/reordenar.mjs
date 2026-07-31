#!/usr/bin/env node
/**
 * Recoloca las fechas para que no haya ni huecos ni choques.
 *
 *   npm run reordenar            -> dice que haria, sin tocar nada
 *   npm run reordenar -- --hazlo -> lo aplica
 *
 * Como funciona:
 *   - Lo ya publicado no se toca. Esta en la calle, su fecha es historia.
 *   - Lo que queda por salir se reparte a un dia por dia a partir de manana:
 *     primero lo que ya esta escrito, y despues los borradores en el orden
 *     que traian del plan editorial.
 *
 * Existe porque al escribir una resena adelantada quedaban dos dias en blanco
 * (los de los borradores sin escribir) y luego dos entradas el mismo dia.
 */

import { readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import {
  DIR_ENTRADAS,
  leerEntradas,
  aISO,
  hoyLocal,
  sumarDias,
  leerZona,
  offsetDeZona,
} from './lib/comun.mjs';

const aplicar = process.argv.includes('--hazlo');
const zona = leerZona();

// Se conserva la hora que ya tenia cada entrada; solo cambia el dia.
const HORA_POR_DEFECTO = '19:00';

const todas = await leerEntradas();
const ahora = new Date();

const publicadas = todas.filter((e) => !e.borrador && e.momento <= ahora);
const porSalir = todas.filter((e) => e.borrador || e.momento > ahora);

// Lo escrito va primero, para que no queden dias en blanco esperando a que
// alguien rellene un borrador.
const escritas = porSalir.filter((e) => !e.borrador).sort((a, b) => a.fecha.localeCompare(b.fecha));
const borradores = porSalir.filter((e) => e.borrador).sort((a, b) => a.fecha.localeCompare(b.fecha));
const orden = [...escritas, ...borradores];

// Manana segun TU calendario, no segun UTC.
let dia = sumarDias(hoyLocal(zona), 1);
const cambios = [];

for (const entrada of orden) {
  const nuevoDia = aISO(dia);
  const hora = entrada.llevaHora
    ? new Intl.DateTimeFormat('es-ES', {
        timeZone: zona,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(entrada.momento)
    : HORA_POR_DEFECTO;

  const nuevaFecha = `${nuevoDia}T${hora}:00${offsetDeZona(dia, zona)}`;

  if (entrada.bruta !== nuevaFecha || !entrada.archivo.startsWith(nuevoDia)) {
    cambios.push({ entrada, nuevaFecha, nuevoDia, hora });
  }

  dia = sumarDias(dia, 1);
}

console.log(`\n  ${publicadas.length} publicadas (no se tocan)`);
console.log(`  ${escritas.length} escritas por salir, ${borradores.length} borradores\n`);

if (cambios.length === 0) {
  console.log('  Las fechas ya estan bien. Nada que hacer.\n');
  process.exit(0);
}

console.log(`  ${cambios.length} entradas cambian de fecha:\n`);
for (const c of cambios.slice(0, 15)) {
  const marca = c.entrada.borrador ? ' ' : '*';
  console.log(`   ${marca} ${c.entrada.fecha} -> ${c.nuevoDia} ${c.hora}  ${c.entrada.titulo.slice(0, 48)}`);
}
if (cambios.length > 15) console.log(`     ... y ${cambios.length - 15} mas`);
console.log('\n   (* = ya escrita)');

if (!aplicar) {
  console.log('\n  Esto es solo una simulacion. Para aplicarlo:');
  console.log('    npm run reordenar -- --hazlo\n');
  process.exit(0);
}

for (const { entrada, nuevaFecha, nuevoDia } of cambios) {
  let texto = await readFile(entrada.ruta, 'utf8');
  texto = texto.replace(/^fecha:.*$/m, `fecha: ${nuevaFecha}`);
  await writeFile(entrada.ruta, texto, 'utf8');

  // El nombre del archivo lleva la fecha delante; si cambia, se renombra para
  // que la direccion de la entrada siga cuadrando.
  const sinFecha = entrada.archivo.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  const nuevoNombre = `${nuevoDia}-${sinFecha}`;
  if (nuevoNombre !== entrada.archivo) {
    await rename(entrada.ruta, path.join(DIR_ENTRADAS, nuevoNombre));
  }
}

console.log(`\n  ${cambios.length} entradas recolocadas.`);
console.log('  Revisa con: npm run cola\n');
