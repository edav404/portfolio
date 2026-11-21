import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { routes, type RouteKey } from "@/content/routes";

/**
 * Paridad de archivos ES/EN (docs/arquitectura-rutas.md §0, coste de D1): toda ruta que ya debe
 * existir (sin `since` o con `since ≤ 3`) tiene su `page.tsx` en ambos árboles, en la carpeta que
 * dicta `content/routes.ts`. Si alguien añade una página en un idioma y olvida el otro, falla.
 */
const CURRENT_PHASE = 3;
const roots = { es: "app/(es)/(site)", en: "app/en/(site)" } as const;

function pageFile(locale: keyof typeof roots, pattern: string): string {
  const path = locale === "en" ? pattern.replace(/^\/en\//, "/") : pattern;
  return join(roots[locale], path, "page.tsx");
}

const keys = (Object.keys(routes) as RouteKey[]).filter((key) => {
  const since = (routes[key] as { since?: number }).since;
  return since === undefined || since <= CURRENT_PHASE;
});

describe("paridad de páginas ES/EN", () => {
  it("hay rutas de la fase actual", () => {
    expect(keys.length).toBeGreaterThanOrEqual(9);
  });

  it.each(keys)("%s tiene page.tsx en ES y EN", (key) => {
    for (const locale of ["es", "en"] as const) {
      const file = pageFile(locale, routes[key][locale]);
      expect(existsSync(join(process.cwd(), file)), file).toBe(true);
    }
  });

  it("cada página EN reutiliza una vista de components/views con locale=\"en\"", async () => {
    const { readFileSync } = await import("node:fs");
    for (const key of keys) {
      const source = readFileSync(join(process.cwd(), pageFile("en", routes[key].en)), "utf8");
      expect(source, key).toMatch(/from "@\/components\/views\//);
      expect(source, key).toMatch(/locale="en"/);
      expect(source, key).not.toMatch(/locale="es"|\("es"/);
    }
  });
});
