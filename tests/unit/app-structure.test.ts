import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contratos de la estructura de app/ (docs/arquitectura-rutas.md §8.2 y §9.3). Análisis del código
 * fuente: los exports de segmento de Next son estáticos, así que basta con leer los archivos.
 */
const appDir = join(process.cwd(), "app");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const all = files(appDir).map((path) => relative(appDir, path).split(sep).join("/"));
const read = (path: string) => readFileSync(join(appDir, path), "utf8");

describe("estructura de app/", () => {
  it("el 404 global existe y está activado en next.config.ts", () => {
    expect(all).toContain("global-not-found.tsx");
    expect(readFileSync(join(process.cwd(), "next.config.ts"), "utf8")).toMatch(/experimental:\s*\{[^}]*globalNotFound:\s*true/);
  });

  it("el 404 global define su documento con lang=\"es\" y no declara canonical", () => {
    const source = read("global-not-found.tsx");
    expect(source).toMatch(/<Document locale="es">/);
    expect(source).not.toMatch(/\b(canonical|alternates)\s*:/);
  });

  it("sin layout ni not-found en la raíz de app/ (un layout raíz por idioma)", () => {
    expect(all.filter((path) => /^(layout|not-found|page)\.tsx$/.test(path))).toEqual([]);
    expect(all).toContain("(es)/layout.tsx");
  });

  it("toda página de catálogo con [param] exporta generateStaticParams y dynamicParams = false", () => {
    const dynamicPages = all.filter((path) => /\[[^.\]]+\]/.test(path) && /\/page\.tsx$/.test(path));
    expect(dynamicPages.length).toBeGreaterThan(0);
    for (const path of dynamicPages) {
      const source = read(path);
      expect(source, path).toMatch(/export const dynamicParams = false/);
      expect(source, path).toMatch(/export (async )?function generateStaticParams/);
    }
  });

  it("no hay catch-all [...x] en el árbol ES (el 404 lo da global-not-found)", () => {
    expect(all.filter((path) => path.startsWith("(es)/") && /\[\.\.\./.test(path))).toEqual([]);
  });

  it("los recursos sin idioma siguen en la raíz de app/", () => {
    for (const path of ["api", "cv", "sitemap.ts", "robots.ts", "icon.svg"]) expect(existsSync(join(appDir, path)), path).toBe(true);
  });
});
