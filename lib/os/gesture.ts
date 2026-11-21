/**
 * Cálculo puro de gestos de ventana (docs/arquitectura-os.md §3, §3.1): arrastre, redimensionado por
 * tirador y pasos de teclado o de un solo puntero. Sin React ni DOM; la geometría la acota `window-geometry`.
 */
import {
  MIN_H, MIN_W, NUDGE_STEP, NUDGE_STEP_LARGE, moveRect, resizeRect,
  type Rect, type Viewport,
} from "./window-geometry";

export type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
export const RESIZE_DIRS: readonly ResizeDir[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

/** Posición de la ventana tras arrastrar `dx, dy` desde `origin` (barra de título siempre alcanzable). */
export function dragRect(origin: Rect, dx: number, dy: number, viewport: Viewport): Rect {
  return moveRect(origin, origin.x + dx, origin.y + dy, viewport);
}

/**
 * Geometría tras arrastrar un tirador `dir` desde `origin`. El borde opuesto al tirador no se mueve:
 * al llegar al mínimo, el borde arrastrado deja de avanzar (no empuja la ventana).
 */
export function resizeByHandle(origin: Rect, dir: ResizeDir, dx: number, dy: number, viewport: Viewport): Rect {
  const right = origin.x + origin.w;
  const bottom = origin.y + origin.h;
  let { x, y, w, h } = origin;
  if (dir.includes("e")) w = origin.w + dx;
  if (dir.includes("s")) h = origin.h + dy;
  if (dir.includes("w")) {
    // El borde izquierdo no sale de la pantalla (salvo que ya estuviera fuera) ni deja la ventana bajo el mínimo.
    x = Math.max(Math.min(0, origin.x), Math.max(right - viewport.w, Math.min(origin.x + dx, right - MIN_W)));
    w = right - x;
  }
  if (dir.includes("n")) {
    y = Math.max(0, Math.min(origin.y + dy, bottom - MIN_H));
    h = bottom - y;
  }
  return resizeRect(origin, { x, y, w, h }, viewport);
}

export type StepKey = "left" | "right" | "up" | "down" | "widen" | "narrow" | "taller" | "shorter";
export type StepDelta = { dx: number; dy: number; dw: number; dh: number };

/** Desplazamiento o cambio de tamaño de un paso (16 px; 64 px con paso grande). */
export function stepDelta(key: StepKey, big = false): StepDelta {
  const s = big ? NUDGE_STEP_LARGE : NUDGE_STEP;
  switch (key) {
    case "left": return { dx: -s, dy: 0, dw: 0, dh: 0 };
    case "right": return { dx: s, dy: 0, dw: 0, dh: 0 };
    case "up": return { dx: 0, dy: -s, dw: 0, dh: 0 };
    case "down": return { dx: 0, dy: s, dw: 0, dh: 0 };
    case "widen": return { dx: 0, dy: 0, dw: s, dh: 0 };
    case "narrow": return { dx: 0, dy: 0, dw: -s, dh: 0 };
    case "taller": return { dx: 0, dy: 0, dw: 0, dh: s };
    case "shorter": return { dx: 0, dy: 0, dw: 0, dh: -s };
  }
}

export type KeyboardMode = "move" | "size";

/** Paso que corresponde a una flecha en el modo Mover o Tamaño; `null` si la tecla no es una flecha. */
export function keyToStep(key: string, mode: KeyboardMode): StepKey | null {
  switch (key) {
    case "ArrowLeft": return mode === "move" ? "left" : "narrow";
    case "ArrowRight": return mode === "move" ? "right" : "widen";
    case "ArrowUp": return mode === "move" ? "up" : "shorter";
    case "ArrowDown": return mode === "move" ? "down" : "taller";
    default: return null;
  }
}
