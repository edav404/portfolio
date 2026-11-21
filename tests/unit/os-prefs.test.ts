import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFS, PREFS_KEY, createPrefsStore, normalizePrefs, parsePrefs, serializePrefs } from "@/lib/os/prefs";
import type { StorageLike } from "@/lib/os/persistence";

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

describe("valores por defecto", () => {
  it("sonido y efecto apagados, Clippy visible, atajos desactivados", () => {
    expect(DEFAULT_PREFS).toEqual({ sound: false, screenEffect: false, assistant: "clippy", assistantCorner: "bottom-right", shortcuts: false });
    expect(Object.isFrozen(DEFAULT_PREFS)).toBe(true);
  });
  it("parsePrefs ante cualquier basura devuelve la MISMA referencia de defaults", () => {
    for (const raw of [null, undefined, "", "{", "[]", "null", '{"v":9,"prefs":{"sound":true}}', '{"v":1}', '{"v":1,"prefs":"x"}', "x".repeat(5000)]) {
      expect(parsePrefs(raw as string)).toBe(DEFAULT_PREFS);
    }
  });
  it("normalizePrefs valida tipos: solo `true` enciende; assistant desconocido → clippy", () => {
    expect(normalizePrefs({ sound: "yes", screenEffect: 1, shortcuts: "true", assistant: "otro" })).toBe(DEFAULT_PREFS);
    expect(normalizePrefs({ sound: true, assistant: "none" })).toEqual({ sound: true, screenEffect: false, assistant: "none", assistantCorner: "bottom-right", shortcuts: false });
    expect(normalizePrefs(null)).toBe(DEFAULT_PREFS);
  });
  it("ida y vuelta", () => {
    const prefs = normalizePrefs({ sound: true, screenEffect: true, assistant: "none", shortcuts: true });
    expect(parsePrefs(serializePrefs(prefs))).toEqual(prefs);
  });
});

describe("createPrefsStore (useSyncExternalStore)", () => {
  it("el snapshot de servidor y el inicial son los defaults, de la misma forma y referencia estable", () => {
    const store = createPrefsStore(memoryStorage({ [PREFS_KEY]: serializePrefs(normalizePrefs({ sound: true })) }));
    expect(store.getServerSnapshot()).toBe(DEFAULT_PREFS);
    expect(store.getSnapshot()).toBe(DEFAULT_PREFS); // antes de suscribirse (hidratación) no lee almacenamiento
    expect(store.getSnapshot()).toBe(store.getSnapshot());
    expect(store.getServerSnapshot()).toBe(store.getServerSnapshot());
    expect(Object.keys(store.getSnapshot())).toEqual(Object.keys(store.getServerSnapshot()));
  });
  it("al suscribirse carga lo guardado y avisa una vez", () => {
    const store = createPrefsStore(memoryStorage({ [PREFS_KEY]: serializePrefs(normalizePrefs({ sound: true, assistant: "none" })) }));
    const listener = vi.fn();
    const off = store.subscribe(listener);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toMatchObject({ sound: true, assistant: "none" });
    const snap = store.getSnapshot();
    expect(store.getSnapshot()).toBe(snap);
    off();
  });
  it("set persiste, notifica solo si hay cambio y conserva la referencia si no", () => {
    const storage = memoryStorage();
    const store = createPrefsStore(storage);
    const listener = vi.fn();
    store.subscribe(listener);
    expect(listener).not.toHaveBeenCalled(); // nada guardado: sigue en defaults
    store.set({ sound: false });
    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(DEFAULT_PREFS);
    store.set({ assistant: "none" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(JSON.parse(storage.data.get(PREFS_KEY)!).prefs.assistant).toBe("none");
    const snap = store.getSnapshot();
    store.set({ assistant: "none" });
    expect(store.getSnapshot()).toBe(snap);
    expect(listener).toHaveBeenCalledTimes(1);
  });
  it("el descarte de Clippy persiste entre sesiones", () => {
    const storage = memoryStorage();
    createPrefsStore(storage).set({ assistant: "none" });
    const next = createPrefsStore(storage);
    next.subscribe(() => {});
    expect(next.getSnapshot().assistant).toBe("none");
  });
  it("reset vuelve a los defaults", () => {
    const store = createPrefsStore(memoryStorage());
    store.set({ sound: true });
    store.reset();
    expect(store.getSnapshot()).toBe(DEFAULT_PREFS);
  });
  it("almacenamiento bloqueado o ausente: funciona en memoria sin lanzar", () => {
    const blocked: StorageLike = {
      getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); }, removeItem: () => { throw new Error("denied"); },
    };
    for (const backend of [blocked, null]) {
      const store = createPrefsStore(backend);
      expect(() => store.subscribe(() => {})).not.toThrow();
      expect(() => store.set({ shortcuts: true })).not.toThrow();
      expect(store.getSnapshot().shortcuts).toBe(true);
    }
  });
  it("datos corruptos guardados → defaults", () => {
    const store = createPrefsStore(memoryStorage({ [PREFS_KEY]: "{corrupto" }));
    store.subscribe(() => {});
    expect(store.getSnapshot()).toBe(DEFAULT_PREFS);
  });
  it("darse de baja deja de avisar", () => {
    const store = createPrefsStore(memoryStorage());
    const listener = vi.fn();
    const off = store.subscribe(listener);
    off();
    store.set({ sound: true });
    expect(listener).not.toHaveBeenCalled();
  });
});
