"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { clearCorner, coversFocus } from "@/lib/os/assistant";
import { CORNERS, type Corner, type Prefs } from "@/lib/os/prefs";
import { useOsCommands, useOsPrefs } from "./os-commands";
import { useOsActions, useOsStatic } from "./os-context";
import type { OsCopy } from "./types";

/**
 * Mascota del SO (docs/arquitectura-os.md §5.4b). `RetroClippy` entra por `next/dynamic` (su código y el
 * del arrastre NO viajan en el núcleo) y solo se monta tras hidratar y con el hilo libre. Su portal va
 * DENTRO de `.os-root` (capa `--z-os-assistant`), no en `document.body`.
 *
 * - Activada por defecto, descartable de forma persistente (`prefs.assistant`), sin sonidos.
 * - Esquina configurable (`prefs.assistantCorner`); «Cambiar de esquina» es la alternativa sin arrastre.
 * - 2.4.11: ante `focusin` (y al cambiar el diseño) si el elemento enfocado queda bajo ella, se aparta a
 *   otra esquina libre; si ninguna lo está, se colapsa (se vuelve a mostrar desde la bandeja).
 */
const RetroClippy = dynamic(() => import("@/components/desktop/RetroClippy").then((m) => m.RetroClippy), { ssr: false });

// --- Colapso transitorio (no se persiste: no es una decisión del usuario) -------------------------
const listeners = new Set<() => void>();
let collapsed = false;
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function setAssistantCollapsed(value: boolean): void {
  if (collapsed === value) return;
  collapsed = value;
  for (const listener of [...listeners]) listener();
}
export function useAssistantCollapsed(): boolean {
  return useSyncExternalStore(subscribe, () => collapsed, () => false);
}

/** Botón de la bandeja: muestra u oculta (colapsada = oculta; mostrar la restaura). */
export function toggleAssistant(prefs: Prefs, onPref: (patch: Partial<Prefs>) => void): void {
  if (prefs.assistant === "clippy" && !collapsed) { onPref({ assistant: "none" }); return; }
  setAssistantCollapsed(false);
  if (prefs.assistant !== "clippy") onPref({ assistant: "clippy" });
}

export function cornerLabel(corner: Corner, t: OsCopy["settings"]): string {
  return { "top-left": t.cornerTopLeft, "top-right": t.cornerTopRight, "bottom-left": t.cornerBottomLeft, "bottom-right": t.cornerBottomRight }[corner];
}

export function nextCorner(corner: Corner): Corner {
  return CORNERS[(CORNERS.indexOf(corner) + 1) % CORNERS.length];
}


export function Assistant() {
  const { copy } = useOsStatic();
  const prefs = useOsPrefs();
  const commands = useOsCommands();
  const actions = useOsActions();
  const isCollapsed = useAssistantCollapsed();
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  // Esquina elegida por la evasión del foco; vale solo mientras la preferencia no cambie.
  const [auto, setAuto] = useState<{ base: Corner; corner: Corner } | null>(null);
  const corner = auto && auto.base === prefs.assistantCorner ? auto.corner : prefs.assistantCorner;
  const show = prefs.assistant === "clippy" && !isCollapsed;

  // Tras hidratar y con el hilo libre: el chunk de la mascota no compite con el arranque.
  useEffect(() => {
    const idle = (window as typeof window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void });
    if (idle.requestIdleCallback) {
      const id = idle.requestIdleCallback(() => setReady(true), { timeout: 1500 });
      return () => idle.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setReady(true), 600);
    return () => window.clearTimeout(id);
  }, []);

  const cornerRef = useRef(corner);
  const baseRef = useRef(prefs.assistantCorner);
  useEffect(() => { cornerRef.current = corner; baseRef.current = prefs.assistantCorner; });

  // 2.4.11: el elemento enfocado no puede quedar tapado por la mascota.
  useEffect(() => {
    if (!show || !layer) return;
    let frame = 0;
    const check = () => {
      frame = 0;
      const active = document.activeElement;
      const aside = layer.querySelector<HTMLElement>(".retro-clippy");
      const area = layer.querySelector<HTMLElement>(".retro-clippy-portal");
      if (!aside || !area || !(active instanceof HTMLElement) || active === document.body || aside.contains(active)) return;
      const focus = active.getBoundingClientRect();
      const box = aside.getBoundingClientRect();
      if (!coversFocus(box, focus)) return;
      const next = clearCorner(cornerRef.current, focus, area.getBoundingClientRect(), { w: box.width, h: box.height }, 0);
      if (next) setAuto({ base: baseRef.current, corner: next });
      else { setAssistantCollapsed(true); actions.announce(copy.announce.assistantCollapsed); }
    };
    // Temporizador y no rAF: en segundo plano o sin foco de ventana rAF se pausa y la comprobación no correría.
    const schedule = () => { if (!frame) frame = window.setTimeout(check, 50); };
    document.addEventListener("focusin", schedule, true);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    // El globo aparece y desaparece solo: también cambia lo que tapa.
    const observer = new MutationObserver(schedule);
    observer.observe(layer, { childList: true, subtree: true });
    schedule();
    return () => {
      window.clearTimeout(frame);
      document.removeEventListener("focusin", schedule, true);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      observer.disconnect();
    };
  }, [show, layer, corner, actions, copy]);

  const onHide = useCallback(() => commands.setPref({ assistant: "none" }), [commands]);
  const onCorner = useCallback(() => commands.setPref({ assistantCorner: nextCorner(cornerRef.current) }), [commands]);
  const options = [
    { label: copy.clippy.viewProjects, onSelect: () => actions.open("projects") },
    { label: copy.clippy.contact, onSelect: () => actions.open("contact") },
  ];

  return (
    <div className="os-assistant-slot" ref={setLayer} data-corner={corner}>
      {show && ready && layer ? <RetroClippy copy={copy.clippy} container={layer} corner={corner} onHide={onHide} onCorner={onCorner} quiet options={options}/> : null}
    </div>
  );
}

