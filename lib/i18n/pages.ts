/**
 * Inventario de páginas disponibles (docs/arquitectura-rutas.md §4.2 y §8.6).
 *
 * Una sola enumeración de lo que existe en cada idioma, con dos vistas:
 * - `languageIndex(locale)`: equivalencias de idioma para el selector y para `localizeInternalHref`.
 *   Incluye las páginas `noindex` (EN en revisión): la navegación EN se puede revisar antes de P9.
 * - `publicPages()`: sitemap y hreflang. Solo páginas indexables y solo idiomas publicados.
 *
 * Solo servidor: importa el contenido (proyectos y posts) para enumerar los parámetros.
 */
import { posts } from "@/content/posts";
import { caseStudies, osProjectSlugs } from "@/content/projects";
import { hrefFor, hreflangFor, isRouteIndexable, publishedLocales, seoEligibility, type RouteKey, type RouteRef } from "@/content/routes";
import { locales, type Locale } from "@/content/types";

export type AvailablePage = {
  ref: RouteRef;
  /** Ruta de cada idioma en el que la página existe (publicado o no). */
  paths: Partial<Record<Locale, string>>;
  indexable: boolean;
};

/**
 * Rutas sin parámetros que ya existen (Fase 3, y `os` desde la 4). Las de `since > 4` se añaden en su fase.
 * El orden (estáticas, posts, proyectos) es el del sitemap.
 */
const staticKeys = ["home", "projects", "services", "about", "now", "contact", "blog", "os"] as const satisfies readonly RouteKey[];

function refs(): RouteRef[] {
  return [
    ...staticKeys.map((route) => ({ route }) as RouteRef),
    ...posts.map(({ slug }) => ({ route: "post", params: { slug } }) as RouteRef),
    ...caseStudies.map(({ slug }) => ({ route: "project", params: { slug } }) as RouteRef),
    // SO (Fase 4): solo el catálogo autorizado (§1.4). No indexables: `publicPages()` las excluye.
    ...osProjectSlugs.map((slug) => ({ route: "osProject", params: { slug } }) as RouteRef),
  ];
}

function pathsOf(ref: RouteRef): Partial<Record<Locale, string>> {
  const paths: Partial<Record<Locale, string>> = {};
  for (const locale of locales) {
    try {
      paths[locale] = hrefFor(ref, locale);
    } catch {
      // Sin parámetro traducido para ese idioma: la página no existe en él.
    }
  }
  return paths;
}

/** Todas las páginas que existen, en cualquier idioma, publicadas o no. */
export function availablePages(): AvailablePage[] {
  return refs().map((ref) => ({
    ref,
    paths: pathsOf(ref),
    indexable: isRouteIndexable(ref.route),
  }));
}

/**
 * Ruta de la página actual (`locale`) → ruta equivalente en el otro idioma, para cada página que
 * existe en ambos. Lo calcula el layout `(site)` y lo recibe el selector de idioma.
 */
export function languageIndex(locale: Locale): Record<string, string> {
  const other: Locale = locale === "es" ? "en" : "es";
  const index: Record<string, string> = {};
  for (const { paths } of availablePages()) {
    const from = paths[locale];
    const to = paths[other];
    if (from && to) index[from] = to;
  }
  return index;
}

export type PublicPage = {
  ref: RouteRef;
  locale: Locale;
  path: string;
  /** hreflang → ruta (solo idiomas publicados; `x-default` = ES). Vacío si solo hay uno. */
  languages: Record<string, string>;
};

/** Una entrada por página indexable e idioma publicado (sitemap, hreflang, `llms.txt`). */
export function publicPages(): PublicPage[] {
  return availablePages()
    .filter((page) => page.indexable)
    .flatMap(({ ref, paths }) => {
      const languages = hreflangFor(ref);
      const multiple = Object.keys(languages).filter((key) => key !== "x-default").length > 1;
      // Mismo criterio que buildMetadata (seoEligibility): solo lo que emitiría alternas.
      return publishedLocales
        .filter((locale) => paths[locale] && seoEligibility({ route: ref.route, locale }).alternates)
        .map((locale) => ({ ref, locale, path: paths[locale]!, languages: multiple ? languages : {} }));
    });
}
