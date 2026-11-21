import type { MetadataRoute } from "next";
import { beforeAll, describe, expect, it, vi } from "vitest";

let entries: MetadataRoute.Sitemap;

beforeAll(async () => {
  // El dominio se lee al importar el módulo de configuración del sitio: fijarlo antes de importar.
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://edav.com.co");
  vi.resetModules();
  entries = (await import("@/app/sitemap")).default();
  vi.unstubAllEnvs();
});

describe("sitemap", () => {
  it("tiene entradas", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it("todas las URLs son absolutas, del dominio y con barra final", () => {
    for (const { url } of entries) {
      expect(url.startsWith("https://edav.com.co/"), url).toBe(true);
      expect(new URL(url).pathname, url).toMatch(/\/$/);
      expect(url, url).not.toMatch(/[?#]/);
    }
  });

  it("sin URLs repetidas", () => {
    const urls = entries.map((entry) => entry.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("sin dobles barras en la ruta", () => {
    for (const { url } of entries) expect(new URL(url).pathname, url).not.toMatch(/\/\//);
  });
});
