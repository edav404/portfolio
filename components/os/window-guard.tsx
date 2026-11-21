"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import type { WindowId } from "@/lib/os/window-reducer";

/**
 * Política común de borradores (docs/arquitectura-os.md §4, "Escape"): una app con cambios sin enviar
 * (Contacto) los declara con `useWindowGuard(dirty)`. Todas las vías de cierre pasan por
 * `actions.requestClose(id)`, que consulta este almacén y, si hay borrador, pide confirmación en línea
 * en la propia app (que pinta el aviso con `useCloseConfirm`) en vez de cerrar.
 */
export type GuardStore = {
  setDirty(id: WindowId, dirty: boolean): void;
  isDirty(id: WindowId): boolean;
  /** Pide confirmación para cerrar `id` (la app muestra el aviso con `useCloseConfirm`). */
  ask(id: WindowId): void;
  dismiss(id: WindowId): void;
  isAsking(id: WindowId): boolean;
  subscribe(listener: () => void): () => void;
};

export function createGuardStore(): GuardStore {
  const dirty = new Set<WindowId>();
  const asking = new Set<WindowId>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  return {
    setDirty(id, value) {
      if (value === dirty.has(id)) return;
      if (value) dirty.add(id); else { dirty.delete(id); asking.delete(id); }
      notify();
    },
    isDirty: (id) => dirty.has(id),
    ask(id) { if (!asking.has(id)) { asking.add(id); notify(); } },
    dismiss(id) { if (asking.delete(id)) notify(); },
    isAsking: (id) => asking.has(id),
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}

export const GuardContext = createContext<GuardStore | null>(null);
/** La ventana a la que pertenece el contenido (la pone `WindowFrame`). */
export const WindowIdContext = createContext<WindowId | null>(null);

/** Id de la ventana que contiene a la app (para que las apps no reciban `id` por prop si no lo necesitan). */
export function useWindowId(): WindowId {
  const id = useContext(WindowIdContext);
  if (!id) throw new Error("useWindowId fuera de WindowFrame");
  return id;
}

/** Declara que la ventana tiene cambios sin enviar mientras `dirty` sea `true`. */
export function useWindowGuard(dirty: boolean): void {
  const store = useContext(GuardContext);
  const id = useContext(WindowIdContext);
  useEffect(() => {
    if (!store || !id) return;
    store.setDirty(id, dirty);
    return () => store.setDirty(id, false);
  }, [store, id, dirty]);
}

/** `true` mientras la ventana `id` espera confirmación de cierre (solo re-renderiza esa ventana). */
export function useCloseConfirm(id: WindowId): { asking: boolean; dismiss: () => void } {
  const store = useContext(GuardContext);
  const asking = useSyncExternalStore(
    (listener) => store?.subscribe(listener) ?? (() => {}),
    () => store?.isAsking(id) ?? false,
    () => false,
  );
  return { asking, dismiss: () => store?.dismiss(id) };
}
