import { describe, expect, it } from "vitest";
import { contactHrefForService, OTHER_SERVICE, resolveServiceSlug, serviceLabel, serviceSlugs, services } from "@/content/services";

describe("resolveServiceSlug", () => {
  it.each(services.map((service) => service.slug))("acepta el slug %s", (slug) => {
    expect(resolveServiceSlug(slug)).toBe(slug);
  });

  it.each(services.flatMap((service) => [
    [service.title.es, service.slug],
    [service.title.en, service.slug],
  ]))("acepta el título %s → %s", (title, slug) => {
    expect(resolveServiceSlug(title)).toBe(slug);
  });

  it.each([
    ["WordPress o WooCommerce", "wordpress"],
    ["Diseño web", "diseno-web"],
    ["Automatización", "automatizacion"],
  ])("acepta la etiqueta antigua %s → %s", (label, slug) => {
    expect(resolveServiceSlug(label)).toBe(slug);
  });

  it.each([
    ["DESARROLLO WEB", "desarrollo-web"],
    ["  automatización   de   procesos ", "automatizacion"],
    ["Diseno Web y UX/UI", "diseno-web"],
    ["wordpress & woocommerce", "wordpress"],
    ["SHOPIFY", "shopify"],
  ])("ignora tildes, mayúsculas y espacios: %s → %s", (value, slug) => {
    expect(resolveServiceSlug(value)).toBe(slug);
  });

  it.each(["otro", "Otro", "OTHER"])("%s → otro", (value) => {
    expect(resolveServiceSlug(value)).toBe(OTHER_SERVICE);
  });

  it.each([null, undefined, "", "   ", "seo", "desarrollo", "wordpress-2", "<script>"])("desconocido o vacío (%s) → null", (value) => {
    expect(resolveServiceSlug(value)).toBeNull();
  });

  it("todo lo que devuelve es un slug válido del formulario", () => {
    const inputs = services.flatMap((service) => [service.slug, service.title.es, service.title.en]);
    for (const input of inputs) expect(serviceSlugs).toContain(resolveServiceSlug(input));
  });
});

describe("serviceLabel", () => {
  it("da el título por idioma y el de 'otro'", () => {
    expect(serviceLabel("shopify", "en")).toBe("Shopify");
    expect(serviceLabel("desarrollo-web")).toBe("Desarrollo web");
    expect(serviceLabel(OTHER_SERVICE, "en")).toBe("Other");
    expect(serviceLabel("no-existe")).toBeNull();
  });
});

describe("contactHrefForService", () => {
  it("enlaza al formulario con barra final y el slug como parámetro", () => {
    expect(contactHrefForService("wordpress")).toBe("/contacto/?servicio=wordpress");
  });

  it("codifica el valor", () => {
    expect(contactHrefForService("a b&c")).toBe("/contacto/?servicio=a%20b%26c");
  });

  it("el enlace de cada servicio se resuelve de vuelta a su slug", () => {
    for (const { slug } of services) {
      const param = new URL(contactHrefForService(slug), "https://edav.com.co").searchParams.get("servicio");
      expect(resolveServiceSlug(param)).toBe(slug);
    }
  });
});

describe("integridad de services", () => {
  it("slugs únicos y en formato URL", () => {
    expect(new Set(serviceSlugs).size).toBe(serviceSlugs.length);
    for (const slug of serviceSlugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});
