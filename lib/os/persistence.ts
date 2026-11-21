/**
 * Persistencia de la geometría de ventanas (docs/arquitectura-os.md §2.1, §12.5).
 * localStorage con versión; tolera almacenamiento bloqueado (Safari privado) o corrupto: ante
 * cualquier error se usan los valores por defecto y nunca se lanza. Solo se lee tras hidratar.
 */
import { isRect } from "./window-geometry";
import { isWindowId, type SavedGeometry, type WindowId } from "./window-reducer";

export const GEOMETRY_KEY = "edav-os:v1";
export const GEOMETRY_VERSION = 1;
/** Tamaño máximo aceptado al leer (caracteres) y número máximo de ventanas guardadas. */
export const MAX_RAW_LENGTH = 16_384;
export const MAX_SAVED = 64;

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type GeometryMap = Partial<Record<WindowId, SavedGeometry>>;

/** `localStorage` o `null` si no existe o su acceso lanza. */
export function getLocalStorage(): StorageLike | null {
  try {
    const storage = (globalThis as { localStorage?: StorageLike }).localStorage;
    return storage ?? null;
  } catch {
    return null;
  }
}

export function serializeGeometry(geometry: GeometryMap): string {
  const windows: Record<string, SavedGeometry> = {};
  let count = 0;
  for (const [id, value] of Object.entries(geometry)) {
    if (!isWindowId(id) || !isRect(value) || count >= MAX_SAVED) continue;
    windows[id] = { x: value.x, y: value.y, w: value.w, h: value.h, ...(value.maximized === true ? { maximized: true } : {}) };
    count++;
  }
  return JSON.stringify({ v: GEOMETRY_VERSION, windows });
}

/** Lee geometría de un texto. Versión distinta, JSON inválido, demasiado grande o forma errónea → `{}`. */
export function parseGeometry(raw: string | null | undefined): GeometryMap {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_RAW_LENGTH) return {};
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return {}; }
  if (typeof data !== "object" || data === null || (data as { v?: unknown }).v !== GEOMETRY_VERSION) return {};
  const windows = (data as { windows?: unknown }).windows;
  if (typeof windows !== "object" || windows === null || Array.isArray(windows)) return {};
  const result: GeometryMap = {};
  let count = 0;
  for (const [id, value] of Object.entries(windows)) {
    if (count >= MAX_SAVED) break;
    if (!isWindowId(id) || !isRect(value)) continue;
    const v = value as SavedGeometry;
    result[id] = { x: v.x, y: v.y, w: v.w, h: v.h, ...(v.maximized === true ? { maximized: true } : {}) };
    count++;
  }
  return result;
}

export function loadGeometry(storage: StorageLike | null = getLocalStorage()): GeometryMap {
  if (!storage) return {};
  try { return parseGeometry(storage.getItem(GEOMETRY_KEY)); } catch { return {}; }
}

/** `true` si se guardó; `false` si el almacenamiento falla o está bloqueado. */
export function saveGeometry(geometry: GeometryMap, storage: StorageLike | null = getLocalStorage()): boolean {
  if (!storage) return false;
  try { storage.setItem(GEOMETRY_KEY, serializeGeometry(geometry)); return true; } catch { return false; }
}

export function clearGeometry(storage: StorageLike | null = getLocalStorage()): void {
  try { storage?.removeItem(GEOMETRY_KEY); } catch { /* bloqueado */ }
}

export type Timers = {
  set: (fn: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
};

const defaultTimers: Timers = { set: (fn, ms) => setTimeout(fn, ms), clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>) };

/** Guardado con debounce: `schedule` pospone, `flush` guarda ya lo pendiente, `cancel` lo descarta. */
export function createDebouncedSaver(save: (geometry: GeometryMap) => void, delay = 400, timers: Timers = defaultTimers) {
  let handle: unknown = null;
  let pending: GeometryMap | null = null;
  const run = () => {
    handle = null;
    const value = pending;
    pending = null;
    if (value) { try { save(value); } catch { /* nunca lanza */ } }
  };
  return {
    schedule(geometry: GeometryMap) {
      pending = geometry;
      if (handle !== null) timers.clear(handle);
      handle = timers.set(run, delay);
    },
    flush() {
      if (handle !== null) { timers.clear(handle); }
      run();
    },
    cancel() {
      if (handle !== null) timers.clear(handle);
      handle = null;
      pending = null;
    },
  };
}
