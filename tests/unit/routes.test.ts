import { describe, expect, it } from "vitest";
import baseline from "../fixtures/routes-baseline.json";
import { posts } from "@/content/posts";
import { caseStudies } from "@/content/projects";
import { alternates, href, hreflangMap, intlLocale, matchPath, ogLocale, publishedLocales, routes, type RouteKey } from "@/content/routes";
import { locales } from "@/content/types";
import { wordpressRedirects } from "@/lib/redirects";

/**
 * Criterios de P1 (docs/arquitectura-rutas.md §5). El snapshot `tests/fixtures/routes-baseline.json`
 * es la línea base P0 del sitio antes de reestructurar `app/` (scripts/snapshot-routes.mjs).
 */
type Entry = { path: string; kind: "sitemap" | "redirect" | "probe"; status: number };
const entries = (baseline as { entries: Entry[] }).entries;
const keys = Object.keys(routes) as RouteKey[];
const patterns = keys.flatMap((key) => locales.map((locale) => ({ key, locale, pattern: routes[key][locale] as string })));
const sample = (pattern: string) => pattern.replace(/\[[^\]]+\]/g, "x");

/** Rutas ES indexables que existen hoy (Fase 3), con los parámetros reales del contenido. */
function currentEsPaths(): string[] {
  return [
    ...(["home", "projects", "services", "about", "blog", "now", "contact"] as const).map((key) => href(key, "es")),
    ...posts.map((post) => href("post", "es", { slug: post.slug })),
    ...caseStudies.map(({ slug }) => href("project", "es", { slug })),
  ];
}

describe("content/routes.ts", () => {
  it("(a) las rutas ES coinciden exactamente con las URLs del sitemap de la línea base P0", () => {
    const sitemap = entries.filter((entry) => entry.kind === "sitemap").map((entry) => entry.path);
    expect(new Set(currentEsPaths())).toEqual(new Set(sitemap));
    for (const entry of entries.filter((item) => item.kind === "sitemap")) expect(entry.status, entry.path).toBe(200);
  });

  it("(a) la línea base recoge exactamente las redirecciones de lib/redirects.ts", () => {
    const sources = entries.filter((entry) => entry.kind === "redirect").map((entry) => entry.path);
    expect(sources).toEqual(wordpressRedirects.map((redirect) => redirect.source));
  });

  it("(b) todo patrón empieza por una sola barra y termina en barra; EN bajo /en/, ES fuera", () => {
    for (const { key, locale, pattern } of patterns) {
      expect(pattern, key).toMatch(/^\/(?!\/).*\/$|^\/$/);
      expect(pattern, key).not.toMatch(/\/\//);
      if (locale === "en") expect(pattern.startsWith("/en/"), key).toBe(true);
      else expect(pattern.startsWith("/en/"), key).toBe(false);
    }
  });

  it("(b) href devuelve rutas con barra final", () => {
    for (const path of currentEsPaths()) expect(path).toMatch(/\/$/);
  });

  it("(c) sin colisiones: ningún patrón repetido ni capturado por otra ruta", () => {
    const all = patterns.map(({ pattern }) => pattern);
    expect(new Set(all).size).toBe(all.length);
    for (const { key, locale, pattern } of patterns) {
      expect(matchPath(sample(pattern)), pattern).toMatchObject({ key, locale });
    }
  });

  it("(d) ninguna redirección de WordPress choca con una ruta ni cae bajo /en/", () => {
    for (const { source, destination } of wordpressRedirects) {
      expect(matchPath(source), source).toBeNull();
      expect(source.startsWith("/en/"), source).toBe(false);
      // El destino sí es una ruta conocida (sin cadenas hacia 404).
      expect(matchPath(destination), destination).not.toBeNull();
    }
  });

  it("(e) ida y vuelta: matchPath(href(...)) devuelve la misma ruta, idioma y parámetros", () => {
    for (const key of keys) {
      for (const locale of locales) {
        const params = routes[key].es.includes("[") ? { slug: "mi-slug" } : undefined;
        const path = (href as (k: RouteKey, l: typeof locale, p?: object) => string)(key, locale, params);
        expect(matchPath(path), path).toEqual({ key, locale, params: params ?? {} });
      }
    }
    const post = posts[0];
    for (const locale of locales) {
      expect(matchPath(href("post", locale, { slug: post.slug }))).toEqual({ key: "post", locale, params: { slug: post.slug[locale] } });
    }
  });

  it("(e) matchPath tolera query, hash y falta de barra final; rechaza lo desconocido", () => {
    expect(matchPath("/proyectos/cia-sur")).toMatchObject({ key: "project", params: { slug: "cia-sur" } });
    expect(matchPath("/contacto/?servicio=wordpress#form")).toMatchObject({ key: "contact", locale: "es" });
    expect(matchPath("/en")).toMatchObject({ key: "home", locale: "en" });
    expect(matchPath("/no-existe/")).toBeNull();
    expect(matchPath("/proyectos/a/b/")).toBeNull();
    expect(matchPath("/en/proyectos/")).toBeNull();
  });

  it("(f) alternates y hreflangMap omiten los idiomas no publicados", () => {
    expect(publishedLocales).toEqual(["es"]);
    for (const key of keys) {
      const params = routes[key].es.includes("[") ? { slug: "x" } : undefined;
      const result = (alternates as (k: RouteKey, p?: object) => Record<string, string>)(key, params);
      expect(Object.keys(result)).toEqual([...publishedLocales]);
    }
    expect(hreflangMap("projects")).toEqual({ es: "/proyectos/", "x-default": "/proyectos/" });
    // Un slug traducido sin versión en un idioma publicado no genera alternate.
    expect(alternates("post", { slug: { en: "only-english" } })).toEqual({});
    expect(hreflangMap("post", { slug: { en: "only-english" } })).toEqual({});
  });

  it("href lanza si falta un parámetro o contiene una barra", () => {
    expect(() => href("post", "en", { slug: { es: "solo-es" } })).toThrow(/faltan parámetros/);
    expect(() => href("project", "es", { slug: "" })).toThrow(/faltan parámetros/);
    expect(() => href("project", "es", { slug: "a/b" })).toThrow(/no puede contener/);
  });

  it("tipos: los parámetros se exigen solo donde el patrón los tiene (comprobado por tsc)", () => {
    // @ts-expect-error — "project" exige { slug }
    expect(() => href("project", "es")).toThrow();
    // @ts-expect-error — "projects" no acepta parámetros
    expect(href("projects", "es", { slug: "x" })).toBe("/proyectos/");
    // @ts-expect-error — parámetro con nombre equivocado
    expect(() => href("post", "es", { id: "x" })).toThrow();
  });

  it("ogLocale e intlLocale cubren todos los idiomas", () => {
    for (const locale of locales) {
      expect(ogLocale[locale]).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
      expect(intlLocale[locale]).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    }
  });
});
