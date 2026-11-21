"use client";

import { useEffect, useRef } from "react";
import { needsFocusRecovery } from "@/lib/os/pocket";
import type { WindowId } from "@/lib/os/window-reducer";
import { isUsableElement } from "./focus-manager";
import { useOsActions } from "./os-context";
import { usePocket } from "./use-pocket";
import { windowBodyId } from "./window-frame";

/**
 * Pocket (≤ 768 px, §5.4): el CSS resuelve el diseño en SSR (lanzador en rejilla = iconos del escritorio;
 * una ventana a pantalla completa); el JS solo gobierna comportamiento tras hidratar.
 *
 * Comportamiento global de Pocket, sin UI propia:
 * - Escape ejecuta la misma vía de cierre que Atrás y ✕ (`requestClose`, con la política de borradores).
 *   Escucha en `window` (burbuja): los transitorios (Inicio, menús, globo, ayuda) ya lo consumieron con
 *   `stopPropagation`/`preventDefault`.
 * - Cruzar el breakpoint con el foco dentro de una ventana cuyo control se oculta (Atrás, menú de
 *   sistema, botón de tarea inactivo) conserva el foco en la ventana activa en vez de perderlo.
 */
export function PocketController({ activeWindow }: { activeWindow: WindowId | null }) {
  const pocket = usePocket();
  const actions = useOsActions();
  const active = useRef(activeWindow);
  const inWindow = useRef(false);
  const before = useRef<boolean | null>(null);
  useEffect(() => { active.current = activeWindow; });

  useEffect(() => {
    if (!pocket) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return;
      const id = active.current;
      if (id === null) return;
      event.preventDefault();
      actions.requestClose(id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pocket, actions]);

  // ¿El foco está dentro de una ventana? Se recuerda mientras no haya otro destino (el navegador suelta el
  // foco de un control oculto sin avisar con `relatedTarget`).
  useEffect(() => {
    const onIn = (event: FocusEvent) => { inWindow.current = event.target instanceof Element && event.target.closest(".xp-window") !== null; };
    const onOut = (event: FocusEvent) => { if (event.relatedTarget !== null) inWindow.current = false; };
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => { document.removeEventListener("focusin", onIn); document.removeEventListener("focusout", onOut); };
  }, []);

  useEffect(() => {
    const crossed = before.current !== null && before.current !== pocket;
    before.current = pocket;
    if (!crossed) return;
    const hadFocusInWindow = inWindow.current;
    const frame = requestAnimationFrame(() => {
      const current = document.activeElement;
      const usable = current instanceof HTMLElement && current !== document.body && isUsableElement(current);
      if (!needsFocusRecovery({ hadFocusInWindow, activeIsUsable: usable })) return;
      const id = active.current;
      const target = id ? document.getElementById(windowBodyId(id)) : document.getElementById("os-desktop");
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [pocket]);

  return null;
}
