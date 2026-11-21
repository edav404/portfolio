/**
 * Geometría de ventanas del SO (docs/arquitectura-os.md §2.1). Pura: sin React ni DOM.
 * Todas las funciones devuelven enteros finitos aunque reciban NaN, Infinity o tipos erróneos.
 */

export type Rect = { x: number; y: number; w: number; h: number };
export type Viewport = { w: number; h: number };

export const MIN_W = 320;
export const MIN_H = 220;
/** Altura de la barra de tareas y de título en escritorio (coinciden con los tokens CSS del SO). */
export const TASKBAR_H = 30;
export const TITLEBAR_H = 30;
/** Ancho de la barra de título que debe seguir visible al arrastrar hacia los lados. */
export const VISIBLE_X = 80;
/** Pocket: `@media (max-width: 768px)`. */
export const MOBILE_MAX = 768;
export const DEFAULT_VIEWPORT: Viewport = { w: 1280, h: 720 };
/** Paso de teclado y de los controles de un solo puntero (WCAG 2.5.7). */
export const NUDGE_STEP = 16;
export const NUDGE_STEP_LARGE = 64;
export const CASCADE_STEP = 28;
export const CASCADE_SLOTS = 8;
/** Cota para descartar datos absurdos (persistidos o externos). */
const COORD_LIMIT = 100_000;

const SIZES: Record<string, readonly [number, number]> = {
  welcome: [560, 400],
  projects: [780, 520],
  services: [680, 520],
  about: [680, 520],
  contact: [560, 560],
  media: [520, 420],
  terminal: [640, 400],
  settings: [480, 520],
  project: [760, 580],
};

const finite = (value: unknown, fallback: number): number => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), Math.max(min, max));

export function isViewport(value: unknown): value is Viewport {
  if (typeof value !== "object" || value === null) return false;
  const { w, h } = value as Record<string, unknown>;
  return typeof w === "number" && typeof h === "number" && Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 && w <= COORD_LIMIT && h <= COORD_LIMIT;
}

/** Rect con números finitos, tamaño positivo y cotas razonables. */
export function isRect(value: unknown): value is Rect {
  if (typeof value !== "object" || value === null) return false;
  const { x, y, w, h } = value as Record<string, unknown>;
  return [x, y, w, h].every((n) => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= COORD_LIMIT) && (w as number) > 0 && (h as number) > 0;
}

export function sameRect(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

function safeViewport(viewport: Viewport): Viewport {
  return { w: Math.max(1, Math.round(finite(viewport?.w, DEFAULT_VIEWPORT.w))), h: Math.max(1, Math.round(finite(viewport?.h, DEFAULT_VIEWPORT.h))) };
}

/** Alto útil para ventanas: el viewport sin la barra de tareas. */
export function usableHeight(viewport: Viewport): number {
  return Math.max(1, safeViewport(viewport).h - TASKBAR_H);
}

/** Ajusta una geometría al viewport: tamaño mínimo, barra de título siempre alcanzable. */
export function clampRect(rect: Rect, viewport: Viewport): Rect {
  const vp = safeViewport(viewport);
  const areaH = usableHeight(vp);
  const w = Math.round(Math.min(Math.max(finite(rect.w, MIN_W), MIN_W), vp.w));
  const h = Math.round(Math.min(Math.max(finite(rect.h, MIN_H), MIN_H), areaH));
  const x = Math.round(clamp(finite(rect.x, 0), VISIBLE_X - w, vp.w - VISIBLE_X));
  const y = Math.round(clamp(finite(rect.y, 0), 0, vp.h - TASKBAR_H - TITLEBAR_H));
  return { x, y, w, h };
}

/** Tamaño y posición iniciales; `cascade` desplaza cada ventana nueva (ciclo de 8). */
export function defaultRect(id: string, cascade: number, viewport: Viewport): Rect {
  const vp = safeViewport(viewport);
  const areaH = usableHeight(vp);
  const key = id.startsWith("project:") ? "project" : id;
  const [dw, dh] = SIZES[key] ?? [600, 420];
  const w = Math.min(dw, vp.w - 32);
  const h = Math.min(dh, areaH - 32);
  const slot = ((Math.trunc(finite(cascade, 0)) % CASCADE_SLOTS) + CASCADE_SLOTS) % CASCADE_SLOTS;
  const x = (vp.w - w) / 2 + (slot - 3) * CASCADE_STEP;
  const y = (areaH - h) / 2 + (slot - 3) * CASCADE_STEP;
  return clampRect({ x, y, w, h }, vp);
}

export function moveRect(rect: Rect, x: number, y: number, viewport: Viewport): Rect {
  return clampRect({ ...rect, x: finite(x, rect.x), y: finite(y, rect.y) }, viewport);
}

/** Redimensiona respetando mínimos y el borde derecho e inferior del área útil. `x`/`y` opcionales (tirador izquierdo o superior). */
export function resizeRect(rect: Rect, next: { w: number; h: number; x?: number; y?: number }, viewport: Viewport): Rect {
  const vp = safeViewport(viewport);
  const base = clampRect({ ...rect, x: finite(next.x, rect.x), y: finite(next.y, rect.y) }, vp);
  const w = Math.round(clamp(finite(next.w, rect.w), MIN_W, vp.w - base.x));
  const h = Math.round(clamp(finite(next.h, rect.h), MIN_H, usableHeight(vp) - base.y));
  return { x: base.x, y: base.y, w, h };
}

/** Controles de pasos de un solo puntero: desplaza y cambia el tamaño en una sola operación. */
export function nudgeRect(rect: Rect, delta: { dx: number; dy: number; dw: number; dh: number }, viewport: Viewport): Rect {
  return resizeRect(rect, { w: rect.w + finite(delta.dw, 0), h: rect.h + finite(delta.dh, 0), x: rect.x + finite(delta.dx, 0), y: rect.y + finite(delta.dy, 0) }, viewport);
}

export type SnapTarget = "left" | "right" | "center" | "default";

/** Alternativa sin arrastre: mitad izquierda o derecha, centrar o geometría inicial. */
export function snapRect(to: SnapTarget, viewport: Viewport, current: Rect, id: string): Rect {
  const vp = safeViewport(viewport);
  const areaH = usableHeight(vp);
  const half = Math.floor(vp.w / 2);
  switch (to) {
    case "left": return clampRect({ x: 0, y: 0, w: half, h: areaH }, vp);
    case "right": return clampRect({ x: vp.w - half, y: 0, w: half, h: areaH }, vp);
    case "center": {
      const size = clampRect(current, vp);
      return clampRect({ ...size, x: (vp.w - size.w) / 2, y: (areaH - size.h) / 2 }, vp);
    }
    default: return defaultRect(id, 0, vp);
  }
}

/** Valores listos para `style` (enteros en px): nunca produce NaN ni unidades inválidas. */
export function rectToStyle(rect: Rect): { left: string; top: string; width: string; height: string } {
  const px = (n: number) => `${Math.round(finite(n, 0))}px`;
  return { left: px(rect.x), top: px(rect.y), width: px(Math.max(0, rect.w)), height: px(Math.max(0, rect.h)) };
}

/** Pocket (≤ 768 px) para un ancho dado. El cliente lo refleja con `matchMedia`. */
export function isMobileWidth(width: number): boolean {
  return Number.isFinite(width) && width <= MOBILE_MAX;
}
