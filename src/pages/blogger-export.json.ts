/**
 * Exporta las entradas ya renderizadas a HTML, para que el script de Blogger
 * las suba tal cual (con los vídeos, galerías y fichas resueltos).
 *
 * Incluye TAMBIEN las entradas en cola con fecha futura, porque Blogger las
 * programa por su cuenta con publishDate. Por eso solo se genera cuando la
 * variable EXPORTAR_BLOGGER esta puesta: si no, devuelve una lista vacia y no
 * se filtra al sitio publico lo que aun no toca publicar.
 */
import type { APIContext } from 'astro';
import { getCollection, render } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { loadRenderers } from 'astro:container';
import { getContainerRenderer as mdxRenderer } from '@astrojs/mdx';

export async function GET(_context: APIContext) {
  const activado = process.env.EXPORTAR_BLOGGER === '1';

  if (!activado) {
    return new Response(JSON.stringify({ entradas: [], nota: 'exportacion desactivada' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Todas las que no son borrador, publicadas y en cola.
  const entradas = await getCollection('entradas', ({ data }) => !data.borrador);
  entradas.sort((a, b) => a.data.fecha.getTime() - b.data.fecha.getTime());

  // Sin el renderizador de MDX registrado, las entradas .mdx fallan con
  // NoMatchingRenderer. Las .md no lo necesitan, pero registrarlo no molesta.
  const renderers = await loadRenderers([mdxRenderer()]);
  const contenedor = await AstroContainer.create({ renderers });
  const salida = [];

  for (const entrada of entradas) {
    const { Content } = await render(entrada);
    const html = await contenedor.renderToString(Content);

    salida.push({
      id: entrada.id,
      titulo: entrada.data.titulo,
      resumen: entrada.data.resumen,
      fecha: entrada.data.fecha.toISOString(),
      tipo: entrada.data.tipo,
      volumen: entrada.data.volumen ?? null,
      arco: entrada.data.arco ?? null,
      spoilers: entrada.data.spoilers,
      etiquetas: entrada.data.etiquetas,
      puntuacion: entrada.data.puntuacion ?? null,
      portada: entrada.data.portada ?? null,
      html,
    });
  }

  return new Response(JSON.stringify({ entradas: salida }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}
