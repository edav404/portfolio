/**
 * Enlaces internos escritos en ES dentro del contenido (cuerpo de posts y proyectos), llevados a
 * la ruta equivalente de cada idioma (docs/arquitectura-rutas.md §2.2 y §4.2).
 *
 * `content/posts.ts` escribe siempre la ruta ES con barra final (`/servicios/#wordpress`); en una
 * página EN ese enlace cruzaría de layout raíz. Aquí se traduce por el inventario de páginas.
 */
import { matchPath } from "@/content/routes";
import type { Locale } from "@/content/types";
import { languageIndex } from "./pages";

let esToEn: Record<string, string> | undefined;

/**
 * Ruta interna ES → ruta del idioma pedido, conservando `?query` y `#ancla`.
 * Enlaces externos, `mailto:`, recursos sin idioma (`/cv/`, `/api/`) y rutas desconocidas se
 * devuelven tal cual; una ruta ES conocida sin equivalente lanza (falla en build, no en runtime).
 */
export function localizeInternalHref(esHref: string, locale: Locale): string {
  if (locale === "es" || !esHref.startsWith("/") || esHref.startsWith("//")) return esHref;
  const [, path = "", rest = ""] = esHref.match(/^([^?#]*)(.*)$/) ?? [];
  const match = matchPath(path);
  if (!match) return esHref;
  if (match.locale !== "es") return esHref;
  const normalized = path.endsWith("/") ? path : `${path}/`;
  esToEn ??= languageIndex("es");
  const target = esToEn[normalized];
  if (!target) throw new Error(`lib/i18n/links.ts: "${esHref}" no tiene equivalente en ${locale}`);
  return `${target}${rest}`;
}
