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

describe("sitemap e idiomas (P8)", () => {
  it("hoy (P9): exactamente las URLs ES y EN de la línea base", async () => {
    const { readFileSync } = await import("node:fs");
    const baseline = JSON.parse(readFileSync("tests/fixtures/routes-baseline.json", "utf8")) as { entries: { path: string; kind: string }[] };
    const expected = baseline.entries.filter((entry) => entry.kind === "sitemap").map((entry) => `https://edav.com.co${entry.path}`);
    expect(entries.map((entry) => entry.url)).toEqual(expected);
    expect(entries).toHaveLength(44);
  });

  it("solo ES publicado (simulado): solo URLs ES y sin alternates", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://edav.com.co");
    vi.resetModules();
    vi.doMock("@/content/publication", () => ({ publishedLocales: ["es"] }));
    const esOnly = (await import("@/app/sitemap")).default();
    vi.doUnmock("@/content/publication");
    vi.unstubAllEnvs();
    expect(esOnly).toHaveLength(entries.length / 2);
    for (const entry of esOnly) {
      expect(new URL(entry.url).pathname.startsWith("/en/"), entry.url).toBe(false);
      expect(entry.alternates, entry.url).toBeUndefined();
    }
  });

  it("ES + EN: hreflang recíproco con x-default = ES y sin rutas no indexables", () => {
    const both = entries;
    const byUrl = new Map(both.map((entry) => [entry.url, entry]));
    for (const entry of both) {
      const languages = entry.alternates?.languages as Record<string, string> | undefined;
      expect(languages, entry.url).toBeDefined();
      expect(Object.keys(languages!).sort()).toEqual(["en", "es", "x-default"]);
      expect(languages!["x-default"]).toBe(languages!.es);
      expect(Object.values(languages!)).toContain(entry.url);
      // Recíproco: cada alternativa existe en el sitemap y declara el mismo grupo.
      for (const lang of ["es", "en"]) expect(byUrl.get(languages![lang])?.alternates?.languages, `${entry.url} → ${lang}`).toEqual(languages);
      expect(new URL(entry.url).pathname).not.toMatch(/^\/(en\/)?(os|classic)\//);
    }
    expect(both.filter((entry) => new URL(entry.url).pathname.startsWith("/en/"))).toHaveLength(entries.length / 2);
  });
});
