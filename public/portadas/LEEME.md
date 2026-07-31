# Portadas

Las imágenes que pongas aquí se sirven directamente desde tu sitio, así que no
dependen de que otra web siga funcionando. Es la opción robusta.

## Cómo añadir una

1. Guarda la imagen aquí con el nombre `vol-NN.jpg` (dos dígitos: `vol-03.jpg`).
2. En la entrada, úsala así:

```mdx
portada: "/blog-anime/portadas/vol-03.jpg"
```

```mdx
<Figura src="/blog-anime/portadas/vol-03.jpg" alt="Portada del volumen 3" pie="..." />
```

> El prefijo `/blog-anime/` es obligatorio: GitHub Pages sirve el sitio bajo esa
> carpeta. Si algún día cambias el nombre del repo, cambia también estas rutas.

## Bajarlas automáticamente

```bash
npm run portadas
```

Consigue **22 de 23**. Prueba dos fuentes en orden:

1. **Open Library** (Internet Archive) — mejor calidad, 333x500 en JPEG.
2. **Yen Press**, la propia editorial — 285x422, a veces en WebP. Cubre justo
   los volúmenes recientes que Open Library todavía no ha catalogado.

Falta solo el **volumen 23**, y por un motivo de fondo: Yen Press va por el 22
en inglés, así que no existe ficha de la que sacar la portada. Cuando lo
publiquen, vuelve a correr el comando y lo recogerá — no repite descargas.

> **AniList no sirve para esto.** Solo guarda **una** imagen para toda la obra
> (la del volumen 1), no una por volumen. Por eso todas las entradas salían con
> la misma portada.

Las imágenes pueden ser `.jpg` o `.webp` según la fuente. Da igual: el
navegador entiende las dos, y `npm run revisar` acepta ambas.

## De dónde sacarlas

**Open Library** tiene portadas por ISBN y permite enlazarlas o descargarlas:

```
https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg
```

Los ISBN de la edición inglesa (Yen Press) están en las fichas de
[yenpress.com](https://yenpress.com/series/that-time-i-got-reincarnated-as-a-slime-light-novel).
El del volumen 2 es `9781975301118`.

Ojo: si Open Library no tiene esa portada, devuelve un archivo vacío de unos
40 bytes en vez de dar error. Comprueba que la imagen pese de verdad.

## Sobre los derechos

Son portadas de libros usadas para comentar la obra, en un blog de reseñas sin
ánimo de lucro. Es el uso habitual en crítica literaria. Los créditos
(Fuse, Mitz Vah, Yen Press, Micro Magazine) están en la página *Sobre mí*.
