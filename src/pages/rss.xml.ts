import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';
import { getEntradasPublicadas } from '../lib/entradas';

export async function GET(context: APIContext) {
  const entradas = await getEntradasPublicadas();

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site!,
    items: entradas.map((entrada) => ({
      title: entrada.data.titulo,
      description: entrada.data.resumen,
      pubDate: entrada.data.fecha,
      categories: [entrada.data.tipo, ...entrada.data.etiquetas],
      link: `/entradas/${entrada.id}/`,
    })),
    customData: '<language>es</language>',
  });
}
