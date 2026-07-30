#!/usr/bin/env node
/**
 * Ayudante de un solo uso para conseguir tu refresh token de Blogger.
 *
 *   node scripts/obtener-token-blogger.mjs
 *
 * ANTES de correrlo necesitas credenciales OAuth de Google:
 *
 *   1. Entra a https://console.cloud.google.com/
 *   2. Crea un proyecto (o usa uno que tengas).
 *   3. "APIs y servicios" > "Biblioteca" > busca "Blogger API v3" > Habilitar.
 *   4. "APIs y servicios" > "Pantalla de consentimiento OAuth":
 *        - Tipo: Externo
 *        - Rellena nombre de la app y tu correo
 *        - En "Usuarios de prueba" agregate a ti mismo
 *   5. "Credenciales" > "Crear credenciales" > "ID de cliente de OAuth":
 *        - Tipo de aplicacion: "Aplicacion de escritorio"
 *   6. Copia el Client ID y el Client Secret.
 *
 * Luego corre este script con esos dos valores:
 *
 *   BLOGGER_CLIENT_ID=xxx BLOGGER_CLIENT_SECRET=yyy node scripts/obtener-token-blogger.mjs
 *
 * En Windows PowerShell:
 *
 *   $env:BLOGGER_CLIENT_ID="xxx"; $env:BLOGGER_CLIENT_SECRET="yyy"
 *   node scripts/obtener-token-blogger.mjs
 *
 * El script abre un servidor local, TU das el consentimiento en el navegador
 * con tu cuenta de Google, y al final imprime el refresh token. Nadie mas ve
 * tu contrasena: el intercambio ocurre entre tu navegador y Google.
 */

import http from 'node:http';

const CLIENT_ID = process.env.BLOGGER_CLIENT_ID;
const CLIENT_SECRET = process.env.BLOGGER_CLIENT_SECRET;
const PUERTO = 8976;
const REDIRECT = `http://localhost:${PUERTO}`;
const SCOPE = 'https://www.googleapis.com/auth/blogger';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n  Falta BLOGGER_CLIENT_ID o BLOGGER_CLIENT_SECRET.');
  console.error('  Lee las instrucciones al principio de este archivo.\n');
  process.exit(1);
}

const urlConsentimiento =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline', // <- imprescindible para recibir refresh_token
    prompt: 'consent',
  });

console.log('\n  1. Abre esta direccion en tu navegador y da permiso:\n');
console.log(`     ${urlConsentimiento}\n`);
console.log('  2. Esperando que vuelvas...\n');

/** Espera el redirect de Google y devuelve el "code". */
function esperarCodigo() {
  return new Promise((resolver, rechazar) => {
    const servidor = http.createServer((peticion, respuesta) => {
      const url = new URL(peticion.url, REDIRECT);
      const codigo = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      respuesta.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      respuesta.end(
        codigo
          ? '<h1>Listo</h1><p>Ya puedes cerrar esta pestana y volver a la terminal.</p>'
          : `<h1>Algo fallo</h1><p>${error ?? 'no llego ningun codigo'}</p>`
      );

      servidor.close();
      if (codigo) resolver(codigo);
      else rechazar(new Error(error ?? 'no llego ningun codigo'));
    });

    servidor.on('error', rechazar);
    servidor.listen(PUERTO);

    // Si en 5 minutos no pasa nada, nos rendimos.
    setTimeout(() => {
      servidor.close();
      rechazar(new Error('se agoto el tiempo de espera (5 minutos)'));
    }, 5 * 60 * 1000).unref();
  });
}

let codigo;
try {
  codigo = await esperarCodigo();
} catch (error) {
  console.error(`\n  No se pudo completar el permiso: ${error.message}\n`);
  process.exit(1);
}

const respuesta = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    code: codigo,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT,
    grant_type: 'authorization_code',
  }),
});

const datos = await respuesta.json();

if (!respuesta.ok || !datos.refresh_token) {
  console.error('\n  Google no devolvio un refresh token:');
  console.error(`  ${JSON.stringify(datos)}\n`);
  console.error('  Suele ser porque falta access_type=offline o porque ya diste');
  console.error('  permiso antes. Revoca el acceso en');
  console.error('  https://myaccount.google.com/permissions y vuelve a intentar.\n');
  process.exit(1);
}

// Averiguamos de paso el ID de su blog, para no tener que buscarlo a mano.
let blogs = [];
try {
  const listado = await fetch(
    'https://www.googleapis.com/blogger/v3/users/self/blogs?fields=items(id,name,url)',
    { headers: { Authorization: `Bearer ${datos.access_token}` } }
  );
  const cuerpo = await listado.json();
  blogs = cuerpo.items ?? [];
} catch {
  // Da igual, es un extra.
}

console.log('\n  ================================================');
console.log('  LISTO. Guarda estos valores como Secrets del repo');
console.log('  (Settings > Secrets and variables > Actions)');
console.log('  ================================================\n');
console.log(`  BLOGGER_CLIENT_ID       ${CLIENT_ID}`);
console.log(`  BLOGGER_CLIENT_SECRET   ${CLIENT_SECRET}`);
console.log(`  BLOGGER_REFRESH_TOKEN   ${datos.refresh_token}`);

if (blogs.length > 0) {
  console.log('\n  Tus blogs de Blogger:\n');
  for (const blog of blogs) {
    console.log(`  BLOGGER_BLOG_ID         ${blog.id}   (${blog.name} - ${blog.url})`);
  }
} else {
  console.log('\n  No encontre blogs en tu cuenta. Crea uno en https://blogger.com');
  console.log('  y saca el blogId de la URL del panel (blogID=XXXXXXXX).');
}

console.log('\n  El refresh token no caduca salvo que revoques el acceso.');
console.log('  No lo subas al repo: va en Secrets.\n');
