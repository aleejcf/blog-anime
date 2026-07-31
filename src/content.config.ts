import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const entradas = defineCollection({
  // .mdx permite usar componentes (vídeo, galerías, fichas) dentro del texto.
  loader: glob({ base: './src/content/entradas', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    titulo: z.string(),
    resumen: z.string(),

    // La fecha manda. Si es en el futuro, la entrada NO se publica todavía:
    // el sitio se reconstruye cada día y aparece sola cuando le toca.
    fecha: z.coerce.date(),

    tipo: z.enum([
      'novela', // reseña de un volumen de la novela ligera
      'anime', // temporadas, películas, OVAs
      'manga', // la adaptación a manga y spin-offs
      'personaje', // fichas y análisis de personajes
      'analisis', // ensayos, comparativas, temas
      'automatico', // generado por el robot desde AniList
    ]),

    // Qué volumen de la novela cubre la entrada (1-23). Sirve para cruzarla
    // con la página de Volúmenes.
    volumen: z.number().int().min(1).max(23).optional(),

    // Nombre del arco, si aplica. Ej: "El Lord Orco", "Walpurgis".
    arco: z.string().optional(),

    // Avisa al lector antes de que se le arruine algo.
    spoilers: z.enum(['ninguno', 'leves', 'totales']).default('ninguno'),

    etiquetas: z.array(z.string()).default([]),
    puntuacion: z.number().min(0).max(10).optional(),

    // Admite una direccion completa (https://...) o una ruta de tu propio
    // sitio (/blog-anime/portadas/vol-02.jpg). Lo segundo es mas robusto:
    // no depende de que otra web siga funcionando. Ver public/portadas/LEEME.md
    portada: z
      .string()
      .refine((v) => /^https?:\/\//.test(v) || v.startsWith('/'), {
        message:
          'portada tiene que ser una direccion https:// completa o una ruta que empiece por / (ej: /blog-anime/portadas/vol-02.jpg)',
      })
      .optional(),

    // true = nunca se publica, ni cuando llega la fecha. Para trabajar tranquilo.
    borrador: z.boolean().default(false),
  }),
});

export const collections = { entradas };
