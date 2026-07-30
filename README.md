# Diario de Tempest

Blog dedicado por completo a **Tensei Shitara Slime Datta Ken**: reseñas de los
23 volúmenes de la novela ligera, comparativas con el anime y el manga, y
análisis de personajes.

Hecho con [Astro](https://astro.build), alojado gratis en GitHub Pages, con
**publicación automática** y **espejo en Blogger**.

---

## Cómo funciona la automatización

Tres mecanismos, todos en GitHub Actions (gratis, sin servidor):

### 1. La cola de entradas

Cada entrada lleva una `fecha`. Al construir el sitio, **las de fecha futura se
ignoran**. Un robot reconstruye el sitio todos los días a las 13:00 UTC, así que
cada entrada aparece sola el día que le toca.

> Escribes 7 reseñas un domingo → el blog publica una por día toda la semana.

### 2. El espejo en Blogger

Cada vez que subes entradas, otro robot las manda a Blogger. Ahí la
programación es aún mejor: Blogger acepta un `publishDate` futuro, así que las
entradas en cola se le entregan **ya programadas** y las publica él por su
cuenta, incluso si GitHub Actions falla ese día.

Las entradas viajan con los vídeos, galerías y fichas ya renderizados, y con sus
estilos incrustados.

### 3. El boletín mensual de datos

El día 1 de cada mes, un script consulta la API de
[AniList](https://anilist.co), parte de la ficha de la novela y **sigue sus
relaciones**, así que descubre solo las adaptaciones y spin-offs nuevos. Genera
una entrada con el estado de las 16 obras de la franquicia: formato, estado,
extensión y nota de la comunidad.

Publica datos verificables y enlaza a la fuente. Las opiniones las escribes tú
—que para eso está el blog.

---

## Puesta en marcha

### Parte A — El sitio (10 minutos)

**1. Pon tus datos** en [`src/consts.ts`](src/consts.ts):

```ts
export const GITHUB_USER = 'TU-USUARIO';   // tu usuario de GitHub, sin la @
export const GITHUB_REPO = 'blog-anime';   // el nombre del repo
export const ZONA = validarZona('America/Tegucigalpa'); // tu zona horaria
```

> La zona es un identificador **IANA**, que no es el nombre del país: la de
> Honduras es `America/Tegucigalpa`, no `America/Honduras`. Otras válidas:
> `America/Guatemala`, `America/Mexico_City`, `America/Bogota`, `America/Lima`,
> `America/Argentina/Buenos_Aires`, `America/Santiago`, `Europe/Madrid`.
> Si te equivocas, el build falla con un mensaje que te lo dice.

> Si prefieres que la dirección sea `tu-usuario.github.io` en vez de
> `tu-usuario.github.io/blog-anime`, crea el repo con el nombre
> `tu-usuario.github.io` y deja `GITHUB_REPO = ''`.

**2. Crea el repositorio** en [github.com/new](https://github.com/new): nombre
`blog-anime`, **público** (Pages gratis lo requiere), **sin** README ni
.gitignore.

**3. Súbelo**, cambiando `TU-USUARIO`:

```bash
git init -b main && git add . && git commit -m "Primera version del blog" && git remote add origin https://github.com/TU-USUARIO/blog-anime.git && git push -u origin main
```

**4. Activa Pages**: repo → **Settings** → **Pages** → *Source* →
**GitHub Actions**.

**5. Da permiso de escritura**: **Settings** → **Actions** → **General** →
*Workflow permissions* → **Read and write permissions** → Save.

Listo. En un par de minutos: `https://TU-USUARIO.github.io/blog-anime/`

### Parte B — El espejo en Blogger (15 minutos, opcional)

**1. Crea el blog** en [blogger.com](https://blogger.com) si no lo tienes.

**2. Consigue credenciales OAuth de Google:**

- [console.cloud.google.com](https://console.cloud.google.com/) → crea un proyecto
- *APIs y servicios* → *Biblioteca* → busca **Blogger API v3** → Habilitar
- *Pantalla de consentimiento OAuth* → tipo **Externo**, rellena nombre y correo,
  y **agrégate como usuario de prueba**
- *Credenciales* → *Crear credenciales* → *ID de cliente de OAuth* → tipo
  **Aplicación de escritorio**
- Copia el **Client ID** y el **Client Secret**

**3. Saca tu refresh token.** En PowerShell:

```bash
$env:BLOGGER_CLIENT_ID="tu-client-id"; $env:BLOGGER_CLIENT_SECRET="tu-secret"; npm run token-blogger
```

El script abre un servidor local, te da una URL, **tú** das el permiso en el
navegador con tu cuenta de Google, y al volver imprime el refresh token y el ID
de tu blog. Tu contraseña nunca pasa por aquí: el intercambio es entre tu
navegador y Google.

**4. Guarda los cuatro Secrets** en el repo → **Settings** → *Secrets and
variables* → **Actions** → *New repository secret*:

| Secret | De dónde sale |
| --- | --- |
| `BLOGGER_BLOG_ID` | lo imprime el script del paso 3 |
| `BLOGGER_CLIENT_ID` | Google Cloud Console |
| `BLOGGER_CLIENT_SECRET` | Google Cloud Console |
| `BLOGGER_REFRESH_TOKEN` | lo imprime el script del paso 3 |

Desde ahí, cada vez que subas entradas se mandan solas a Blogger.

---

## Uso normal

### Crear una entrada

```bash
npm run nueva -- "Volumen 2: los enanos" --tipo novela --volumen 2 --nota 8
```

| Opción | Valores |
| --- | --- |
| `--tipo` | `novela`, `anime`, `manga`, `personaje`, `analisis` |
| `--volumen` | 1 a 23 |
| `--arco` | texto libre, entre comillas |
| `--nota` | 0 a 10 |
| `--spoilers` | `ninguno`, `leves`, `totales` |

El script **asigna la fecha sola**: el día siguiente a la última de la cola.
Ejecútalo cinco veces y tienes cinco días programados. Te crea un `.mdx` con la
estructura ya montada según el tipo, y los componentes importados.

### Ver la cola

```bash
npm run cola
```

### Publicar

```bash
git add . && git commit -m "Nuevas resenas" && git push
```

### Ver el blog en tu máquina

```bash
npm run dev
```

<http://localhost:4321>. Las entradas futuras también se ocultan en `dev`, así
que ves exactamente lo que ve la gente hoy.

### Comandos sueltos

```bash
npm run auto                    # genera el boletin de datos a mano
npm run exportar                # build + JSON para Blogger
npm run blogger -- --simular    # dice que subiria a Blogger, sin subir nada
npm run blogger                 # sube a Blogger
npm run blogger -- --actualizar # reenvia tambien las ya subidas
```

---

## Componentes para las entradas

En los `.mdx`, tras el frontmatter:

```mdx
import { Video, Figura, Galeria, FichaVolumen, Personaje, Cita, Spoiler, Destacado } from '../../components/mdx';
```

| Componente | Para qué |
| --- | --- |
| `<Video url="..." pie="..." />` | YouTube, responsivo, sin cookies de seguimiento |
| `<Figura src alt pie />` | imagen con pie de foto |
| `<Galeria imagenes={[...]} pie />` | rejilla de imágenes que se adapta sola |
| `<FichaVolumen numero arco nota portada publicado />` | ficha del volumen |
| `<Personaje nombre rol foto>` | ficha corta de personaje |
| `<Cita autor>` | cita destacada y centrada |
| `<Spoiler aviso>` | se pliega hasta que el lector hace clic (sin JavaScript) |
| `<Destacado titulo>` | caja para apartar un dato o una nota |

[`2026-07-29-vol-1-plantilla.mdx`](src/content/entradas/2026-07-29-vol-1-plantilla.mdx)
los usa todos: cópiala como referencia.

> En MDX los comentarios se escriben `{/* así */}`. Los de HTML (`<!-- -->`) no
> funcionan.

---

## Campos de una entrada

```yaml
---
titulo: "Volumen 2: los enanos y el laberinto"
resumen: "Una frase que dé ganas de leer el resto."
fecha: 2026-08-03           # si es futura, se publica ese dia
tipo: novela                # novela | anime | manga | personaje | analisis | automatico
volumen: 2                  # opcional, 1-23; marca el volumen en /volumenes
arco: "El reino enano"      # opcional
spoilers: leves             # ninguno | leves | totales -> pinta un aviso arriba
etiquetas: ["rimuru", "gazel"]
puntuacion: 8               # opcional, 0-10
portada: "https://..."      # opcional
borrador: false             # true = no se publica nunca, ni al llegar la fecha
---
```

---

## Estructura

```
src/
  consts.ts                 Configuración y datos de la obra
  content.config.ts         Esquema de las entradas
  content/entradas/         TUS ENTRADAS (.md o .mdx)
  lib/entradas.ts           Filtro de fechas: el corazón de la cola
  components/               Video, Figura, Galeria, FichaVolumen...
    mdx.ts                  Barrel: importa todo de un tirón
  pages/
    index.astro             Portada con hero y contadores
    volumenes.astro         Los 23 volúmenes y el progreso
    archivo.astro           Todo por año
    sobre-mi.astro          <- ESCRIBE ESTA PÁGINA
    entradas/[...id].astro  Página de cada entrada
    rss.xml.ts              Feed RSS
    blogger-export.json.ts  HTML renderizado para Blogger
  styles/global.css         Todo el diseño (claro y oscuro automáticos)

scripts/
  nueva-resena.mjs          Crea una entrada y la mete en la cola
  ver-cola.mjs              Qué está publicado y qué espera
  generar-post-automatico.mjs   Boletín de la franquicia desde AniList
  obtener-token-blogger.mjs Ayudante OAuth de un solo uso
  publicar-en-blogger.mjs   Sube y programa en Blogger
  exportar.mjs              build con la exportación activada

.github/workflows/
  deploy.yml                Construye y publica (al subir + cada día 13:00 UTC)
  auto-post.yml             Boletín de datos (día 1 de cada mes)
  blogger.yml               Espejo en Blogger (al subir entradas)
```

---

## Ajustes útiles

**Hora de publicación diaria** — en `.github/workflows/deploy.yml`, la línea
`cron: '0 13 * * *'`. Está en UTC: `0 13` son las 07:00 en CDMX, 08:00 en Bogotá
y Lima, 10:00 en Buenos Aires, 15:00 en Madrid.

**Publicar cada dos días** — no toques el cron; pon las fechas de tus entradas
cada dos días. La fecha es la que manda.

**Quitar el boletín automático** — borra `.github/workflows/auto-post.yml`.

**Quitar el espejo de Blogger** — borra `.github/workflows/blogger.yml`.

**Que GitHub no apague el cron** — GitHub desactiva los `schedule` de repos sin
actividad durante 60 días. Con subir una entrada de vez en cuando, resuelto.

**Astro 7 ya existe.** Este proyecto va con Astro 5.18, que funciona y está
soportado. Si algún día quieres actualizar, hazlo con calma y corre
`npm run build` después: hay dos versiones mayores de diferencia.

---

## Antes de darlo por terminado

- [ ] Poner tu usuario, repo y zona horaria en `src/consts.ts`
- [ ] Escribir la página **Sobre mí** (`src/pages/sobre-mi.astro`)
- [ ] Reescribir `2026-07-29-vol-1-plantilla.mdx` con tu reseña real del volumen 1
- [ ] Rellenar los dos borradores (volumen 2 y Benimaru) y poner `borrador: false`
- [ ] Configurar Blogger si lo quieres (Parte B)
- [ ] Dejar unas cuantas entradas en cola

---

Las imágenes y vídeos que aparezcan en el blog pertenecen a sus autores (Fuse,
Mitz Vah, Eight Bit, Kodansha, Micro Magazine) y se usan solo para comentar la
obra.
