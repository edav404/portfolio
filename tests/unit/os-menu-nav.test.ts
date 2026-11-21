import { describe, expect, it } from "vitest";
import { EMPTY_TYPE_AHEAD, foldLabel, isTypeAheadKey, nextIndex, pushTypeAhead, typeAheadIndex } from "@/lib/os/menu-nav";

describe("nextIndex", () => {
  const all = [true, true, true];
  it("avanza y da la vuelta", () => {
    expect(nextIndex(all, 0, "ArrowDown")).toBe(1);
    expect(nextIndex(all, 2, "ArrowDown")).toBe(0);
    expect(nextIndex(all, 0, "ArrowUp")).toBe(2);
  });
  it("sin foco previo: abajo va al primero y arriba al último", () => {
    expect(nextIndex(all, -1, "ArrowDown")).toBe(0);
    expect(nextIndex(all, -1, "ArrowUp")).toBe(2);
  });
  it("salta separadores y deshabilitados", () => {
    const enabled = [true, false, true, false];
    expect(nextIndex(enabled, 0, "ArrowDown")).toBe(2);
    expect(nextIndex(enabled, 2, "ArrowDown")).toBe(0);
    expect(nextIndex(enabled, 0, "ArrowUp")).toBe(2);
    expect(nextIndex(enabled, 0, "Home")).toBe(0);
    expect(nextIndex(enabled, 0, "End")).toBe(2);
    expect(nextIndex([false, true, true], 1, "Home")).toBe(1);
  });
  it("sin elementos habilitados devuelve -1", () => {
    expect(nextIndex([], 0, "ArrowDown")).toBe(-1);
    expect(nextIndex([false, false], -1, "Home")).toBe(-1);
  });
  it("un solo elemento se queda en él", () => {
    expect(nextIndex([true], 0, "ArrowDown")).toBe(0);
    expect(nextIndex([true], 0, "ArrowUp")).toBe(0);
  });
});

describe("type-ahead", () => {
  const labels = ["Restablecer ventanas", "Mostrar escritorio", "Efecto de pantalla", "Propiedades", "Mostrar más"];
  const enabled = labels.map(() => true);

  it("ignora acentos y mayúsculas", () => {
    expect(foldLabel("Árbol")).toBe("arbol");
    expect(typeAheadIndex(["Ñandú", "Éxito"], [true, true], -1, "e")).toBe(1);
  });
  it("una letra recorre las coincidencias a partir de la actual", () => {
    expect(typeAheadIndex(labels, enabled, -1, "m")).toBe(1);
    expect(typeAheadIndex(labels, enabled, 1, "m")).toBe(4);
    expect(typeAheadIndex(labels, enabled, 4, "m")).toBe(1);
  });
  it("la misma letra repetida también recorre", () => {
    expect(typeAheadIndex(labels, enabled, 1, "mm")).toBe(4);
  });
  it("varias letras buscan el prefijo desde el actual (inclusive)", () => {
    expect(typeAheadIndex(labels, enabled, 4, "mostrar m")).toBe(4);
    expect(typeAheadIndex(labels, enabled, -1, "pro")).toBe(3);
  });
  it("sin coincidencia o con elemento deshabilitado", () => {
    expect(typeAheadIndex(labels, enabled, 0, "z")).toBe(-1);
    expect(typeAheadIndex(labels, enabled.map((_, i) => i !== 3), 0, "p")).toBe(-1);
    expect(typeAheadIndex(labels, enabled, 0, "")).toBe(-1);
  });
  it("el buffer se reinicia tras el tiempo de espera", () => {
    const a = pushTypeAhead(EMPTY_TYPE_AHEAD, "P", 1000);
    const b = pushTypeAhead(a, "r", 1200);
    expect(b.text).toBe("pr");
    expect(pushTypeAhead(b, "o", 1200 + 5000).text).toBe("o");
  });
  it("solo los caracteres imprimibles sin modificadores cuentan", () => {
    expect(isTypeAheadKey({ key: "a" })).toBe(true);
    expect(isTypeAheadKey({ key: " " })).toBe(false);
    expect(isTypeAheadKey({ key: "Enter" })).toBe(false);
    expect(isTypeAheadKey({ key: "a", ctrlKey: true })).toBe(false);
    expect(isTypeAheadKey({ key: "a", altKey: true })).toBe(false);
  });
});
