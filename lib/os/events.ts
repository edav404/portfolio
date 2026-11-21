/**
 * Bus de eventos tipado mínimo y `deriveEvents` (docs/arquitectura-os.md §2.1). Puro: sin React ni DOM.
 * Lo consumen el anunciador, el gestor de foco y (F6) la mascota.
 */
import { activeId, type Action, type OsState, type WindowId } from "./window-reducer";

export type OsEventType = "opened" | "closed" | "minimized" | "restored" | "maximized" | "focused" | "moved" | "resized" | "reset";
export type OsEvent = { type: OsEventType; id: WindowId | null };

/** Eventos observables entre dos estados. Sin cambios (misma referencia) → lista vacía. */
export function deriveEvents(prev: OsState, next: OsState, action: Action): OsEvent[] {
  if (prev === next) return [];
  const events: OsEvent[] = [];
  const touched = new Set<WindowId>();
  const emit = (type: OsEventType, id: WindowId | null) => { events.push({ type, id }); if (id) touched.add(id); };

  const ids = new Set([...(Object.keys(prev.windows) as WindowId[]), ...(Object.keys(next.windows) as WindowId[])]);
  for (const id of ids) {
    const a = prev.windows[id];
    const b = next.windows[id];
    if (!a && b) { emit("opened", id); continue; }
    if (a && !b) { emit("closed", id); continue; }
    if (!a || !b) continue;
    if (!a.minimized && b.minimized) emit("minimized", id);
    else if (a.minimized && !b.minimized) emit("restored", id);
    if (!a.maximized && b.maximized) emit("maximized", id);
    else if (a.maximized && !b.maximized) emit("restored", id);
    if (action.type === "RESET_GEOMETRY") continue;
    if (a.rect !== b.rect) {
      if (a.rect.w !== b.rect.w || a.rect.h !== b.rect.h) events.push({ type: "resized", id });
      else if (a.rect.x !== b.rect.x || a.rect.y !== b.rect.y) events.push({ type: "moved", id });
    }
  }
  if (action.type === "RESET_GEOMETRY") events.push({ type: "reset", id: action.id ?? null });

  const before = activeId(prev);
  const after = activeId(next);
  if (after !== null && after !== before && !touched.has(after)) events.push({ type: "focused", id: after });
  return events;
}

export type Listener<E> = (event: E) => void;
export type EventBus<E> = {
  emit(event: E): void;
  subscribe(listener: Listener<E>): () => void;
  readonly size: number;
};

/** Bus mínimo: un fallo de un oyente no impide avisar al resto. */
export function createEventBus<E>(): EventBus<E> {
  const listeners = new Set<Listener<E>>();
  return {
    emit(event) {
      for (const listener of [...listeners]) {
        try { listener(event); } catch { /* un oyente roto no rompe el SO */ }
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    get size() { return listeners.size; },
  };
}
