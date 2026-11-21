"use client";

import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { dragRect, resizeByHandle, type ResizeDir } from "@/lib/os/gesture";
import { isMobileWidth, sameRect, type Rect } from "@/lib/os/window-geometry";

/**
 * Arrastre y redimensionado con Pointer Events (docs/arquitectura-os.md §3, PERF-07).
 *
 * Durante el gesto NO hay `dispatch` ni render de React: se escribe en el DOM de UNA ventana, por ref y
 * dentro de un único `requestAnimationFrame` (coalescencia). Mover escribe solo `transform`; redimensionar
 * escribe `left/top/width/height`. Al soltar hay un único commit (`onCommit`). `finish` es idempotente y
 * está enganchada a `pointerup`, `pointercancel`, `lostpointercapture` y Escape: cancela el último rAF,
 * devuelve el estilo en línea a como estaba y solo con `commit` notifica la geometría final.
 */
export type GestureKind = "move" | "resize";
type Reason = "commit" | "cancel";

type Options = {
  frameRef: RefObject<HTMLElement | null>;
  /** Geometría restaurada vigente (se lee al empezar el gesto). */
  rectRef: RefObject<Rect>;
  /** `false` con la ventana maximizada o en Pocket. */
  canStart: () => boolean;
  onCommit: (kind: GestureKind, rect: Rect) => void;
};

type Gesture = { finish: (reason: Reason) => void };

export function usePointerDrag({ frameRef, rectRef, canStart, onCommit }: Options) {
  const active = useRef<Gesture | null>(null);
  const latest = useRef({ canStart, onCommit });
  useEffect(() => { latest.current = { canStart, onCommit }; });
  // Si la ventana desaparece a mitad de gesto, se cancela y se sueltan los oyentes.
  useEffect(() => () => active.current?.finish("cancel"), []);

  const begin = useCallback((event: ReactPointerEvent<HTMLElement>, kind: GestureKind, dir?: ResizeDir) => {
    if (event.button !== 0 || !event.isPrimary) return;
    const frame = frameRef.current;
    const target = event.currentTarget;
    if (!frame || isMobileWidth(window.innerWidth) || !latest.current.canStart()) return;
    active.current?.finish("cancel");

    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const origin: Rect = { ...rectRef.current };
    const viewport = { w: window.innerWidth, h: window.innerHeight };
    const inline = { left: frame.style.left, top: frame.style.top, width: frame.style.width, height: frame.style.height };
    let lastX = startX;
    let lastY = startY;
    let raf = 0;
    let done = false;

    const compute = (): Rect => (kind === "move"
      ? dragRect(origin, lastX - startX, lastY - startY, viewport)
      : resizeByHandle(origin, dir!, lastX - startX, lastY - startY, viewport));

    const write = () => {
      raf = 0;
      const rect = compute();
      if (kind === "move") {
        frame.style.transform = `translate3d(${rect.x - origin.x}px, ${rect.y - origin.y}px, 0)`;
      } else {
        frame.style.left = `${rect.x}px`;
        frame.style.top = `${rect.y}px`;
        frame.style.width = `${rect.w}px`;
        frame.style.height = `${rect.h}px`;
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId || done) return;
      lastX = e.clientX;
      lastY = e.clientY;
      if (raf === 0) raf = requestAnimationFrame(write);
    };
    const onUp = (e: PointerEvent) => { if (e.pointerId === pointerId) finish("commit"); };
    const onCancel = (e: PointerEvent) => { if (e.pointerId === pointerId) finish("cancel"); };
    const onLost = (e: PointerEvent) => { if (e.pointerId === pointerId) finish("cancel"); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      finish("cancel");
    };

    const finish = (reason: Reason) => {
      if (done) return;
      done = true;
      if (raf !== 0) { cancelAnimationFrame(raf); raf = 0; }
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onCancel);
      target.removeEventListener("lostpointercapture", onLost);
      document.removeEventListener("keydown", onKey, true);
      try { if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId); } catch { /* ya liberado */ }
      const final = reason === "commit" ? compute() : origin;
      // Se deja el estilo como lo tenía React ANTES de confirmar: el commit (síncrono, mismo tick) escribe lo nuevo.
      frame.style.transform = "";
      frame.style.willChange = "";
      if (kind === "resize") Object.assign(frame.style, inline);
      delete frame.dataset.interacting;
      if (active.current === gesture) active.current = null;
      if (reason === "commit" && !sameRect(final, origin)) latest.current.onCommit(kind, final);
    };

    const gesture: Gesture = { finish };
    active.current = gesture;
    event.preventDefault();
    try { target.setPointerCapture(pointerId); } catch { /* el puntero ya no existe */ }
    frame.dataset.interacting = "true";
    if (kind === "move") frame.style.willChange = "transform";
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onCancel);
    target.addEventListener("lostpointercapture", onLost);
    document.addEventListener("keydown", onKey, true);
  }, [frameRef, rectRef]);

  const onTitlePointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button, [role=menu]")) return;
    begin(event, "move");
  }, [begin]);

  const onHandlePointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    begin(event, "resize", event.currentTarget.dataset.dir as ResizeDir);
  }, [begin]);

  return { onTitlePointerDown, onHandlePointerDown };
}
