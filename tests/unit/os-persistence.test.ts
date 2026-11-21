import { describe, expect, it, vi } from "vitest";
import {
  GEOMETRY_KEY, MAX_RAW_LENGTH, MAX_SAVED, clearGeometry, createDebouncedSaver, getLocalStorage, loadGeometry, parseGeometry, saveGeometry,
  serializeGeometry, type StorageLike,
} from "@/lib/os/persistence";

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}
const blocked: StorageLike = {
  getItem: () => { throw new Error("SecurityError"); },
  setItem: () => { throw new Error("QuotaExceededError"); },
  removeItem: () => { throw new Error("SecurityError"); },
};

describe("serialize / parse", () => {
  it("ida y vuelta conserva las ventanas válidas", () => {
    const geometry = { welcome: { x: 1, y: 2, w: 400, h: 300 }, "project:a": { x: 5, y: 6, w: 500, h: 350, maximized: true } } as const;
    expect(parseGeometry(serializeGeometry(geometry))).toEqual(geometry);
  });
  it("incluye versión y no guarda ids ni rects inválidos", () => {
    const raw = serializeGeometry({ welcome: { x: 0, y: 0, w: 300, h: 300 }, nope: { x: 0, y: 0, w: 1, h: 1 }, about: { x: Number.NaN, y: 0, w: 1, h: 1 } } as never);
    expect(JSON.parse(raw)).toMatchObject({ v: 1 });
    expect(Object.keys(parseGeometry(raw))).toEqual(["welcome"]);
  });
  it("JSON inválido, versión distinta, forma errónea o vacío → {}", () => {
    for (const raw of [null, undefined, "", "{", "no es json", "null", "[]", "123", '{"v":2,"windows":{}}', '{"v":1}', '{"v":1,"windows":[1]}', '{"v":1,"windows":"x"}']) {
      expect(parseGeometry(raw as string)).toEqual({});
    }
  });
  it("descarta entradas corruptas pero conserva las buenas", () => {
    const raw = JSON.stringify({ v: 1, windows: { welcome: { x: 1, y: 1, w: 400, h: 300 }, about: { x: "1" }, contact: 5, media: null, desconocida: { x: 1, y: 1, w: 9, h: 9 } } });
    expect(Object.keys(parseGeometry(raw))).toEqual(["welcome"]);
  });
  it("el tamaño está acotado", () => {
    expect(parseGeometry(`{"v":1,"windows":{},"pad":"${"x".repeat(MAX_RAW_LENGTH)}"}`)).toEqual({});
    const many = Object.fromEntries(Array.from({ length: MAX_SAVED + 30 }, (_, i) => [`project:p${i}`, { x: 0, y: 0, w: 400, h: 300 }]));
    expect(Object.keys(parseGeometry(JSON.stringify({ v: 1, windows: many })))).toHaveLength(MAX_SAVED);
    expect(Object.keys(JSON.parse(serializeGeometry(many as never)).windows)).toHaveLength(MAX_SAVED);
  });
});

describe("almacenamiento", () => {
  it("guarda y carga", () => {
    const storage = memoryStorage();
    expect(saveGeometry({ welcome: { x: 1, y: 1, w: 400, h: 300 } }, storage)).toBe(true);
    expect(storage.data.has(GEOMETRY_KEY)).toBe(true);
    expect(loadGeometry(storage)).toEqual({ welcome: { x: 1, y: 1, w: 400, h: 300 } });
    clearGeometry(storage);
    expect(loadGeometry(storage)).toEqual({});
  });
  it("datos corruptos en el almacenamiento → valores por defecto", () => {
    expect(loadGeometry(memoryStorage({ [GEOMETRY_KEY]: "{corrupto" }))).toEqual({});
  });
  it("almacenamiento bloqueado o ausente: nunca lanza", () => {
    expect(loadGeometry(blocked)).toEqual({});
    expect(saveGeometry({ welcome: { x: 1, y: 1, w: 400, h: 300 } }, blocked)).toBe(false);
    expect(() => clearGeometry(blocked)).not.toThrow();
    expect(loadGeometry(null)).toEqual({});
    expect(saveGeometry({}, null)).toBe(false);
  });
  it("getLocalStorage devuelve null si acceder lanza o no existe (entorno Node)", () => {
    expect(getLocalStorage()).toBeNull();
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", { get() { throw new Error("denied"); }, configurable: true });
    try { expect(getLocalStorage()).toBeNull(); }
    finally { if (original) Object.defineProperty(globalThis, "localStorage", original); else delete (globalThis as { localStorage?: unknown }).localStorage; }
  });
});

describe("createDebouncedSaver", () => {
  it("agrupa las llamadas y guarda la última", () => {
    vi.useFakeTimers();
    try {
      const save = vi.fn();
      const saver = createDebouncedSaver(save, 100);
      saver.schedule({ welcome: { x: 1, y: 1, w: 400, h: 300 } });
      saver.schedule({ welcome: { x: 2, y: 2, w: 400, h: 300 } });
      vi.advanceTimersByTime(99);
      expect(save).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith({ welcome: { x: 2, y: 2, w: 400, h: 300 } });
    } finally { vi.useRealTimers(); }
  });
  it("flush guarda ya, cancel descarta y un fallo no lanza", () => {
    vi.useFakeTimers();
    try {
      const save = vi.fn();
      const saver = createDebouncedSaver(save, 100);
      saver.schedule({});
      saver.flush();
      expect(save).toHaveBeenCalledTimes(1);
      saver.flush();
      expect(save).toHaveBeenCalledTimes(1);
      saver.schedule({});
      saver.cancel();
      vi.advanceTimersByTime(500);
      expect(save).toHaveBeenCalledTimes(1);
      const failing = createDebouncedSaver(() => { throw new Error("boom"); }, 10);
      failing.schedule({});
      expect(() => vi.advanceTimersByTime(10)).not.toThrow();
    } finally { vi.useRealTimers(); }
  });
});
