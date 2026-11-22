"use client";

import { useEffect, useId, useSyncExternalStore } from "react";
import { getLocalStorage } from "@/lib/os/persistence";
import { useOsStatic } from "./os-context";
import { usePocket } from "./use-pocket";

/** Descarte persistente del globo de primer arranque (clave propia; no mezcla con las preferencias). */
export const BALLOON_KEY = "edav-os:balloon:v1";

function readDismissed(): boolean {
  try { return getLocalStorage()?.getItem(BALLOON_KEY) === "1"; } catch { return false; }
}

// Almacén mínimo: el servidor y la hidratación ven "descartado" (no se pinta); tras montar se lee el valor real.
const listeners = new Set<() => void>();
let dismissedInMemory = false;
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const getSnapshot = () => dismissedInMemory || readDismissed();
const getServerSnapshot = () => true;
/** El globo de primer arranque está en pantalla (la mascota se aparta de su zona). */
export function useBalloonVisible(): boolean {
  return !useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
function dismissBalloon() {
  dismissedInMemory = true;
  try { getLocalStorage()?.setItem(BALLOON_KEY, "1"); } catch { /* bloqueado: se descarta solo en memoria */ }
  for (const listener of [...listeners]) listener();
}

/**
 * Globo de ayuda de primer arranque (UX-11): "Haz clic en un icono para abrirlo". Se decide tras montar
 * (el SSR no lo pinta, así no hay desajuste de hidratación). No es live region (A11Y-07) y no tiene
 * temporizador: se queda hasta que se descarta con el botón, con Esc o al abrir un icono; el descarte
 * persiste.
 */
export function Balloon() {
  const { copy } = useOsStatic();
  const visible = !useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const titleId = useId();
  const pocket = usePocket();


  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => {
      // Esc cierra primero el transitorio superior: si hay un menú o el panel de Inicio abierto, no es para el globo.
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector('.xp-start:not([hidden]), [role="menu"], [data-os-transient]')) return;
      dismissBalloon();
    };
    const onClick = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest(".xp-icon")) dismissBalloon();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="xp-balloon" role="group" aria-labelledby={titleId}>
      <strong id={titleId} className="xp-balloon__title">{copy.desktop.balloonTitle}</strong>
      <span>{pocket ? copy.desktop.balloonTextPocket : copy.desktop.balloonText}</span>
      <button type="button" className="xp-balloon__close" aria-label={copy.desktop.balloonClose} onClick={dismissBalloon}>×</button>
    </div>
  );
}
