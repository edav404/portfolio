import { describe, expect, it } from "vitest";
import { posts } from "@/content/posts";
import { caseStudies } from "@/content/projects";
import { href } from "@/content/routes";
import { localizeInternalHref } from "@/lib/i18n/links";
import { availablePages, languageIndex } from "@/lib/i18n/pages";

describe("inventario de páginas (lib/i18n/pages.ts)", () => {
  it("enumera las páginas estáticas, los casos de estudio y los posts, en ES y EN", () => {
    const pages = availablePages();
    expect(pages).toHaveLength(7 + caseStudies.length + posts.length);
    for (const page of pages) expect(Object.keys(page.paths).sort()).toEqual(["en", "es"]);
  });

  it("las equivalencias son recíprocas (ES → EN → ES)", () => {
    const es = languageIndex("es");
    const en = languageIndex("en");
    expect(Object.keys(es)).toHaveLength(availablePages().length);
    for (const [from, to] of Object.entries(es)) {
      expect(to.startsWith("/en/"), to).toBe(true);
      expect(en[to]).toBe(from);
    }
  });

  it("los posts enlazan su slug traducido", () => {
    const [post] = posts;
    expect(languageIndex("es")[href("post", "es", { slug: post.slug })]).toBe(href("post", "en", { slug: post.slug }));
  });
});

describe("localizeInternalHref", () => {
  it("lleva rutas ES a su equivalente EN conservando ancla y query", () => {
    expect(localizeInternalHref("/contacto/", "en")).toBe("/en/contact/");
    expect(localizeInternalHref("/servicios/#wordpress", "en")).toBe("/en/services/#wordpress");
    expect(localizeInternalHref("/contacto/?servicio=shopify", "en")).toBe("/en/contact/?servicio=shopify");
    expect(localizeInternalHref("/proyectos/cia-sur/", "en")).toBe("/en/projects/cia-sur/");
    expect(localizeInternalHref("/proyectos/cia-sur", "en")).toBe("/en/projects/cia-sur/");
  });

  it("en ES, externos, recursos sin idioma y rutas desconocidas no cambian", () => {
    expect(localizeInternalHref("/contacto/", "es")).toBe("/contacto/");
    for (const value of ["https://example.com/", "mailto:a@b.co", "/cv/emmanuel-davila-cv-es.pdf", "/api/health/", "//cdn.example.com/x", "/en/about/"]) {
      expect(localizeInternalHref(value, "en")).toBe(value);
    }
  });

  it("una ruta ES conocida sin equivalente lanza (falla en build)", () => {
    expect(() => localizeInternalHref("/proyectos/no-existe/", "en")).toThrow(/no tiene equivalente/);
  });

  it("todos los enlaces internos del cuerpo EN de los posts quedan bajo /en/", () => {
    const link = /\]\((\/[^)\s]+)\)/g;
    let count = 0;
    for (const post of posts) {
      for (const block of post.body.en) {
        const texts = block.type === "ul" ? block.items : [block.text];
        for (const text of texts) for (const [, target] of text.matchAll(link)) {
          count += 1;
          expect(localizeInternalHref(target, "en"), target).toMatch(/^\/en\//);
        }
      }
    }
    expect(count).toBeGreaterThan(0);
  });
});

describe("localizeInternalHref con rutas no canónicas (Codex 6)", () => {
  it("canonicaliza la clave: %63ia-sur y sin barra final resuelven igual", () => {
    expect(localizeInternalHref("/proyectos/%63ia-sur/", "en")).toBe("/en/projects/cia-sur/");
    expect(localizeInternalHref("/proyectos/%63ia-sur#galeria", "en")).toBe("/en/projects/cia-sur/#galeria");
  });

  it("separadores codificados o . / .. no son rutas del sitio: se devuelven tal cual", () => {
    for (const value of ["/proyectos/a%2Fb/", "/proyectos/%2E%2E/"]) expect(localizeInternalHref(value, "en")).toBe(value);
  });
});
