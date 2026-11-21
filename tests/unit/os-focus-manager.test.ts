import { describe, expect, it } from "vitest";
import { createActivatorStore, resolveReturnTarget, shouldReturnFocus } from "@/components/os/focus-manager";

describe("resolveReturnTarget", () => {
  const usable = (name: string) => name !== "gone";

  it("devuelve el primer candidato utilizable, en el orden de la cadena", () => {
    expect(resolveReturnTarget(["activador", "inicio", "icono"], usable)).toBe("activador");
  });

  it("salta ausentes (null/undefined) y candidatos no utilizables", () => {
    expect(resolveReturnTarget([undefined, null, "gone", "icono", "escritorio"], usable)).toBe("icono");
  });

  it("cae al final de la cadena (raiz del escritorio) cuando todo lo anterior falta", () => {
    expect(resolveReturnTarget([null, "gone", undefined, "escritorio"], usable)).toBe("escritorio");
  });

  it("devuelve null si nada sirve", () => {
    expect(resolveReturnTarget([null, "gone"], usable)).toBeNull();
    expect(resolveReturnTarget([], usable)).toBeNull();
  });

  it("no evalua candidatos posteriores al primero valido", () => {
    const seen: string[] = [];
    resolveReturnTarget(["a", "b", "c"], (c) => { seen.push(c); return c === "b"; });
    expect(seen).toEqual(["a", "b"]);
  });
});

describe("shouldReturnFocus (solo si el foco estaba dentro de la ventana que desaparece)", () => {
  const inside = new Set(["boton-de-la-ventana"]);
  const contains = (node: unknown) => inside.has(node as string);

  it("devuelve el foco si el elemento activo esta dentro", () => {
    expect(shouldReturnFocus(contains, "boton-de-la-ventana")).toBe(true);
  });
  it("no lo mueve si el usuario estaba en otra parte", () => {
    expect(shouldReturnFocus(contains, "campo-de-otra-ventana")).toBe(false);
  });
  it("no lo mueve si no hay elemento activo", () => {
    expect(shouldReturnFocus(contains, null)).toBe(false);
    expect(shouldReturnFocus(contains, undefined)).toBe(false);
  });
});

describe("createActivatorStore", () => {
  const el = (name: string) => ({ el: name as unknown as HTMLElement, fromMenu: false });

  it("recuerda el activador por ventana y lo consume una sola vez", () => {
    const store = createActivatorStore();
    store.remember("about", el("icono"));
    expect(store.take("about")).toEqual(el("icono"));
    expect(store.take("about")).toBeNull();
  });

  it("recordar sin activador borra el anterior; las ventanas no se mezclan", () => {
    const store = createActivatorStore();
    store.remember("about", el("a"));
    store.remember("media", el("m"));
    store.remember("about", null);
    expect(store.take("about")).toBeNull();
    expect(store.take("media")).toEqual(el("m"));
  });
});
