import { describe, expect, it } from "vitest";
import { osProjectMetadata, osMetadata, osProjectParams } from "@/components/views/os";
import { caseStudies, getOsProject, osProjectSlugs, osProjects, projects } from "@/content/projects";
import { href, matchPath } from "@/content/routes";
import { languageIndex, availablePages, publicPages } from "@/lib/i18n/pages";

/**
 * Rutas del SO y catálogo autorizado (docs/arquitectura-os.md §1.4 y §1.6, DS10).
 * Los slugs no autorizados dan 404 porque `generateStaticParams` + `dynamicParams = false` solo
 * conocen `osProjectParams()`; aquí se fija que todos los consumidores salen del mismo catálogo.
 */
const excluded = projects.filter((project) => !osProjectSlugs.includes(project.slug)).map((project) => project.slug);

describe("catálogo de proyectos del SO", () => {
  it("por defecto son los casos de estudio públicos (Q6)", () => {
    expect([...osProjectSlugs]).toEqual(caseStudies.map((project) => project.slug));
    expect(osProjectSlugs).toHaveLength(13);
    expect(osProjects().map((project) => project.slug)).toEqual([...osProjectSlugs]);
  });

  it("SSG, selector de idioma y detalle devuelven el mismo conjunto", () => {
    const slugs = [...osProjectSlugs].sort();
    expect(osProjectParams().map((param) => param.slug).sort()).toEqual(slugs);
    const inLanguageIndex = Object.keys(languageIndex("es")).map((path) => matchPath(path)).filter((match) => match?.key === "osProject").map((match) => match!.params.slug).sort();
    expect(inLanguageIndex).toEqual(slugs);
    const inPages = availablePages().filter((page) => page.ref.route === "osProject").map((page) => (page.ref.params as { slug: string }).slug).sort();
    expect(inPages).toEqual(slugs);
    for (const slug of slugs) expect(getOsProject(slug)?.slug).toBe(slug);
  });

  it("un slug excluido no se genera, no se enlaza y no tiene detalle", () => {
    expect(excluded.length).toBeGreaterThan(0);
    for (const slug of excluded) {
      expect(osProjectParams().map((param) => param.slug)).not.toContain(slug);
      expect(getOsProject(slug)).toBeUndefined();
      expect(osProjectMetadata("es", slug)).toEqual({});
      const path = href("osProject", "es", { slug });
      expect(Object.keys(languageIndex("es"))).not.toContain(path);
      expect(Object.keys(languageIndex("en"))).not.toContain(href("osProject", "en", { slug }));
    }
  });
});

describe("rutas y metadata del SO", () => {
  it("URLs de los cuatro patrones", () => {
    expect(href("os", "es")).toBe("/os/");
    expect(href("os", "en")).toBe("/en/os/");
    expect(href("osProject", "es", { slug: "a" })).toBe("/os/proyectos/a/");
    expect(href("osProject", "en", { slug: "a" })).toBe("/en/os/projects/a/");
  });

  it("el selector de idioma enlaza /os/ ↔ /en/os/ y sus proyectos", () => {
    const slug = osProjectSlugs[0];
    expect(languageIndex("es")["/os/"]).toBe("/en/os/");
    expect(languageIndex("en")["/en/os/"]).toBe("/os/");
    expect(languageIndex("es")[href("osProject", "es", { slug })]).toBe(href("osProject", "en", { slug }));
  });

  it("ninguna ruta os* está en publicPages (sitemap, llms.txt)", () => {
    for (const page of publicPages()) expect(page.ref.route.startsWith("os"), page.path).toBe(false);
  });

  it.each(["es", "en"] as const)("metadata (%s): noindex, canonical y og:url propios, sin hreflang", (locale) => {
    const slug = osProjectSlugs[0];
    const cases = [
      [osMetadata(locale), href("os", locale)],
      [osProjectMetadata(locale, slug), href("osProject", locale, { slug })],
    ] as const;
    for (const [metadata, path] of cases) {
      expect(metadata.robots).toEqual({ index: false, follow: true });
      expect(metadata.alternates?.canonical).toBe(path);
      expect(metadata.alternates && "languages" in metadata.alternates).toBe(false);
      expect(metadata.openGraph && "url" in metadata.openGraph ? metadata.openGraph.url : undefined).toBe(path);
      expect(metadata.openGraph && "alternateLocale" in metadata.openGraph).toBe(false);
    }
  });
});
