import { describe, expect, it } from "vitest";
import { getPostBySlug, posts, type Post } from "@/content/posts";

const locales = ["es", "en"] as const;
type Lang = (typeof locales)[number];

/** Todo el texto del cuerpo de un post en un idioma. */
function bodyTexts(post: Post, locale: Lang): string[] {
  return post.body[locale].flatMap((block) => (block.type === "ul" ? block.items : [block.text]));
}

/** Destinos de los enlaces en línea `[texto](destino)`. */
function links(text: string): string[] {
  return [...text.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)].map((match) => match[1]);
}

describe("integridad de posts", () => {
  it.each(locales)("slugs únicos y en formato URL (%s)", (locale) => {
    const slugs = posts.map((post) => post.slug[locale]);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it.each(locales)("getPostBySlug encuentra cada post por su slug (%s)", (locale) => {
    for (const post of posts) expect(getPostBySlug(post.slug[locale], locale)).toBe(post);
  });

  it("seoTitle ≤ 60 caracteres con el sufijo \" | edav\" que añade la página (≤ 53 sin él)", () => {
    for (const post of posts) {
      for (const locale of locales) {
        expect(`${post.seoTitle[locale]} | edav`.length, `${post.slug.es} (${locale})`).toBeLessThanOrEqual(60);
      }
    }
  });

  it("fechas YYYY-MM-DD y updated ≥ published", () => {
    for (const post of posts) {
      expect(post.published).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.updated >= post.published).toBe(true);
    }
  });

  it("hay enlaces internos y todos van con barra final (antes de # o ?)", () => {
    let count = 0;
    for (const post of posts) {
      for (const locale of locales) {
        for (const href of bodyTexts(post, locale).flatMap(links)) {
          if (!href.startsWith("/")) continue;
          count += 1;
          expect(href.split(/[?#]/)[0], `${post.slug.es} (${locale}): ${href}`).toMatch(/\/$/);
        }
      }
    }
    expect(count).toBeGreaterThan(0);
  });

  it("los enlaces internos son rutas de un solo origen (sin //)", () => {
    for (const post of posts) {
      for (const locale of locales) {
        for (const href of bodyTexts(post, locale).flatMap(links)) {
          if (href.startsWith("/")) expect(href, href).not.toMatch(/^\/\//);
        }
      }
    }
  });
});
