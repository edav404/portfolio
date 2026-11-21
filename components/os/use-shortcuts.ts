"use client";

import { useEffect, useRef } from "react";
import { matchShortcut, type ShortcutId } from "@/lib/os/shortcuts";

export type ShortcutHandlers = Record<ShortcutId, () => void>;

/**
 * Atajos globales opt-in (§4, Q4). El filtro es `matchShortcut` (puro y testeado): Alt+Shift con
 * `event.code`, fuera de campos editables, sin IME ni repeticiones. Solo escucha mientras `enabled`
 * (preferencia activada) y mientras el SO está montado.
 */
export function useShortcuts(enabled: boolean, handlers: ShortcutHandlers) {
  const latest = useRef(handlers);
  useEffect(() => { latest.current = handlers; });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const id = matchShortcut(event, event.target as HTMLElement | null, true);
      if (!id) return;
      event.preventDefault();
      latest.current[id]();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}

type KeyboardWithLayout = { getLayoutMap?: () => Promise<ReadonlyMap<string, string>> };

/** Lo que imprime cada tecla física en la distribución actual (`navigator.keyboard`), si el navegador lo ofrece. */
export function readLayoutMap(): Promise<ReadonlyMap<string, string> | null> {
  const keyboard = (typeof navigator === "undefined" ? undefined : (navigator as Navigator & { keyboard?: KeyboardWithLayout }).keyboard);
  if (!keyboard?.getLayoutMap) return Promise.resolve(null);
  return keyboard.getLayoutMap().catch(() => null);
}
