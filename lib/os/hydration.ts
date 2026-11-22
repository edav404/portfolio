/**
 * Hidratación diferida del SO (docs/arquitectura-os.md §5.4). Cargar en Pocket (≤ 768 px) no debe recortar
 * la geometría de escritorio con el ancho Pocket: se espera al primer viewport de escritorio y entonces
 * se hidrata UNA vez (HYDRATE con `snapUnsaved`: guardadas y ajuste por defecto en una sola transición).
 * Puro: el shell le pregunta en el montaje y en cada resize.
 */
import { isMobileWidth } from "./window-geometry";

export function createHydrationGate() {
  let done = false;
  return {
    /** `true` exactamente una vez: la primera vez que el ancho no es Pocket. */
    take(width: number): boolean {
      if (done || isMobileWidth(width)) return false;
      done = true;
      return true;
    },
  };
}
