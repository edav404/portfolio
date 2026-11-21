/**
 * URL ↔ estado del SO (docs/arquitectura-os.md §1.3, §12). Puro: sin React ni `next/*`.
 *
 * Mecanismo: `router.push/replace(href, { scroll: false })` hacia rutas reales; NO se escribe
 * `history.state`. El catálogo de slugs autorizados llega por parámetro (no se importa
 * `content/projects.ts` en código cliente).
 */
import { canonicalPath, hrefFor, matchPath } from "@/content/routes";
import type { Locale } from "@/content/types";
import type { Action, OsState, RouteTarget } from "./window-reducer";

export type HistoryPlan =
  | { kind: "none" }
  | { kind: "push"; href: string; options: { scroll: false } }
  | { kind: "replace"; href: string; options: { scroll: false } };

export const NO_HISTORY: HistoryPlan = { kind: "none" };

/** La ruta pertenece al SO (`/os/…` o `/en/os/…`), con o sin barra final. */
export function isOsPath(pathname: string): boolean {
  const match = matchPath(pathname);
  return match !== null && (match.key === "os" || match.key === "osProject");
}

/**
 * Intención de una ruta: escritorio, proyecto autorizado o `null` (no es del SO, o el slug no
 * está en el catálogo). `%2F`, `.` y `..` no son rutas (los rechaza `matchPath`).
 */
export function intentFromPath(pathname: string, known: readonly string[]): RouteTarget | null {
  const match = matchPath(pathname);
  if (!match) return null;
  if (match.key === "os") return { kind: "desktop" };
  if (match.key === "osProject") {
    const slug = match.params.slug;
    return slug !== undefined && known.includes(slug) ? { kind: "project", slug } : null;
  }
  return null;
}

/** URL real (con barra final) de un destino del SO. */
export function hrefForTarget(target: RouteTarget, locale: Locale): string {
  return target.kind === "desktop"
    ? hrefFor({ route: "os" }, locale)
    : hrefFor({ route: "osProject", params: { slug: target.slug } }, locale);
}

/** Dos rutas son la misma entrada (con y sin barra final, codificación equivalente). */
export function samePath(a: string, b: string): boolean {
  const ca = canonicalPath(a);
  return ca !== null && ca === canonicalPath(b);
}

/**
 * Qué llamada de historial debe hacer el hook tras una acción, derivada del reducer:
 * - entrada nueva (`entryIndex` sube) → `push`; entrada sustituida → `replace`; resto → ninguna;
 * - solo `origin: "user"`: `ROUTE_CHANGED` y `HYDRATE` nunca tocan el historial;
 * - nunca `back()`: Pocket cierra hacia el lanzador sin historial (§5.4).
 */
export function planHistory(prev: OsState, next: OsState, action: Action, locale: Locale): HistoryPlan {
  if (prev === next || action.type === "ROUTE_CHANGED" || action.type === "HYDRATE") return NO_HISTORY;
  if ((action.origin ?? "user") !== "user") return NO_HISTORY;
  const entry = next.entries[next.entryIndex];
  if (!entry) return NO_HISTORY;
  const target: RouteTarget = entry.sel === null ? { kind: "desktop" } : { kind: "project", slug: entry.sel };
  const href = hrefForTarget(target, locale);
  if (next.entryIndex > prev.entryIndex) return { kind: "push", href, options: { scroll: false } };
  if (next.entryIndex === prev.entryIndex && prev.entries[prev.entryIndex]?.id !== entry.id) return { kind: "replace", href, options: { scroll: false } };
  return NO_HISTORY;
}
