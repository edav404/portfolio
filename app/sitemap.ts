import type { MetadataRoute } from "next";
import { posts } from "@/content/posts";
import { projects } from "@/data/projects";
import { site } from "@/data/site";

export const dynamic = "force-static";

/**
 * URL absoluta con barra final, igual que el canonical (`trailingSlash: true` en next.config.ts).
 * Sin barra, cada <loc> respondería 308 hacia la versión con barra (SEO-04).
 */
function absoluteUrl(path: string): string {
  const withSlash = path.endsWith("/") ? path : `${path}/`;
  return `${site.domain}${withSlash}`;
}

/**
 * SEO-05: `lastModified` solo cuando hay una fecha real en `content/` (hoy, los posts con `updated`).
 * Las páginas y los proyectos no tienen fecha de actualización fiable, así que se omite.
 * `changeFrequency` y `priority` se quitan: Google los ignora.
 * TODO Fase 7: añadir `alternates.languages` (hreflang) cuando existan las rutas /en/.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/proyectos/", "/servicios/", "/sobre-mi/", "/ahora/", "/contacto/", "/blog/"];
  const latestPost = posts.map((post) => post.updated).sort().at(-1);
  return [
    ...pages.map((path) => ({ url: absoluteUrl(path), ...(path === "/blog/" && latestPost ? { lastModified: latestPost } : {}) })),
    ...posts.map((post) => ({ url: absoluteUrl(`/blog/${post.slug.es}/`), lastModified: post.updated })),
    ...projects.map((project) => ({ url: absoluteUrl(`/proyectos/${project.slug}/`) })),
  ];
}
