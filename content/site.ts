import type { L } from "./types";

/**
 * Datos del sitio que no son del perfil: dominio canónico, nombre de la marca y rutas del CV.
 * Módulo pequeño y sin dependencias para poder usarse también en componentes cliente.
 */

/** Dominio canónico sin barra final. `NEXT_PUBLIC_*` se fija en el build. */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://edav.com.co").replace(/\/+$/, "");

/** Nombre de la marca/aplicación (OpenGraph `siteName`, `applicationName`). */
export const siteName = "EDAV OS";

/** Rutas reales que sirve `app/cv/[file]/route.ts` (sin barra final: son archivos). */
export const cvFiles = {
  es: "emmanuel-davila-cv-es.pdf",
  en: "emmanuel-davila-cv-en.pdf",
} as const satisfies L;

export const cvHref: L = { es: `/cv/${cvFiles.es}`, en: `/cv/${cvFiles.en}` };
