/**
 * GitHub Pages sirve los repos de proyecto bajo /nombre-del-repo/, asi que
 * todos los enlaces internos tienen que llevar ese prefijo. Esto lo resuelve
 * en un solo sitio para que nunca se rompan los enlaces al desplegar.
 */
const BASE = import.meta.env.BASE_URL;

export function ruta(camino = ''): string {
  const base = BASE.endsWith('/') ? BASE : `${BASE}/`;
  return base + camino.replace(/^\//, '');
}
