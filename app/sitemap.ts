import type { MetadataRoute } from "next";
import { posts } from "@/content/posts";
import type { RouteRef } from "@/content/routes";
import { publicPages } from "@/lib/i18n/pages";
import { absoluteUrl } from "@/lib/metadata";

export const dynamic = "force-static";

/** Fecha real de actualización (SEO-05): solo los posts tienen `updated`; el blog toma la más reciente. */
function lastModified(ref: RouteRef): string | undefined {
  if (ref.route === "blog") return posts.map((post) => post.updated).sort().at(-1);
  if (ref.route === "post") {
    const slug = ref.params.slug;
    return posts.find((post) => typeof slug === "string" ? post.slug.es === slug : post.slug.es === slug.es)?.updated;
  }
  return undefined;
}

/**
 * Sitemap desde el inventario de páginas (docs/arquitectura-rutas.md §6, P8): una entrada por página
 * indexable e idioma publicado. `alternates.languages` (hreflang recíproco + `x-default` = ES) solo
 * cuando la página está publicada en más de un idioma: con solo ES, el sitemap no lleva alternates.
 * Fuera: `/os`, `/classic`, 404, `/api` y CV. URLs con barra final, como el canonical (SEO-04).
 * `changeFrequency` y `priority` se omiten: Google los ignora.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return publicPages().map(({ ref, path, languages }) => {
    const modified = lastModified(ref);
    const alternates = Object.keys(languages).length > 0
      ? { languages: Object.fromEntries(Object.entries(languages).map(([lang, href]) => [lang, absoluteUrl(href)])) }
      : undefined;
    return { url: absoluteUrl(path), ...(modified ? { lastModified: modified } : {}), ...(alternates ? { alternates } : {}) };
  });
}
