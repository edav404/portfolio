/**
 * Preferencias del SO (docs/arquitectura-os.md §2.1). Sin React ni DOM.
 * Todo apagado por defecto; atajos opt-in; Clippy descartable de forma persistente.
 *
 * Compatible con `useSyncExternalStore`: `getSnapshot` y `getServerSnapshot` devuelven siempre el
 * mismo tipo y referencias estables (el objeto de defaults congelado hasta que algo cambia de verdad).
 */
import { getLocalStorage, type StorageLike } from "./persistence";

export type Assistant = "clippy" | "none";
export type Prefs = {
  readonly sound: boolean;
  readonly screenEffect: boolean;
  readonly assistant: Assistant;
  readonly shortcuts: boolean;
};

export const PREFS_KEY = "edav-os:prefs:v1";
export const PREFS_VERSION = 1;
export const DEFAULT_PREFS: Prefs = Object.freeze({ sound: false, screenEffect: false, assistant: "clippy", shortcuts: false });

export function samePrefs(a: Prefs, b: Prefs): boolean {
  return a.sound === b.sound && a.screenEffect === b.screenEffect && a.assistant === b.assistant && a.shortcuts === b.shortcuts;
}

/** Normaliza un objeto cualquiera a `Prefs` válidas; devuelve `DEFAULT_PREFS` (misma referencia) si coincide. */
export function normalizePrefs(value: unknown): Prefs {
  if (typeof value !== "object" || value === null) return DEFAULT_PREFS;
  const v = value as Record<string, unknown>;
  const next: Prefs = {
    sound: v.sound === true,
    screenEffect: v.screenEffect === true,
    assistant: v.assistant === "none" ? "none" : "clippy",
    shortcuts: v.shortcuts === true,
  };
  return samePrefs(next, DEFAULT_PREFS) ? DEFAULT_PREFS : Object.freeze(next);
}

export function parsePrefs(raw: string | null | undefined): Prefs {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) return DEFAULT_PREFS;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null || (data as { v?: unknown }).v !== PREFS_VERSION) return DEFAULT_PREFS;
    return normalizePrefs((data as { prefs?: unknown }).prefs);
  } catch {
    return DEFAULT_PREFS;
  }
}

export function serializePrefs(prefs: Prefs): string {
  return JSON.stringify({ v: PREFS_VERSION, prefs: { sound: prefs.sound, screenEffect: prefs.screenEffect, assistant: prefs.assistant, shortcuts: prefs.shortcuts } });
}

export type PrefsStore = {
  getSnapshot(): Prefs;
  getServerSnapshot(): Prefs;
  /** Al primer suscriptor (tras hidratar) lee el almacenamiento; escucha el evento `storage` si existe. */
  subscribe(listener: () => void): () => void;
  set(patch: Partial<Prefs>): void;
  reset(): void;
};

export function createPrefsStore(storage: StorageLike | null | undefined = undefined): PrefsStore {
  const backend = storage === undefined ? getLocalStorage() : storage;
  let snapshot: Prefs = DEFAULT_PREFS;
  let loaded = false;
  const listeners = new Set<() => void>();

  const publish = (next: Prefs) => {
    if (samePrefs(next, snapshot)) return;
    snapshot = next;
    for (const listener of [...listeners]) listener();
  };
  const read = (): Prefs => { try { return parsePrefs(backend?.getItem(PREFS_KEY)); } catch { return DEFAULT_PREFS; } };
  const write = () => { try { backend?.setItem(PREFS_KEY, serializePrefs(snapshot)); } catch { /* bloqueado: queda en memoria */ } };
  const onStorage = (event: { key?: string | null }) => { if (event.key === PREFS_KEY || event.key == null) publish(read()); };

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => DEFAULT_PREFS,
    subscribe(listener) {
      listeners.add(listener);
      if (!loaded) { loaded = true; publish(read()); }
      const target = globalThis as unknown as Partial<EventTarget>;
      if (listeners.size === 1) target.addEventListener?.("storage", onStorage as EventListener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) target.removeEventListener?.("storage", onStorage as EventListener);
      };
    },
    set(patch) {
      const next = normalizePrefs({ ...snapshot, ...patch });
      if (samePrefs(next, snapshot)) return;
      publish(next);
      write();
    },
    reset() {
      publish(DEFAULT_PREFS);
      write();
    },
  };
}
