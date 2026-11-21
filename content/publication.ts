import type { Locale } from "./types";

/**
 * Idiomas visibles para buscadores (hreflang, sitemap, sin noindex). P9 (docs/arquitectura-rutas.md
 * §5 y §11.6): el EN se publicó tras la revisión del usuario.
 *
 * Módulo propio (lo reexporta `content/routes.ts`) para que los tests puedan simular otros estados
 * de publicación con `vi.doMock("@/content/publication")`.
 */
export const publishedLocales: readonly Locale[] = ["es", "en"];
