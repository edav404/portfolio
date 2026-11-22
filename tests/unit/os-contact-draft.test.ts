import { afterEach, describe, expect, it } from "vitest";
import { clearSent, isContactDirty } from "@/lib/os/contact-submit";
import { setContactPrefill, subscribeContactPrefill, takeContactPrefill } from "@/components/os/apps/contact-prefill";

const draft = { name: "Ana", email: "a@b.co", service: "web", message: "Hola, necesito una web" };

describe("borrador de Contacto", () => {
  it("el servicio preseleccionado no es un borrador; el texto sí", () => {
    expect(isContactDirty({ name: "", email: "", service: "web", message: "" })).toBe(false);
    expect(isContactDirty({ name: "", email: "", service: "", message: "x" })).toBe(true);
  });

  it("tras un envío exitoso solo se limpia lo enviado y lo escrito después sobrevive y vuelve a ser borrador", () => {
    const sent = { ...draft };
    const typedMeanwhile = { ...draft, message: `${draft.message} y más` };
    const after = clearSent(typedMeanwhile, sent);
    expect(after).toEqual({ name: "", email: "", service: "web", message: typedMeanwhile.message });
    expect(isContactDirty(after)).toBe(true);
    expect(isContactDirty(clearSent(draft, sent))).toBe(false);
  });
});

describe("prefill de Contacto", () => {
  afterEach(() => { takeContactPrefill(); });

  it("se consume una sola vez y no sobrevive al descarte", () => {
    setContactPrefill("web");
    expect(takeContactPrefill()).toEqual({ service: "web" });
    expect(takeContactPrefill()).toBeNull();
  });

  it("avisa a Contacto ya montada, que lo consume al instante", () => {
    let got: unknown = "nada";
    const off = subscribeContactPrefill(() => { got = takeContactPrefill(); });
    setContactPrefill("seo");
    off();
    expect(got).toEqual({ service: "seo" });
    expect(takeContactPrefill()).toBeNull();
  });
});
