import { describe, expect, it } from "vitest";
import { posts } from "@/content/posts";
import { projects } from "@/content/projects";
import { wordpressRedirects } from "@/lib/redirects";

const sources = wordpressRedirects.map((redirect) => redirect.source);
const destinations = wordpressRedirects.map((redirect) => redirect.destination);

describe("redirecciones de WordPress", () => {
  it("hay redirecciones y todas son permanentes", () => {
    expect(wordpressRedirects.length).toBeGreaterThan(0);
    for (const redirect of wordpressRedirects) expect(redirect).toMatchObject({ permanent: true });
  });

  it("sin destinos externos: rutas que empiezan por una sola barra", () => {
    for (const destination of destinations) {
      expect(destination).toMatch(/^\/(?!\/)/);
      expect(destination).not.toMatch(/^[a-z][a-z0-9+.-]*:/i);
    }
  });

  it("source y destino con barra final (trailingSlash: true)", () => {
    for (const path of [...sources, ...destinations]) expect(path.split(/[?#]/)[0]).toMatch(/\/$/);
  });

  it("sin duplicados de source", () => {
    expect(new Set(sources).size).toBe(sources.length);
  });

  it("sin cadenas: ningún destino es source de otra redirección", () => {
    for (const destination of destinations) expect(sources).not.toContain(destination);
  });

  it("ninguna redirección apunta a sí misma", () => {
    for (const { source, destination } of wordpressRedirects) expect(destination).not.toBe(source);
  });

  it("cada destino /proyectos/<slug>/ existe y tiene portada (solo esos generan página)", () => {
    const withPage = new Set(projects.filter((project) => project.image).map((project) => project.slug));
    const projectDestinations = destinations.filter((destination) => /^\/proyectos\/[^/]+\/$/.test(destination));
    expect(projectDestinations.length).toBeGreaterThan(0);
    for (const destination of projectDestinations) expect(withPage).toContain(destination.split("/")[2]);
  });

  it("cada destino /blog/<slug>/ es un post existente", () => {
    const slugs = new Set(posts.map((post) => post.slug.es));
    for (const destination of destinations.filter((path) => /^\/blog\/[^/]+\/$/.test(path))) {
      expect(slugs).toContain(destination.split("/")[2]);
    }
  });

  it.each([
    ["/portfolio/green-holds/", "/proyectos/cia-sur/"],
    ["/portfolio/vie-company-logo/", "/proyectos/green-holds/"],
  ])("trampa de nombres de WordPress: %s → %s", (source, destination) => {
    expect(wordpressRedirects.find((redirect) => redirect.source === source)?.destination).toBe(destination);
  });

  it("/blog/ no se redirige (coincide con la ruta nueva)", () => {
    expect(sources).not.toContain("/blog/");
  });
});
