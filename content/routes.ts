/**
 * Fuente única de rutas públicas (D7 de docs/arquitectura-rutas.md §4.1).
 *
 * De aquí salen canonical, hreflang, sitemap, selector de idioma, enlaces internos y `llms.txt`.
 * Módulo puro: no importa contenido ni lee variables de entorno, así que se puede usar en cliente.
 * Todas las rutas llevan barra final (`trailingSlash: true` en next.config.ts).
 */
import { publishedLocales } from "./publication";
import { defaultLocale, locales, type L, type Locale } from "./types";

export type RouteDef = {
  /** Patrón por idioma, con `[param]` para segmentos dinámicos. */
  es: string;
  en: string;
  /** Fase en la que se crea la ruta (sin `since`: existe desde la Fase 3). */
  since?: number;
  /** `false` = noindex y fuera del sitemap (por defecto, indexable). */
  indexable?: boolean;
};

export const routes = {
  home:      { es: "/",                     en: "/en/" },
  projects:  { es: "/proyectos/",           en: "/en/projects/" },
  project:   { es: "/proyectos/[slug]/",    en: "/en/projects/[slug]/" },
  services:  { es: "/servicios/",           en: "/en/services/" },
  about:     { es: "/sobre-mi/",            en: "/en/about/" },
  blog:      { es: "/blog/",                en: "/en/blog/" },
  post:      { es: "/blog/[slug]/",         en: "/en/blog/[slug]/" },
  now:       { es: "/ahora/",               en: "/en/now/" },
  contact:   { es: "/contacto/",            en: "/en/contact/" },
  service:   { es: "/servicios/[slug]/",    en: "/en/services/[slug]/",    since: 5 },
  os:        { es: "/os/",                  en: "/en/os/",                 since: 4, indexable: false },
  osProject: { es: "/os/proyectos/[slug]/", en: "/en/os/projects/[slug]/", since: 4, indexable: false },
  classic:   { es: "/classic/",             en: "/en/classic/",            since: 5, indexable: false },
} as const satisfies Record<string, RouteDef>;

export type RouteKey = keyof typeof routes;

/** Idiomas visibles para buscadores (content/publication.ts). Pasa a `["es", "en"]` en P9. */
export { publishedLocales };

/** Locale de OpenGraph (`og:locale`). */
export const ogLocale = { es: "es_CO", en: "en_US" } as const satisfies L;

/** Locale de `Intl` (fechas, números). */
export const intlLocale = { es: "es-CO", en: "en-US" } as const satisfies L;

// --- Tipos de parámetros -------------------------------------------------------------------

/** Nombres de `[param]` de un patrón: "/blog/[slug]/" → "slug". */
type ParamNames<P extends string> = P extends `${string}[${infer Name}]${infer Rest}` ? Name | ParamNames<Rest> : never;

/** Valor de un parámetro: igual en ambos idiomas (`string`) o traducido (`Partial<L>`, p. ej. slug de post). */
export type ParamValue = string | Partial<L>;

export type RouteParams<K extends RouteKey> = { [N in ParamNames<(typeof routes)[K]["es"]>]: ParamValue };

/** Las rutas sin parámetros no aceptan `params`; las que tienen parámetros los exigen. */
type ParamsArg<K extends RouteKey> = [ParamNames<(typeof routes)[K]["es"]>] extends [never] ? [params?: undefined] : [params: RouteParams<K>];

const PARAM = /\[([^\]]+)\]/g;

function resolveParam(value: ParamValue | undefined, locale: Locale): string | undefined {
  return typeof value === "string" ? value : value?.[locale];
}

/** Rellena el patrón; devuelve `null` si falta algún parámetro para ese idioma. */
function build(key: RouteKey, locale: Locale, params: Record<string, ParamValue> | undefined): string | null {
  let missing = false;
  const path = routes[key][locale].replace(PARAM, (_, name: string) => {
    const value = resolveParam(params?.[name], locale);
    if (!value) { missing = true; return ""; }
    if (value.includes("/")) throw new Error(`content/routes.ts: el parámetro "${name}" de "${key}" no puede contener "/": ${value}`);
    return encodeURIComponent(value);
  });
  return missing ? null : path;
}

// --- API -----------------------------------------------------------------------------------

/** Ruta interna (relativa al dominio, con barra final). Lanza si falta un parámetro: falla en build. */
export function href<K extends RouteKey>(key: K, locale: Locale, ...[params]: ParamsArg<K>): string {
  const path = build(key, locale, params);
  if (path === null) throw new Error(`content/routes.ts: faltan parámetros para "${key}" (${locale})`);
  return path;
}

/** Rutas de los idiomas publicados (sin tipar los parámetros: lo usan `alternates` y `hreflangMap`). */
function published(key: RouteKey, params: Record<string, ParamValue> | undefined): Partial<Record<Locale, string>> {
  const result: Partial<Record<Locale, string>> = {};
  for (const locale of publishedLocales) {
    const path = build(key, locale, params);
    if (path !== null) result[locale] = path;
  }
  return result;
}

/** Ruta de cada idioma publicado. Omite los no publicados y los que no tienen el parámetro traducido. */
export function alternates<K extends RouteKey>(key: K, ...[params]: ParamsArg<K>): Partial<Record<Locale, string>> {
  return published(key, params);
}

/** Mapa hreflang → ruta, para `alternates.languages` de la metadata y del sitemap. `x-default` = ES. */
export function hreflangMap<K extends RouteKey>(key: K, ...[params]: ParamsArg<K>): Record<string, string> {
  return withDefault(published(key, params));
}

function withDefault(paths: Partial<Record<Locale, string>>): Record<string, string> {
  const map: Record<string, string> = { ...paths };
  const fallback = map[defaultLocale];
  if (fallback) map["x-default"] = fallback;
  return map;
}

/**
 * Ruta + parámetros como un solo valor, para APIs que la reciben como dato (p. ej. `buildMetadata`).
 * Mismas reglas de tipos que `href`: `params` solo (y siempre) en rutas con `[param]`.
 */
export type RouteRef = {
  [K in RouteKey]: [ParamNames<(typeof routes)[K]["es"]>] extends [never] ? { route: K; params?: undefined } : { route: K; params: RouteParams<K> };
}[RouteKey];

/** `href` a partir de un `RouteRef`. */
export function hrefFor(ref: RouteRef, locale: Locale): string {
  const path = build(ref.route, locale, ref.params);
  if (path === null) throw new Error(`content/routes.ts: faltan parámetros para "${ref.route}" (${locale})`);
  return path;
}

/** `alternates` a partir de un `RouteRef`. */
export function alternatesFor(ref: RouteRef): Partial<Record<Locale, string>> {
  return published(ref.route, ref.params);
}

/** `hreflangMap` a partir de un `RouteRef`. */
export function hreflangFor(ref: RouteRef): Record<string, string> {
  return withDefault(published(ref.route, ref.params));
}

export type RouteMatch = { key: RouteKey; locale: Locale; params: Record<string, string> };

type Matcher = { key: RouteKey; locale: Locale; names: string[]; regex: RegExp; dynamic: boolean };

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|\\]/g, "\\$&");
}

/** Patrones compilados; los estáticos primero para que nunca los capture un segmento dinámico. */
const matchers: Matcher[] = (Object.keys(routes) as RouteKey[])
  .flatMap((key) => locales.map((locale) => {
    const pattern: string = routes[key][locale];
    const names = [...pattern.matchAll(PARAM)].map((match) => match[1]);
    const source = pattern.split(PARAM).map((part, index) => (index % 2 ? "([^/]+)" : escapeRegex(part))).join("");
    return { key, locale, names, regex: new RegExp(`^${source}$`), dynamic: names.length > 0 };
  }))
  .sort((a, b) => Number(a.dynamic) - Number(b.dynamic));

/**
 * Ruta conocida para un `pathname` (sin query ni hash; tolera la falta de barra final).
 * Los parámetros se devuelven decodificados y ya resueltos para el idioma encontrado.
 */
export function matchPath(pathname: string): RouteMatch | null {
  let path = pathname.split(/[?#]/)[0] || "/";
  if (!path.endsWith("/")) path += "/";
  for (const { key, locale, names, regex } of matchers) {
    const match = regex.exec(path);
    if (!match) continue;
    try {
      const params = Object.fromEntries(names.map((name, index) => [name, decodeURIComponent(match[index + 1])]));
      return { key, locale, params };
    } catch {
      return null; // secuencia % mal formada
    }
  }
  return null;
}
