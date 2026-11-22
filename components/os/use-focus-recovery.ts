"use client";

import { useEffect, useRef } from "react";
import { isMobileWidth } from "@/lib/os/window-geometry";
import { activeId, type OsState, type WindowId } from "@/lib/os/window-reducer";
import { iconKeyFor } from "./app-meta";
import { recoverLostFocus } from "./focus-manager";
import { windowBodyId, windowDomId } from "./window-frame";

const WINDOW_PREFIX = "win-"; // ver `windowDomId`

/**
 * Si la ventana que tenía el foco desaparece del DOM (p. ej. Atrás del navegador hacia `/os/` desmonta la
 * ventana de proyecto) el foco cae a BODY. Tras ese commit, y solo si nadie más lo reclamó, lo lleva al
 * icono de esa app (en Pocket, a la ventana inferior de la pila), a la ventana activa o al escritorio.
 */
export function useFocusRecovery(state: OsState): void {
  const lastWindow = useRef<string | null>(null);

  useEffect(() => {
    const onIn = (event: FocusEvent) => {
      const frame = event.target instanceof Element ? event.target.closest<HTMLElement>(".xp-window") : null;
      lastWindow.current = frame && frame.id.startsWith(WINDOW_PREFIX) ? frame.id.slice(WINDOW_PREFIX.length) : null;
    };
    document.addEventListener("focusin", onIn);
    return () => document.removeEventListener("focusin", onIn);
  }, []);

  useEffect(() => {
    const lost = lastWindow.current;
    if (lost === null || document.getElementById(windowDomId(lost as WindowId)) !== null) return;
    lastWindow.current = null;
    const next = activeId(state);
    const nextBody = next ? document.getElementById(windowBodyId(next)) : null;
    const icon = document.querySelector<HTMLElement>(`[data-icon="${iconKeyFor(lost as WindowId)}"]`);
    const pocketStack = nextBody !== null && isMobileWidth(window.innerWidth);
    recoverLostFocus([pocketStack ? nextBody : icon, nextBody, document.getElementById("os-desktop")]);
  }, [state]);
}
