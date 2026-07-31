#!/usr/bin/env node
/**
 * Sube las entradas a Blogger. Cada entrada se crea como borrador y luego se
 * publica con `publishDate`, asi que BLOGGER se encarga de programarla: si la
 * fecha es futura, la suelta el ese dia por su cuenta.
 *
 * Antes de correr esto hace falta el export de Astro:
 *
 *   npm run exportar        (build con EXPORTAR_BLOGGER=1)
 *   npm run blogger         (sube lo que falte)
 *   npm run blogger -- --actualizar   (reenvia tambien las ya subidas)
 *   npm run blogger -- --simular      (no toca nada, solo dice que haria)
 *
 * Necesita cuatro variables de entorno (en Actions van como Secrets):
 *   BLOGGER_BLOG_ID, BLOGGER_CLIENT_ID, BLOGGER_CLIENT_SECRET, BLOGGER_REFRESH_TOKEN
 *
 * Lleva la cuenta de lo subido en blogger-publicados.json para no duplicar.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RAIZ } from './lib/comun.mjs';

const EXPORT = path.join(RAIZ, 'dist', 'blogger-export.json');
const REGISTRO = path.join(RAIZ, 'blogger-publicados.json');

const { BLOGGER_BLOG_ID, BLOGGER_CLIENT_ID, BLOGGER_CLIENT_SECRET, BLOGGER_REFRESH_TOKEN } =
  process.env;

const simular = process.argv.includes('--simular');
const actualizar = process.argv.includes('--actualizar');

if (!simular) {
  const faltan = [
    ['BLOGGER_BLOG_ID', BLOGGER_BLOG_ID],
    ['BLOGGER_CLIENT_ID', BLOGGER_CLIENT_ID],
    ['BLOGGER_CLIENT_SECRET', BLOGGER_CLIENT_SECRET],
    ['BLOGGER_REFRESH_TOKEN', BLOGGER_REFRESH_TOKEN],
  ]
    .filter(([, valor]) => !valor)
    .map(([nombre]) => nombre);

  if (faltan.length > 0) {
    console.error(`\n  Faltan variables de entorno: ${faltan.join(', ')}`);
    console.error('  Consiguelas con: node scripts/obtener-token-blogger.mjs');
    console.error('  O prueba primero en seco con: npm run blogger -- --simular\n');
    process.exit(1);
  }
}

// ------------------------------------------------------------------
// Estilos que viajan dentro del post. Blogger tiene su propio tema, asi que
// todo va acotado bajo .tempest para no pelearse con el.
// ------------------------------------------------------------------
const ESTILOS = `
<style>
.tempest{--tq:#10777f;--or:#9a6b12;--bd:#d5dfec;--sf:#f7fafd;--sv:#5a6785;line-height:1.7}
.tempest figure{margin:1.8em 0}
.tempest .video__marco{position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;border:1px solid var(--bd)}
.tempest .video__marco iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0}
.tempest .pie-medio{margin:.7em 0 0;font-size:.85em;color:var(--sv);text-align:center}
.tempest .figura img,.tempest .prosa img{max-width:100%;height:auto;border-radius:10px;border:1px solid var(--bd)}
.tempest .galeria__rejilla{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.8em}
.tempest .galeria__rejilla img{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:10px;border:1px solid var(--bd)}
.tempest .ficha{display:flex;gap:1.3em;background:var(--sf);border:1px solid var(--bd);border-radius:10px;padding:1.3em;margin:1.8em 0}
.tempest .ficha__portada{flex:0 0 130px}
.tempest .ficha__portada img{width:100%;border-radius:6px}
.tempest .ficha__num{font-size:.72em;letter-spacing:.13em;text-transform:uppercase;color:var(--tq);font-weight:700;margin:0}
.tempest .ficha__titulo{margin:.2em 0 .7em;font-size:1.2em}
.tempest .ficha__datos{display:grid;grid-template-columns:auto 1fr;gap:.3em .9em;font-size:.9em;margin:0}
.tempest .ficha__datos dt{color:var(--sv);font-size:.75em;letter-spacing:.05em;text-transform:uppercase}
.tempest .ficha__datos dd{margin:0}
.tempest .personaje{display:flex;gap:1em;align-items:center;background:var(--sf);border:1px solid var(--bd);border-left:3px solid var(--tq);border-radius:10px;padding:1em 1.2em;margin:1.6em 0}
.tempest .personaje__foto{flex:0 0 70px;height:70px;border-radius:50%;object-fit:cover}
.tempest .personaje__nombre{margin:0;font-size:1.05em}
.tempest .personaje__rol{margin:.1em 0 0;font-size:.8em;color:var(--sv)}
.tempest .personaje__texto{margin:.45em 0 0;font-size:.95em}
.tempest .cita{text-align:center;margin:2.2em 0}
.tempest .cita__texto{font-size:1.3em;font-style:italic;margin:0;border:0;padding:0}
.tempest .cita__autor{display:block;margin-top:.8em;font-size:.78em;letter-spacing:.09em;text-transform:uppercase;color:var(--sv);font-style:normal}
.tempest .spoiler{border:1px dashed var(--or);border-radius:10px;padding:0 1.1em;margin:1.8em 0;background:#fdf8ec}
.tempest .spoiler>summary{cursor:pointer;padding:.8em 0;font-size:.9em;font-weight:600;color:var(--or)}
.tempest .spoiler__cuerpo{padding-bottom:1em}
.tempest .destacado{background:var(--sf);border:1px solid var(--bd);border-left:3px solid var(--or);border-radius:10px;padding:1.1em 1.3em;margin:1.8em 0}
.tempest .destacado__titulo{margin:0 0 .5em;font-size:.75em;letter-spacing:.11em;text-transform:uppercase;color:var(--or);font-weight:700}
.tempest table{width:100%;border-collapse:collapse;font-size:.9em;display:block;overflow-x:auto}
.tempest th,.tempest td{text-align:left;padding:.5em .7em;border-bottom:1px solid var(--bd)}
.tempest blockquote{border-left:3px solid var(--tq);padding-left:1.1em;color:var(--sv);font-style:italic;margin:1.6em 0}
@media(max-width:520px){.tempest .ficha{flex-direction:column}.tempest .ficha__portada{max-width:140px}}
</style>
`.trim();

// ------------------------------------------------------------------

async function conseguirAccessToken() {
  const respuesta = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: BLOGGER_CLIENT_ID,
      client_secret: BLOGGER_CLIENT_SECRET,
      refresh_token: BLOGGER_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  const datos = await respuesta.json();

  if (!respuesta.ok || !datos.access_token) {
    throw new Error(
      `no pude renovar el token (${respuesta.status}): ${JSON.stringify(datos)}. ` +
        'Si dice invalid_grant, el refresh token fue revocado: vuelve a correr obtener-token-blogger.mjs'
    );
  }

  return datos.access_token;
}

async function llamarBlogger(token, ruta, opciones = {}) {
  const url = `https://www.googleapis.com/blogger/v3/blogs/${BLOGGER_BLOG_ID}${ruta}`;
  const respuesta = await fetch(url, {
    ...opciones,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...opciones.headers,
    },
  });

  const texto = await respuesta.text();
  const cuerpo = texto ? JSON.parse(texto) : {};

  if (!respuesta.ok) {
    const mensaje = cuerpo.error?.message ?? texto;
    throw new Error(`Blogger ${respuesta.status} en ${ruta}: ${mensaje}`);
  }

  return cuerpo;
}

/**
 * Trae lo que ya hay en Blogger, indexado por titulo.
 *
 * Sin esto se duplican entradas: si publicas desde tu maquina y ademas corre
 * el workflow con un registro que todavia no incluye esa entrada, cada uno
 * crea la suya y acabas con dos copias. Comprobar por titulo antes de crear
 * hace que el script sea seguro aunque el registro venga desfasado.
 */
async function traerExistentes(token) {
  const porTitulo = new Map();

  // Los tres estados. Si falta 'scheduled', una entrada programada no se ve y
  // se acaba creando un duplicado: paso exactamente eso con el volumen 3.
  for (const estado of ['live', 'scheduled', 'draft']) {
    let paginaToken;
    do {
      const params = new URLSearchParams({
        maxResults: '100',
        fetchBodies: 'false',
        status: estado,
        fields: 'items(id,title),nextPageToken',
      });
      if (paginaToken) params.set('pageToken', paginaToken);

      const pagina = await llamarBlogger(token, `/posts?${params}`);
      for (const p of pagina.items ?? []) {
        if (!porTitulo.has(p.title)) porTitulo.set(p.title, p.id);
      }
      paginaToken = pagina.nextPageToken;
    } while (paginaToken);
  }

  return porTitulo;
}

/** Envuelve el HTML de la entrada y le pega los estilos y una nota de origen. */
function armarCuerpo(entrada) {
  const partes = [ESTILOS, '<div class="tempest">'];

  if (entrada.spoilers !== 'ninguno') {
    const aviso =
      entrada.spoilers === 'totales'
        ? 'Contiene spoilers grandes de la novela.'
        : 'Contiene spoilers leves.';
    partes.push(
      `<p style="background:#fdf8ec;border:1px solid #9a6b12;border-radius:10px;padding:.7em 1em;color:#9a6b12;font-size:.9em"><strong>Aviso:</strong> ${aviso}</p>`
    );
  }

  if (entrada.portada) {
    partes.push(
      `<p><img src="${entrada.portada}" alt="Portada de ${escaparHtml(entrada.titulo)}" style="max-width:100%;height:auto;border-radius:10px"></p>`
    );
  }

  partes.push(entrada.html, '</div>');
  return partes.join('\n');
}

function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function etiquetasDe(entrada) {
  const etiquetas = ['Tensura', ...entrada.etiquetas];
  if (entrada.volumen) etiquetas.push(`Volumen ${entrada.volumen}`);
  if (entrada.arco) etiquetas.push(entrada.arco);
  // Blogger admite hasta 20 etiquetas por entrada.
  return [...new Set(etiquetas)].slice(0, 20);
}

// ------------------------- ejecucion -------------------------

let exportado;
try {
  exportado = JSON.parse(await readFile(EXPORT, 'utf8'));
} catch (error) {
  console.error(`\n  No encontre ${path.relative(RAIZ, EXPORT)}.`);
  console.error('  Corre primero: npm run exportar\n');
  process.exit(1);
}

const entradas = exportado.entradas ?? [];

if (entradas.length === 0) {
  console.error('\n  El export esta vacio.');
  console.error('  Asegurate de construir con EXPORTAR_BLOGGER=1 (npm run exportar).\n');
  process.exit(1);
}

let registro = {};
try {
  registro = JSON.parse(await readFile(REGISTRO, 'utf8'));
} catch {
  // Primera vez: registro vacio.
}

const pendientes = entradas.filter((e) => actualizar || !registro[e.id]);

if (pendientes.length === 0) {
  console.log(`\n  Todo al dia: las ${entradas.length} entradas ya estan en Blogger.`);
  console.log('  (usa --actualizar para reenviarlas)\n');
  process.exit(0);
}

console.log(`\n  ${entradas.length} entradas en el export, ${pendientes.length} por subir.`);

if (simular) {
  console.log('  MODO SIMULACION: no se envia nada.\n');
  for (const entrada of pendientes) {
    const yaEsta = registro[entrada.id] ? ' (ya subida, se actualizaria)' : '';
    const programada = new Date(entrada.fecha) > new Date() ? ' [programada]' : '';
    console.log(`    ${entrada.fecha.slice(0, 10)}  ${entrada.titulo}${programada}${yaEsta}`);
    console.log(`      ${entrada.html.length} chars, etiquetas: ${etiquetasDe(entrada).join(', ')}`);
  }
  console.log('');
  process.exit(0);
}

const token = await conseguirAccessToken();
const existentes = await traerExistentes(token);
console.log(`  Blogger ya tiene ${existentes.size} entradas; se comprueban por titulo.\n`);

let subidas = 0;
let fallos = 0;
let adoptadas = 0;

for (const entrada of pendientes) {
  const cuerpo = {
    kind: 'blogger#post',
    title: entrada.titulo,
    content: armarCuerpo(entrada),
    labels: etiquetasDe(entrada),
  };

  try {
    // El registro manda; si no la tiene, se busca por titulo antes de crear.
    let idExistente = registro[entrada.id];

    if (!idExistente && existentes.has(entrada.titulo)) {
      idExistente = existentes.get(entrada.titulo);
      registro[entrada.id] = idExistente;
      adoptadas++;
      console.log(`  ya estaba en Blogger, se reutiliza: ${entrada.titulo}`);
    }

    if (idExistente) {
      // Ya estaba: se actualiza el contenido...
      await llamarBlogger(token, `/posts/${idExistente}`, {
        method: 'PATCH',
        body: JSON.stringify(cuerpo),
      });

      // ...y tambien la fecha. PATCH no toca la programacion, asi que sin
      // esto una entrada que cambia de dia se queda con el dia viejo en
      // Blogger mientras en la web sale en el nuevo.
      await llamarBlogger(
        token,
        `/posts/${idExistente}/publish?publishDate=${encodeURIComponent(entrada.fecha)}`,
        { method: 'POST' }
      );

      const cuando = new Date(entrada.fecha) > new Date() ? 'reprogramada' : 'actualizada  ';
      console.log(`  ${cuando} ${entrada.titulo}`);
    } else {
      // Nueva: se crea como borrador y se publica con la fecha que toque.
      const creada = await llamarBlogger(token, '/posts/?isDraft=true', {
        method: 'POST',
        body: JSON.stringify(cuerpo),
      });

      const publicada = await llamarBlogger(
        token,
        `/posts/${creada.id}/publish?publishDate=${encodeURIComponent(entrada.fecha)}`,
        { method: 'POST' }
      );

      registro[entrada.id] = creada.id;

      const programada = new Date(entrada.fecha) > new Date();
      console.log(
        `  ${programada ? 'programada  ' : 'publicada   '}${entrada.titulo}` +
          `\n               ${publicada.url ?? '(sin url todavia)'}`
      );
    }

    subidas++;
  } catch (error) {
    fallos++;
    console.error(`  FALLO en "${entrada.titulo}": ${error.message}`);
  }
}

await writeFile(REGISTRO, `${JSON.stringify(registro, null, 2)}\n`, 'utf8');

console.log(`\n  ${subidas} enviadas, ${fallos} con fallo.`);
if (adoptadas > 0) {
  console.log(`  ${adoptadas} ya existian en Blogger y se reutilizaron (no se duplicaron).`);
}
console.log(`  Registro guardado en ${path.relative(RAIZ, REGISTRO)} (haz commit).\n`);

if (fallos > 0) process.exit(1);
