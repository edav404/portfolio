/**
 * Geometría pura de la mascota (docs/arquitectura-os.md §5.4b): esquinas, solapamiento con el elemento
 * enfocado (WCAG 2.4.11) y elección de una esquina libre. Sin React ni DOM.
 */
import { CORNERS, type Corner } from "./prefs";

export type Box = { left: number; top: number; right: number; bottom: number };

export function overlaps(a: Box, b: Box): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/** Caja de `size` anclada a una esquina de `area` con `margin` (si no cabe, prima la esquina superior/izquierda). */
export function cornerBox(corner: Corner, area: Box, size: { w: number; h: number }, margin = 0): Box {
  const w = Math.min(size.w, Math.max(0, area.right - area.left - margin * 2));
  const h = Math.min(size.h, Math.max(0, area.bottom - area.top - margin * 2));
  const left = corner.endsWith("left") ? area.left + margin : area.right - margin - w;
  const top = corner.startsWith("top") ? area.top + margin : area.bottom - margin - h;
  return { left, top, right: left + w, bottom: top + h };
}

/** El elemento enfocado queda tapado si la mascota se le superpone (con área > 0). */
export function coversFocus(assistant: Box, focus: Box): boolean {
  return focus.right > focus.left && focus.bottom > focus.top && overlaps(assistant, focus);
}

/**
 * Esquina alternativa donde la mascota NO tapa `focus`, probando primero las que no son la actual
 * (orden fijo: la contigua en horizontal, la contigua en vertical, la opuesta). `null` → colapsar.
 */
export function clearCorner(current: Corner, focus: Box, area: Box, size: { w: number; h: number }, margin = 0): Corner | null {
  const [v, h] = current.split("-") as ["top" | "bottom", "left" | "right"];
  const flipV = v === "top" ? "bottom" : "top";
  const flipH = h === "left" ? "right" : "left";
  const order = [`${v}-${flipH}`, `${flipV}-${h}`, `${flipV}-${flipH}`] as Corner[];
  return order.find((corner) => CORNERS.includes(corner) && !overlaps(cornerBox(corner, area, size, margin), focus)) ?? null;
}
