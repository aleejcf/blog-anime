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
  // mdx va antes de sitemap para que las entradas .mdx entren en el sitemap.
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: { theme: 'night-owl', wrap: true },
  },
});
