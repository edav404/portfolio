"use client";

import { createPortal } from "react-dom";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

export type ClippyState = "APPEARING" | "IDLE" | "WRITING" | "SEARCHING" | "CONFUSED";

export type ClippyOption = {
  label: string;
  onSelect: () => void;
};

/** Textos del asistente (`ui.os.clippy`), resueltos por el servidor. */
export type ClippyCopy = {
  appearing: string; idle: string; writing: string; searchingBefore: string; searchingAfter: string; confused: string;
  show: string; name: string; closeMessage: string; dragHint: string; hideLabel: string; hide: string;
};

type RetroClippyProps = {
  copy: ClippyCopy;
  state?: ClippyState;
  children?: ReactNode;
  options?: ClippyOption[];
};

function stateCopy(copy: ClippyCopy): Record<ClippyState, ReactNode> {
  return {
    APPEARING: copy.appearing,
    IDLE: copy.idle,
    WRITING: copy.writing,
    SEARCHING: <>{copy.searchingBefore} <kbd>HELP</kbd> {copy.searchingAfter}</>,
    CONFUSED: copy.confused,
  };
}

/** Distancia mínima (px) para que una pulsación cuente como arrastre y no como clic. */
const DRAG_THRESHOLD = 4;
/** Paso de las flechas del teclado (alternativa al arrastre, WCAG 2.5.7). Con Mayús, el triple. */
const KEY_STEP = 16;

/**
 * Arrastre propio con Pointer Events, sin librerías de animación (provisional hasta la Fase 6).
 * La posición vive en una ref y se aplica con `transform`: mover la mascota no re-renderiza React.
 * El desplazamiento se limita al contenedor `.retro-clippy-portal` (la zona útil de la ventana).
 */
function useClippyDrag() {
  const boundsRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLElement | null>(null);
  const offset = useRef({ x: 0, y: 0 });
  const drag = useRef<{ id: number; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  /** Aplica el desplazamiento limitándolo para que la mascota no salga del contenedor. */
  const apply = useCallback((x: number, y: number) => {
    const node = nodeRef.current;
    const bounds = boundsRef.current;
    if (!node || !bounds) return;
    const area = bounds.getBoundingClientRect();
    const rect = node.getBoundingClientRect();
    // Posición del elemento sin desplazamiento (su sitio por CSS).
    const baseLeft = rect.left - offset.current.x;
    const baseTop = rect.top - offset.current.y;
    const clampedX = Math.min(Math.max(x, area.left - baseLeft), area.right - baseLeft - rect.width);
    const clampedY = Math.min(Math.max(y, area.top - baseTop), area.bottom - baseTop - rect.height);
    // Si el elemento no cabe en el área, el límite derecho/inferior prima (su anclaje por CSS).
    offset.current = { x: clampedX, y: clampedY };
    node.style.transform = `translate3d(${offset.current.x}px, ${offset.current.y}px, 0)`;
  }, []);

  // Callback ref: al (re)montar la mascota (p. ej. tras "Ocultar" y "ED?") conserva la posición
  // y vuelve a limitarla si cambia de tamaño (el globo aparece y desaparece) o la ventana.
  const observer = useRef<ResizeObserver | null>(null);
  const setNode = useCallback((node: HTMLElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    nodeRef.current = node;
    if (!node) return;
    apply(offset.current.x, offset.current.y);
    if (typeof ResizeObserver !== "undefined") {
      observer.current = new ResizeObserver(() => apply(offset.current.x, offset.current.y));
      observer.current.observe(node);
    }
  }, [apply]);

  useEffect(() => {
    const onResize = () => apply(offset.current.x, offset.current.y);
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); observer.current?.disconnect(); };
  }, [apply]);

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    // Los botones del globo (cerrar, opciones, "Ocultar") no inician arrastre; el personaje sí.
    const target = event.target as HTMLElement;
    if (target.closest("button:not(.retro-clippy-character)")) return;
    drag.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, originX: offset.current.x, originY: offset.current.y, moved: false };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    // Si se soltó fuera antes de capturar el puntero, no llegó `pointerup`: se cancela el arrastre.
    if ((event.buttons & 1) === 0) {
      drag.current = null;
      return;
    }
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (!current.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      current.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      window.getSelection()?.removeAllRanges();
    }
    apply(current.originX + dx, current.originY + dy);
  };

  const endDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    drag.current = null;
    if (!current.moved) return;
    // Tras arrastrar, el `click` que dispara el navegador no debe abrir el globo.
    // Si ese clic no llega (se soltó fuera), el bloqueo caduca en la siguiente vuelta del bucle.
    suppressClick.current = true;
    window.setTimeout(() => { suppressClick.current = false; }, 0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onClickCapture = (event: ReactMouseEvent<HTMLElement>) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  /** Flechas sobre el personaje: mover sin puntero. */
  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const step = event.shiftKey ? KEY_STEP * 3 : KEY_STEP;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    apply(offset.current.x + move[0], offset.current.y + move[1]);
  };

  return {
    boundsRef,
    setNode,
    onKeyDown,
    handlers: { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag, onClickCapture },
  };
}

export function RetroClippy({ copy, state: forcedState, children, options = [] }: RetroClippyProps) {
  const [mounted, setMounted] = useState(false);
  const [appearing, setAppearing] = useState(true);
  const [formActive, setFormActive] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [assistantVisible, setAssistantVisible] = useState(true);
  const { boundsRef, setNode, onKeyDown, handlers } = useClippyDrag();
  const activeState: ClippyState = appearing ? "APPEARING" : forcedState ?? (formActive ? "WRITING" : "IDLE");

  useEffect(() => {
    const mountTimer = window.setTimeout(() => setMounted(true), 0);
    const appearanceTimer = window.setTimeout(() => setAppearing(false), 1200);
    return () => { window.clearTimeout(mountTimer); window.clearTimeout(appearanceTimer); };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const hideTimer = window.setTimeout(() => setBubbleVisible(false), 0);
    const showTimer = window.setTimeout(() => setBubbleVisible(true), 400);
    return () => { window.clearTimeout(hideTimer); window.clearTimeout(showTimer); };
  }, [activeState, mounted]);

  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => setFormActive(event.target instanceof HTMLElement && Boolean(event.target.closest("form")));
    const onFocusOut = () => window.setTimeout(() => setFormActive(document.activeElement instanceof HTMLElement && Boolean(document.activeElement.closest("form"))), 0);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => { document.removeEventListener("focusin", onFocusIn); document.removeEventListener("focusout", onFocusOut); };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="retro-clippy-portal" data-theme="xp" ref={boundsRef}>
      {!assistantVisible ? <button className="retro-clippy-restore win-outset" type="button" onClick={() => { setAssistantVisible(true); setBubbleVisible(true); }} aria-label={copy.show}>ED?</button> :
        <aside className="retro-clippy" ref={setNode} {...handlers} aria-label={copy.name} data-state={activeState}>
          {bubbleVisible && <div className="retro-clippy-bubble" role="status" aria-live="polite">
            <button className="retro-clippy-close" type="button" onClick={() => setBubbleVisible(false)} aria-label={copy.closeMessage}>×</button>
            <div className="retro-clippy-copy">{children ?? stateCopy(copy)[activeState]}</div>
            {options.length > 0 && <div className="retro-clippy-actions">{options.map((option) => <button className="win-outset" type="button" key={option.label} onClick={option.onSelect}>{option.label}</button>)}</div>}
          </div>}
          <button className="retro-clippy-character" type="button" aria-label={copy.dragHint} onClick={() => setBubbleVisible(true)} onKeyDown={onKeyDown}>
            <span className="retro-clippy-sprite" aria-hidden="true" key={activeState}/>
          </button>
          <button className="retro-clippy-hide win-outset" type="button" onClick={() => setAssistantVisible(false)} aria-label={copy.hideLabel}>{copy.hide}</button>
        </aside>}
    </div>,
    document.body,
  );
}
