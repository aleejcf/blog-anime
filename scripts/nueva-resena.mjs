#!/usr/bin/env node
/**
 * Crea una entrada nueva y la mete al final de la cola.
 *
 *   npm run nueva -- "Volumen 2: los enanos" --tipo novela --volumen 2 --nota 8
 *   npm run nueva -- "La temporada 3 se queda corta" --tipo anime --spoilers leves
 *   npm run nueva -- "Benimaru" --tipo personaje
 *
 * La fecha se asigna sola: el dia siguiente a la ultima entrada programada.
 * Escribe cinco de estas de una sentada y el blog publica una por dia durante
 * cinco dias sin que vuelvas a tocar nada.
 */

import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { DIR_ENTRADAS, slugificar, aISO, siguienteFechaLibre } from './lib/comun.mjs';

const TIPOS = ['novela', 'anime', 'manga', 'personaje', 'analisis'];
const NIVELES_SPOILER = ['ninguno', 'leves', 'totales'];

function parsearArgumentos(argv) {
  const posicionales = [];
  const opciones = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      opciones[arg.slice(2)] = argv[i + 1];
      i++;
    } else {
      posicionales.push(arg);
    }
  }

  return { posicionales, opciones };
}

function morir(mensaje) {
  console.error(`\n  ${mensaje}\n`);
  process.exit(1);
}

const { posicionales, opciones } = parsearArgumentos(process.argv.slice(2));
const titulo = posicionales.join(' ').trim();

if (!titulo) {
  console.error('\n  Falta el titulo.\n');
  console.error('    npm run nueva -- "Volumen 2: los enanos" --tipo novela --volumen 2 --nota 8\n');
  console.error(`    --tipo      ${TIPOS.join(' | ')}   (por defecto: novela)`);
  console.error('    --volumen   1 a 23 (opcional)');
  console.error('    --arco      nombre del arco, entre comillas (opcional)');
  console.error('    --nota      0 a 10 (opcional)');
  console.error(`    --spoilers  ${NIVELES_SPOILER.join(' | ')}   (por defecto: ninguno)\n`);
  process.exit(1);
}

const tipo = opciones.tipo ?? 'novela';
if (!TIPOS.includes(tipo)) morir(`Tipo no valido: "${tipo}". Usa uno de: ${TIPOS.join(', ')}`);

const spoilers = opciones.spoilers ?? 'ninguno';
if (!NIVELES_SPOILER.includes(spoilers)) {
  morir(`Nivel de spoilers no valido: "${spoilers}". Usa: ${NIVELES_SPOILER.join(', ')}`);
}

let volumen;
if (opciones.volumen !== undefined) {
  volumen = Number(opciones.volumen);
  if (!Number.isInteger(volumen) || volumen < 1 || volumen > 23) {
    morir('El volumen tiene que ser un entero entre 1 y 23.');
  }
}

let nota;
if (opciones.nota !== undefined) {
  nota = Number(opciones.nota);
  if (Number.isNaN(nota) || nota < 0 || nota > 10) {
    morir('La nota tiene que ser un numero entre 0 y 10.');
  }
}

const arco = opciones.arco;

const fecha = await siguienteFechaLibre();
const slug = slugificar(titulo);
const destino = path.join(DIR_ENTRADAS, `${aISO(fecha)}-${slug}.mdx`);

try {
  await access(destino);
  morir(`Ya existe ${path.relative(process.cwd(), destino)}. Cambia el titulo o borra el archivo.`);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

// ---------- frontmatter ----------

const campos = [
  `titulo: "${titulo.replace(/"/g, '\\"')}"`,
  'resumen: "PENDIENTE: una frase que dé ganas de leer el resto."',
  `fecha: ${aISO(fecha)}`,
  `tipo: ${tipo}`,
];

if (volumen !== undefined) campos.push(`volumen: ${volumen}`);
if (arco) campos.push(`arco: "${arco.replace(/"/g, '\\"')}"`);
campos.push(`spoilers: ${spoilers}`);
campos.push('etiquetas: []');
if (nota !== undefined) campos.push(`puntuacion: ${nota}`);
campos.push('borrador: false');

// ---------- cuerpo, distinto segun el tipo ----------

const IMPORTS =
  "import { Video, Figura, Galeria, FichaVolumen, Personaje, Cita, Spoiler, Destacado } from '../../components/mdx';";

const AYUDA = `{/*
  Componentes que puedes usar aqui:
    <Video url="https://www.youtube.com/watch?v=..." pie="..." />
    <Figura src="https://..." alt="..." pie="..." />
    <Galeria imagenes={[{src:'...', alt:'...'}]} pie="..." />
    <FichaVolumen numero={1} arco="..." nota={8} portada="..." publicado="..." />
    <Personaje nombre="..." rol="..." foto="...">texto</Personaje>
    <Cita autor="...">frase corta</Cita>
    <Spoiler aviso="...">texto que queda plegado</Spoiler>
    <Destacado titulo="...">apartado</Destacado>

  Ojo: los comentarios de HTML no funcionan en MDX. Se usan asi, con llaves.
  Borra este bloque cuando termines.
*/}`;

const CUERPOS = {
  novela: `${volumen !== undefined ? `<FichaVolumen numero={${volumen}}${arco ? ` arco="${arco}"` : ''}${nota !== undefined ? ` nota={${nota}}` : ''} />\n\n` : ''}## De qué va

PENDIENTE: dos o tres frases, sin destripar nada.

## Qué me pareció

PENDIENTE — la sección que importa. No resumas: opina. ¿Qué te engancho?
¿Qué te saco de la historia? ¿Se sostiene el ritmo?

## Un detalle que me quedó

PENDIENTE: una escena, una ilustración, una decisión de la traducción.
Lo específico es lo que suena a persona y no a ficha.

## Veredicto

PENDIENTE: ¿sigues? ¿lo recomiendas? ¿a quién no?`,

  anime: `## Qué adapta

PENDIENTE: qué volúmenes o capítulos cubre.

## Qué cambia respecto a la novela

PENDIENTE: qué se cortó, qué se añadió, qué se reordenó — y si funcionó.

## Cómo se ve y cómo suena

PENDIENTE: animación, dirección, banda sonora, doblaje.

## Veredicto

PENDIENTE`,

  manga: `## Qué adapta

PENDIENTE

## El dibujo

PENDIENTE: cómo resuelve las escenas que en la novela son puro texto.

## Veredicto

PENDIENTE`,

  personaje: `<Personaje nombre="PENDIENTE" rol="PENDIENTE">
  Una línea que lo resuma.
</Personaje>

## Quién es

PENDIENTE: sin spoilers de más.

## Por qué me importa

PENDIENTE: qué le ves. Aquí es donde se nota si de verdad te gusta el personaje
o solo estás rellenando.

## Su mejor momento

PENDIENTE

<Spoiler aviso="Spoiler — clic para mostrar">
  Lo que no puede leer quien va a medias.
</Spoiler>`,

  analisis: `## La idea

PENDIENTE: qué vas a defender en esta entrada. Una tesis, no un resumen.

## Los argumentos

PENDIENTE

## Lo que le veo en contra

PENDIENTE: el contraargumento honesto. Esto es lo que separa un análisis
de una opinión suelta.

## Conclusión

PENDIENTE`,
};

const plantilla = `---
${campos.join('\n')}
---

${IMPORTS}

${AYUDA}

${CUERPOS[tipo]}
`;

await mkdir(DIR_ENTRADAS, { recursive: true });
await writeFile(destino, plantilla, 'utf8');

console.log(`\n  Entrada creada: ${path.relative(process.cwd(), destino)}`);
console.log(`  Tipo: ${tipo}${volumen !== undefined ? `, volumen ${volumen}` : ''}`);
console.log(`  Se publicara el: ${aISO(fecha)}`);
console.log('\n  Abrela, sustituye los PENDIENTE, y haz commit. Nada mas.\n');
