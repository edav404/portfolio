"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { format } from "@/content/format";
import type { StepKey } from "@/lib/os/gesture";
import type { Rect } from "@/lib/os/window-geometry";
import type { OsCopy } from "./types";

/**
 * Panel de pasos de un solo puntero (docs/arquitectura-os.md §3.1, WCAG 2.5.7): con clics o toques
 * obtiene las mismas posiciones y tamaños que el arrastre, sin teclado ni arrastre. Cada pulsación es
 * un `NUDGE` (lo envía el marco con `onStep`); "x4" alterna el paso grande (64 px). Esc cancela.
 */
type Props = {
  title: string;
  rect: Rect;
  copy: OsCopy["steps"];
  onStep: (key: StepKey, big: boolean) => void;
  onDone: () => void;
  onCancel: () => void;
};

const ARROWS: Record<"up" | "left" | "right" | "down", string> = { up: "↑", left: "←", right: "→", down: "↓" };

export function StepsPanel({ title, rect, copy, onStep, onDone, onCancel }: Props) {
  const titleId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [big, setBig] = useState(false);
  const text = copy;

  useEffect(() => { root.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true }); }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    onCancel();
  };

  const step = (key: StepKey, label: string, content: string, dir?: string) => (
    <button key={key} type="button" className="xp-nudge__btn" data-dir={dir} aria-label={dir ? label : undefined} onClick={() => onStep(key, big)}>
      <span aria-hidden={dir ? true : undefined}>{content}</span>
    </button>
  );

  return (
    <div ref={root} className="xp-nudge" role="group" aria-labelledby={titleId} onKeyDown={onKeyDown}>
      <p id={titleId} className="xp-nudge__title">{format(text.title, { title })}</p>
      <div className="xp-nudge__groups">
        <fieldset className="xp-nudge__group">
          <legend>{text.moveGroup}</legend>
          <div className="xp-nudge__dpad">
            {step("up", text.up, ARROWS.up, "up")}
            {step("left", text.left, ARROWS.left, "left")}
            {step("right", text.right, ARROWS.right, "right")}
            {step("down", text.down, ARROWS.down, "down")}
          </div>
          {/* Fuera de la cruz: así no se solapa con las flechas en ningún idioma. */}
          <button type="button" className="xp-nudge__btn xp-nudge__big" data-dir="step" aria-pressed={big} onClick={() => setBig((value) => !value)}>{text.bigStep}</button>
        </fieldset>
        <fieldset className="xp-nudge__group">
          <legend>{text.sizeGroup}</legend>
          <div className="xp-nudge__row">{step("narrow", text.narrow, text.narrow)}{step("widen", text.widen, text.widen)}</div>
          <div className="xp-nudge__row">{step("shorter", text.shorter, text.shorter)}{step("taller", text.taller, text.taller)}</div>
        </fieldset>
      </div>
      <p className="xp-nudge__status">{format(text.position, { x: rect.x, y: rect.y, w: rect.w, h: rect.h })}</p>
      <div className="xp-nudge__actions">
        <button type="button" className="xp-nudge__btn" onClick={onCancel}>{text.cancel}</button>
        <button type="button" className="xp-nudge__btn" onClick={onDone}>{text.done}</button>
      </div>
    </div>
  );
}
