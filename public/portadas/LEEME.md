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

Descarga las que falten desde Open Library. Ahora mismo consigue **12 de 23**:
los volúmenes 1, 2, 3, 8, 9, 10, 11, 12, 13, 14, 15 y 17.

Los otros once (4, 5, 6, 7, 16, 18, 19, 20, 21, 22, 23) no están catalogados
con portada todavía. Open Library va añadiendo con el tiempo, así que vuelve a
correr el comando dentro de unos meses y recogerá las nuevas — no vuelve a
descargar las que ya tienes.

> **AniList no sirve para esto.** Solo guarda **una** imagen para toda la obra
> (la del volumen 1), no una por volumen. Por eso todas las entradas salían con
> la misma portada.

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
