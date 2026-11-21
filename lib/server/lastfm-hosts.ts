// Sin "server-only": lo importa también next.config.ts para construir la CSP.
// Mantener en sincronía: si Last.fm cambia de CDN, las portadas se descartarán en el servidor
// (lib/server/lastfm.ts) y el widget mostrará el icono genérico hasta añadir el host nuevo aquí.

/** Hosts desde los que se aceptan portadas de Last.fm (`img-src` de la CSP). */
export const LASTFM_IMAGE_HOSTS = ["lastfm.freetls.fastly.net"] as const;

/** Hosts aceptados para el enlace a la pista (solo es un `href`, no afecta a la CSP). */
export const LASTFM_LINK_HOSTS = ["www.last.fm", "last.fm"] as const;
