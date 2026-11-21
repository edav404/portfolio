import { describe, expect, it } from "vitest";
import { pageFor, pages, withTitleSuffix } from "@/content/pages";
import { locales } from "@/content/types";
import { contactErrorCodes, format, isLocalized, resolveLocale, ui, uiFor } from "@/content/ui";

type Leaf = { path: string; es: unknown; en: unknown };

/** Recorre un árbol de textos y devuelve cada hoja `{ es, en }` con su ruta. */
function leaves(tree: unknown, path = ""): Leaf[] {
  if (isLocalized(tree)) return [{ path, es: tree.es, en: tree.en }];
  if (typeof tree !== "object" || tree === null) throw new Error(`Hoja sin traducir en ${path}: ${String(tree)}`);
  return Object.entries(tree).flatMap(([key, value]) => leaves(value, path ? `${path}.${key}` : key));
}

/** Estructura de claves de un valor (para comparar ES con EN). */
function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(() => "item");
  if (typeof value === "object" && value !== null) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shape(item)]));
  return typeof value;
}

/** Marcadores `{nombre}` de un texto, ordenados. */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

const trees = { ui, pages } as const;

describe.each(Object.entries(trees))("content/%s", (_name, tree) => {
  const all = leaves(tree);

  it("tiene hojas", () => {
    expect(all.length).toBeGreaterThan(0);
  });

  it.each(all.map((leaf) => [leaf.path, leaf] as const))("%s: ningún valor vacío en ES ni EN", (_path, leaf) => {
    for (const value of [leaf.es, leaf.en]) {
      const items = Array.isArray(value) ? value : [value];
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(typeof item).toBe("string");
        expect((item as string).trim()).not.toBe("");
      }
    }
  });

  it.each(all.map((leaf) => [leaf.path, leaf] as const))("%s: misma forma y marcadores en ES y EN", (_path, leaf) => {
    expect(Array.isArray(leaf.en)).toBe(Array.isArray(leaf.es));
    const es = Array.isArray(leaf.es) ? leaf.es : [leaf.es];
    const en = Array.isArray(leaf.en) ? leaf.en : [leaf.en];
    expect(en.length).toBe(es.length);
    es.forEach((text, index) => expect(placeholders(en[index] as string)).toEqual(placeholders(text as string)));
  });

  it("la versión resuelta tiene las mismas claves en ambos idiomas", () => {
    expect(shape(resolveLocale(tree, "en"))).toEqual(shape(resolveLocale(tree, "es")));
  });
});

describe("SEO de content/pages.ts", () => {
  const seo = Object.entries(pages).flatMap(([key, page]) => locales.map((locale) => [key, locale, page.seo.title[locale], page.seo.description[locale]] as const));

  it.each(seo)("%s (%s): título ≤ 60 caracteres con el sufijo", (_key, _locale, title) => {
    const full = withTitleSuffix(title);
    expect(full.endsWith(" | Emmanuel Dávila")).toBe(true);
    expect(full.length).toBeLessThanOrEqual(60);
  });

  it.each(seo)("%s (%s): descripción ≤ 160 caracteres", (_key, _locale, _title, description) => {
    expect(description.length).toBeLessThanOrEqual(160);
  });

  it("títulos y descripciones no se repiten entre páginas", () => {
    for (const locale of locales) {
      const titles = Object.values(pages).map((page) => page.seo.title[locale]);
      const descriptions = Object.values(pages).map((page) => page.seo.description[locale]);
      expect(new Set(titles).size).toBe(titles.length);
      expect(new Set(descriptions).size).toBe(descriptions.length);
    }
  });
});

describe("helpers", () => {
  it("uiFor resuelve una sección", () => {
    expect(uiFor("es", "nav").projects).toBe("Proyectos");
    expect(uiFor("en", "nav").projects).toBe("Projects");
    expect(uiFor("en", "os").apps.terminal.title).toBe("Command Prompt");
  });

  it("pageFor resuelve listas y objetos anidados", () => {
    expect(pageFor("es", "services").faq.items.duration.question).toBe("¿Cuánto tarda un proyecto web?");
    expect(pageFor("en", "now").focus.items).toHaveLength(4);
  });

  it("format rellena marcadores y deja intactos los que faltan", () => {
    expect(format("{count} casos documentados", { count: 13 })).toBe("13 casos documentados");
    expect(format("Hola {name}", {})).toBe("Hola {name}");
  });

  it("los códigos de error del formulario son los acordados", () => {
    expect([...contactErrorCodes].sort()).toEqual(["invalid", "not_configured", "origin", "rate_limited", "server", "timeout", "too_large"]);
  });
});
