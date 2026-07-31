import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import { GITHUB_USER, GITHUB_REPO } from './src/consts.ts';

// GitHub Pages sirve un repo de proyecto bajo /nombre-del-repo/.
// Si tu repo se llama TU-USUARIO.github.io, GITHUB_REPO va vacio y base = '/'.
const base = GITHUB_REPO ? `/${GITHUB_REPO}` : '/';

export default defineConfig({
  site: `https://${GITHUB_USER}.github.io${GITHUB_REPO ? `/${GITHUB_REPO}` : ''}`,
  base,
  trailingSlash: 'ignore',

  /**
   * Direcciones antiguas que siguen funcionando.
   *
   * Cuando se renombra el archivo de una entrada, su direccion cambia y
   * cualquier enlace que alguien hubiera guardado se rompe. Esto genera una
   * pagina que redirige sola a la nueva, asi que los enlaces viejos aguantan.
   * Al renombrar una entrada, anade aqui su direccion anterior.
   *
   * OJO: el DESTINO tiene que llevar el prefijo del repo a mano. Astro si se
   * lo pone a la clave (donde se crea el archivo) pero NO al destino, y sin el
   * la redireccion lleva a un 404.
   */
  redirects: {
    '/entradas/2026-07-29-vol-1-plantilla': `${base === '/' ? '' : base}/entradas/2026-07-29-volumen-1-donde-empieza-todo`,
  },

  // mdx va antes de sitemap para que las entradas .mdx entren en el sitemap.
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: { theme: 'night-owl', wrap: true },
  },
});
