/**
 * Elegibilidad del arranque decorativo (docs/arquitectura-os.md §5.5, Q11). Sin React ni DOM.
 * El escritorio SIEMPRE se pinta en el servidor sin bloqueo; el arranque es un velo posterior que solo se
 * monta si, tras hidratar, nada de esto lo impide.
 */
import type { StorageLike } from "./persistence";

/** Clave de `sessionStorage`: el arranque se muestra una vez por sesión de pestaña. */
export const BOOT_KEY = "edav-os:boot:v1";
/** Duración total del arranque y de su desvanecimiento final (ms). */
export const BOOT_DURATION_MS = 2000;
export const BOOT_FADE_MS = 240;

export type BootInputs = {
  reducedMotion: boolean;
  /** Hubo puntero, teclado o foco del usuario antes de la comprobación. */
  interacted: boolean;
  /** Viewport Pocket (≤ 768 px): sin arranque. */
  pocket: boolean;
  /** La URL es un deep link a un proyecto. */
  deepLink: boolean;
  /** `sessionStorage` ya marcó el arranque como mostrado. */
  alreadyShown: boolean;
};

export type BootSkipReason = keyof BootInputs;

/** `null` si el arranque debe mostrarse; si no, el primer motivo para omitirlo. */
export function bootSkipReason(inputs: BootInputs): BootSkipReason | null {
  const order: BootSkipReason[] = ["reducedMotion", "deepLink", "pocket", "interacted", "alreadyShown"];
  return order.find((reason) => inputs[reason]) ?? null;
}

/** Progreso 0–100 (lineal con una ligera pausa al final), acotado. */
export function bootProgress(elapsedMs: number, duration: number = BOOT_DURATION_MS): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return Math.min(100, Math.round((elapsedMs / duration) * 100));
}

export function wasBootShown(storage: StorageLike | null): boolean {
  try { return storage?.getItem(BOOT_KEY) === "1"; } catch { return false; }
}

export function markBootShown(storage: StorageLike | null): void {
  try { storage?.setItem(BOOT_KEY, "1"); } catch { /* bloqueado: solo se pierde la memoria de la sesión */ }
}

/** `sessionStorage` o `null` si no existe o su acceso lanza. */
export function getSessionStorage(): StorageLike | null {
  try { return (globalThis as { sessionStorage?: StorageLike }).sessionStorage ?? null; } catch { return null; }
}
