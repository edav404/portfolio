/**
 * Redirecciones permanentes del WordPress antiguo (docs/auditoria/07-redirecciones-wordpress.md).
 * Se cablean en `next.config.ts` → `redirects()`.
 *
 * Notas:
 * - `permanent: true` responde 308, que Google trata como 301 (docs de Next 16: redirects.md).
 * - Con `trailingSlash: true`, Next antepone su propia redirección `/x` → `/x/` con prioridad, y el
 *   `source` se compara de forma estricta. Por eso cada `source` va CON barra final (era el formato de
 *   WordPress, permalinks `/%postname%/`): la URL antigua canónica llega al destino en un solo salto.
 *   La variante sin barra hace dos saltos (`/x` → `/x/` → destino); es inevitable y no forma bucle.
 * - Todos los destinos son URLs finales con barra (sin cadenas) y existen en `content/projects.ts`
 *   con portada (las rutas `/proyectos/<slug>/` solo se generan para proyectos con `image`).
 * - `/blog/` antiguo coincide con la ruta nueva: no se redirige.
 * - Ojo: en WordPress `/portfolio/green-holds/` era CIA SUR y `/portfolio/vie-company-logo/` era
 *   Green Holds. NO redirigir por nombre.
 * - Mantenerlas al menos 12 meses. `/?p=<id>` y `/?portfolio=<slug>` solo si aparecen en Search Console.
 */
import type { NextConfig } from "next";
// Import relativo: este módulo lo carga next.config.ts, donde no conviene depender del alias `@/`.
import { posts } from "../content/posts";

type Redirect = Awaited<ReturnType<NonNullable<NextConfig["redirects"]>>>[number];

/** Slug ES del post (conserva el de WordPress); falla en build si el post desaparece. */
function postPath(wordpressSlug: string): string {
  const post = posts.find((item) => item.slug.es === wordpressSlug);
  if (!post) throw new Error(`lib/redirects.ts: no existe el post "${wordpressSlug}" en content/posts.ts`);
  return `/blog/${post.slug.es}/`;
}

/** [URL antigua de WordPress, destino nuevo] */
const map: [string, string][] = [
  ["/home/", "/"],
  ["/contact/", "/contacto/"],
  ["/portfolio/", "/proyectos/"],
  // Posts (permalinks /%postname%/).
  ["/para-que-una-pagina-web-para-mi-negocio/", postPath("para-que-una-pagina-web-para-mi-negocio")],
  ["/como-el-seo-puede-ayudar-a-tu-negocio-a-crecer/", postPath("como-el-seo-puede-ayudar-a-tu-negocio-a-crecer")],
  // Portafolio (CPT portfolio en /portfolio/<slug>/).
  ["/portfolio/big-vapers-company/", "/proyectos/big-vapers-company/"],
  ["/portfolio/vie-company-logo/", "/proyectos/green-holds/"], // era Green Holds
  ["/portfolio/tech-byte-co/", "/proyectos/tech-byte/"],
  ["/portfolio/vape-friends/", "/proyectos/vape-friends/"],
  ["/portfolio/the-brant/", "/proyectos/the-brant/"],
  ["/portfolio/erth-wellness/", "/proyectos/erth-wellness/"],
  ["/portfolio/anomaly-studio/", "/proyectos/anomaly-studio/"],
  ["/portfolio/zona-work/", "/proyectos/zona-work/"],
  ["/portfolio/green-holds/", "/proyectos/cia-sur/"], // era CIA SUR, no Green Holds
  ["/portfolio/rediseno-green-holds-mx/", "/proyectos/green-holds-mexico/"],
  ["/portfolio/civicoin/", "/proyectos/civicoin/"],
  ["/portfolio/biogenesis-peptides/", "/proyectos/biogenesis-peptides/"],
  // Duplicado "-2" de WordPress: sin verificar que exista; inofensivo si nunca se pide.
  ["/portfolio/biogenesis-peptides-2/", "/proyectos/biogenesis-peptides/"],
];

export const wordpressRedirects: Redirect[] = map.map(([source, destination]) => ({ source, destination, permanent: true }));
