import type { Locale } from "./types";

/**
 * Idiomas visibles para buscadores (hreflang, sitemap, sin noindex). Pasa a `["es", "en"]` tras la
 * revisión del EN por el usuario (P9 de docs/arquitectura-rutas.md §5).
 *
 * Módulo propio (lo reexporta `content/routes.ts`) para que los tests puedan simular la
 * publicación con `vi.doMock("@/content/publication")` y comprobar hoy el estado de P9.
 */
export const publishedLocales: readonly Locale[] = ["es"];
