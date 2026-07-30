// ============================================================
//  CONFIGURACION DEL BLOG  -  edita esto y nada mas
// ============================================================

// Tu usuario de GitHub (sin la @)
export const GITHUB_USER = 'aleejcf';

// El nombre del repositorio donde vive el blog.
// Si tu repo se llama "TU-USUARIO.github.io", pon aqui una cadena vacia: ''
export const GITHUB_REPO = 'blog-anime';

export const SITE_TITLE = 'Diario de Tempest';
export const SITE_SUBTITLE = 'Releyendo Tensura, volumen a volumen';
export const SITE_DESCRIPTION =
  'Un blog dedicado por completo a Tensei Shitara Slime Datta Ken: resenas de los 23 volumenes de la novela ligera, comparativas con el anime y el manga, y analisis de personajes.';
export const AUTOR = 'Alejandro Calderon';
export const IDIOMA = 'es';

// ---- Datos de la obra (reales, via AniList) ----
export const OBRA = {
  titulo: 'Tensei Shitara Slime Datta Ken',
  tituloEs: 'De ser reencarnado como slime',
  autor: 'Fuse',
  ilustrador: 'Mitz Vah',
  volumenes: 23,
  capitulos: 168,
  anios: '2014 - 2025',
  anilistNovela: 86355,
  anilistUrl: 'https://anilist.co/manga/86355',
};

/**
 * Comprueba que la zona horaria existe de verdad.
 *
 * Los identificadores son de la base IANA y NO son el nombre del pais: la de
 * Honduras es 'America/Tegucigalpa', no 'America/Honduras'. Si te equivocas,
 * el build falla aqui con un mensaje claro en vez de reventar mas adelante.
 */
function validarZona(zona: string): string {
  try {
    new Intl.DateTimeFormat('es-ES', { timeZone: zona });
    return zona;
  } catch {
    throw new Error(
      `ZONA no valida en src/consts.ts: "${zona}". ` +
        'Tiene que ser un identificador IANA, por ejemplo: America/Tegucigalpa, ' +
        'America/Guatemala, America/Mexico_City, America/Bogota, America/Lima, ' +
        'America/Argentina/Buenos_Aires, America/Santiago, Europe/Madrid.'
    );
  }
}

// Zona horaria para las horas que se muestran en el blog.
export const ZONA = validarZona('America/Tegucigalpa');
