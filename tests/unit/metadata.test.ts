import { beforeAll, describe, expect, it, vi } from "vitest";

type MetadataModule = typeof import("@/lib/metadata");
let m: MetadataModule;

beforeAll(async () => {
  // El dominio se lee al importar content/site.ts: fijarlo antes de importar.
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://edav.com.co");
  vi.resetModules();
  m = await import("@/lib/metadata");
  vi.unstubAllEnvs();
});

describe("absoluteUrl", () => {
  it("antepone el dominio canónico a rutas internas", () => {
    expect(m.absoluteUrl("/proyectos/")).toBe("https://edav.com.co/proyectos/");
    expect(m.absoluteUrl("img/a.png")).toBe("https://edav.com.co/img/a.png");
  });

  it("deja intactas las URLs absolutas", () => {
    expect(m.absoluteUrl("https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png");
  });
});

describe("rootMetadata", () => {
  it("define base, plantilla de título y descripción, sin canonical, openGraph ni twitter (D8)", () => {
    const root = m.rootMetadata("es");
    expect(root.metadataBase?.toString()).toBe("https://edav.com.co/");
    expect(root.title).toEqual({ default: "Emmanuel Dávila | Desarrollador Full Stack y de automatización", template: "%s | Emmanuel Dávila" });
    expect(root.description).toBeTruthy();
    expect(root).not.toHaveProperty("alternates");
    expect(root).not.toHaveProperty("openGraph");
    expect(root).not.toHaveProperty("twitter");
  });
});

describe("buildMetadata", () => {
  const project = () => m.buildMetadata({ route: "project", params: { slug: "cia-sur" }, locale: "es", title: "CIA SUR — Caso de estudio", description: "Resumen", image: { url: "/img/cia.png", alt: "CIA SUR" } });

  it("canonical, og:url y twitter propios de la página", () => {
    const meta = project();
    expect(meta.alternates?.canonical).toBe("/proyectos/cia-sur/");
    expect(meta.openGraph).toMatchObject({ url: "/proyectos/cia-sur/", title: "CIA SUR — Caso de estudio | Emmanuel Dávila", description: "Resumen", locale: "es_CO", siteName: "EDAV OS", type: "website" });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image", title: "CIA SUR — Caso de estudio | Emmanuel Dávila" });
  });

  it("título con plantilla por defecto; absoluto si se pide (og:title igual al <title>)", () => {
    expect(project().title).toBe("CIA SUR — Caso de estudio");
    const home = m.buildMetadata({ route: "home", locale: "es", title: m.defaultTitle("es"), absoluteTitle: true, description: "d" });
    expect(home.title).toEqual({ absolute: "Emmanuel Dávila | Desarrollador Full Stack y de automatización" });
    expect(home.openGraph?.title).toBe("Emmanuel Dávila | Desarrollador Full Stack y de automatización");
    expect(home.alternates?.canonical).toBe("/");
  });

  it("imágenes con URL absoluta en openGraph y twitter", () => {
    const meta = project();
    expect(meta.openGraph?.images).toEqual([{ url: "https://edav.com.co/img/cia.png", alt: "CIA SUR" }]);
    expect(meta.twitter?.images).toEqual([{ url: "https://edav.com.co/img/cia.png", alt: "CIA SUR" }]);
  });

  it("hreflang ES/EN con x-default = ES y og:locale:alternate (P9)", () => {
    const meta = project();
    expect(meta.alternates?.languages).toEqual({ es: "/proyectos/cia-sur/", en: "/en/projects/cia-sur/", "x-default": "/proyectos/cia-sur/" });
    expect(meta.openGraph).toMatchObject({ locale: "es_CO", alternateLocale: ["en_US"] });
  });

  it("indexable por defecto en ES y EN; noindex con index: false", () => {
    expect(project()).not.toHaveProperty("robots");
    expect(m.buildMetadata({ route: "contact", locale: "es", title: "t", description: "d", index: false }).robots).toEqual({ index: false, follow: true });
    const en = m.buildMetadata({ route: "projects", locale: "en", title: "Projects", description: "d" });
    expect(en).not.toHaveProperty("robots");
    expect(en.alternates?.canonical).toBe("/en/projects/");
    expect(en.openGraph?.locale).toBe("en_US");
  });

  it("artículo: tipo article, fechas, etiquetas y autor", () => {
    const meta = m.buildMetadata({
      route: "post", params: { slug: { es: "mi-post", en: "my-post" } }, locale: "es", title: "Post | edav", absoluteTitle: true, description: "d",
      type: "article", article: { publishedTime: "2024-01-02", modifiedTime: "2024-02-03", tags: ["SEO"] },
    });
    expect(meta.alternates?.canonical).toBe("/blog/mi-post/");
    expect(meta.openGraph).toMatchObject({ type: "article", url: "/blog/mi-post/", publishedTime: "2024-01-02", modifiedTime: "2024-02-03", tags: ["SEO"], authors: ["https://edav.com.co/sobre-mi/"] });
    expect(meta.authors).toEqual([{ name: "Emmanuel Dávila", url: "https://edav.com.co/sobre-mi/" }]);
  });

  it("canonicalTo: canonical y og:url apuntan a la ruta destino", () => {
    const meta = m.buildMetadata({ route: "classic", locale: "es", title: "Clásico", description: "d", index: false, canonicalTo: { route: "home" } });
    expect(meta.alternates?.canonical).toBe("/");
    expect(meta.openGraph?.url).toBe("/");
  });
});

describe("títulos SEO", () => {
  it("la portada conserva su título absoluto (CNT-01): única excepción al límite de 60 caracteres", () => {
    const title = m.defaultTitle("es");
    expect(title).toBe("Emmanuel Dávila | Desarrollador Full Stack y de automatización");
    // Excepción deliberada: el resto de títulos (content/pages.ts) se comprueban ≤ 60 en ui-pages.test.ts.
    expect(title.length).toBeGreaterThan(60);
  });
});

describe("EN publicado (P9) y estado anterior (P6–P8)", () => {
  it("hoy: página EN indexable, canonical propio, hreflang recíproco y og:locale:alternate", () => {
    const languages = { es: "/sobre-mi/", en: "/en/about/", "x-default": "/sobre-mi/" };
    const en = m.buildMetadata({ route: "about", locale: "en", title: "About", description: "d" });
    expect(en).not.toHaveProperty("robots");
    expect(en.alternates).toEqual({ canonical: "/en/about/", languages });
    expect(en.openGraph).toMatchObject({ url: "/en/about/", locale: "en_US", alternateLocale: ["es_CO"] });
    expect(m.buildMetadata({ route: "about", locale: "es", title: "Sobre mí", description: "d" }).alternates).toEqual({ canonical: "/sobre-mi/", languages });
  });

  it("solo ES publicado (simulado): EN con noindex y sin alternas en ningún idioma", async () => {
    vi.resetModules();
    vi.doMock("@/content/publication", () => ({ publishedLocales: ["es"] }));
    const p8 = await import("@/lib/metadata");
    const en = p8.buildMetadata({ route: "about", locale: "en", title: "About", description: "d" });
    expect(en.robots).toEqual({ index: false, follow: true });
    expect(en.alternates).toEqual({ canonical: "/en/about/" });
    expect(en.openGraph).not.toHaveProperty("alternateLocale");
    expect(p8.buildMetadata({ route: "about", locale: "es", title: "Sobre mí", description: "d" }).alternates).toEqual({ canonical: "/sobre-mi/" });
    vi.doUnmock("@/content/publication");
  });

  it("con EN publicado: hreflang recíproco con x-default = ES y sin noindex", async () => {
    vi.resetModules();
    vi.doMock("@/content/publication", () => ({ publishedLocales: ["es", "en"] }));
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://edav.com.co");
    const p9 = await import("@/lib/metadata");
    vi.unstubAllEnvs();
    const languages = { es: "/blog/como-el-seo-puede-ayudar-a-tu-negocio/", en: "/en/blog/how-seo-can-help-your-business/", "x-default": "/blog/como-el-seo-puede-ayudar-a-tu-negocio/" };
    const slug = { es: "como-el-seo-puede-ayudar-a-tu-negocio", en: "how-seo-can-help-your-business" };
    const es = p9.buildMetadata({ route: "post", params: { slug }, locale: "es", title: "t", description: "d" });
    const en = p9.buildMetadata({ route: "post", params: { slug }, locale: "en", title: "t", description: "d" });
    expect(es.alternates?.languages).toEqual(languages);
    expect(en.alternates?.languages).toEqual(languages);
    expect(en.robots).toBeUndefined();
    expect(en.openGraph).toMatchObject({ alternateLocale: ["es_CO"] });
    vi.doUnmock("@/content/publication");
  });
});

describe("elegibilidad compartida con el sitemap (Codex 8)", () => {
  it("con EN publicado: rutas no indexables, index:false y canonicalTo no emiten alternas", async () => {
    vi.resetModules();
    vi.doMock("@/content/publication", () => ({ publishedLocales: ["es", "en"] }));
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://edav.com.co");
    const p9 = await import("@/lib/metadata");
    const { publicPages } = await import("@/lib/i18n/pages");
    vi.unstubAllEnvs();

    const os = p9.buildMetadata({ route: "os", locale: "en", title: "OS", description: "d" });
    expect(os.robots).toEqual({ index: false, follow: true });
    expect(os.alternates).toEqual({ canonical: "/en/os/" });
    expect(os.openGraph).not.toHaveProperty("alternateLocale");

    const hidden = p9.buildMetadata({ route: "about", locale: "es", title: "t", description: "d", index: false });
    expect(hidden.robots).toEqual({ index: false, follow: true });
    expect(hidden.alternates).toEqual({ canonical: "/sobre-mi/" });

    const classic = p9.buildMetadata({ route: "about", locale: "en", title: "t", description: "d", canonicalTo: { route: "home" } });
    expect(classic.alternates).toEqual({ canonical: "/en/" });
    expect(classic.openGraph).not.toHaveProperty("alternateLocale");

    // El sitemap aplica el mismo criterio: ninguna ruta no indexable.
    expect(publicPages().every(({ ref }) => !["os", "osProject", "classic"].includes(ref.route))).toBe(true);
    vi.doUnmock("@/content/publication");
  });
});
