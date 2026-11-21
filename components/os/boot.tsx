"use client";

import { useEffect, useRef, useState } from "react";
import { BOOT_DURATION_MS, BOOT_FADE_MS, bootSkipReason, getSessionStorage, markBootShown, wasBootShown } from "@/lib/os/boot";
import { isMobileWidth } from "@/lib/os/window-geometry";
import { EdavLogo } from "./logo";
import { useOsActions, useOsStatic } from "./os-context";

type Props = {
  /** La URL inicial es un deep link a un proyecto (sin arranque). */
  deepLink: boolean;
  /** Suena solo si el audio está activado y el usuario ya hizo un gesto. */
  onSound: () => void;
};

/** ¿Ya hay foco del usuario dentro del SO (más allá del documento o de la raíz del escritorio)? */
function focusMoved(): boolean {
  const active = document.activeElement;
  return active !== null && active !== document.body && active.id !== "os-desktop";
}

/**
 * Arranque decorativo (docs/arquitectura-os.md §5.5, Q11). El escritorio ya está pintado y es utilizable
 * (SSR sin bloqueo); esto es un velo posterior, `aria-hidden`, sin `inert`, sin foco y con
 * `pointer-events: none`, así que nunca roba el foco ni impide interactuar. Se decide una sola vez tras
 * hidratar: se omite con deep link, `prefers-reduced-motion`, Pocket, foco ya movido o si la sesión ya lo
 * vio. Cualquier clic, tecla o Esc lo salta (sin consumir el evento). Al terminar NO mueve el foco.
 */
export function Boot({ deepLink, onSound }: Props) {
  const { copy } = useOsStatic();
  const actions = useOsActions();
  const [phase, setPhase] = useState<"off" | "on" | "fade">("off");
  const decided = useRef(false);

  // Elegibilidad: una vez, tras montar y pintar (el escritorio ya es utilizable). La guarda va DENTRO del
  // temporizador: el doble efecto de StrictMode cancela el primero y solo decide el segundo.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (decided.current) return;
      decided.current = true;
      const storage = getSessionStorage();
      const reason = bootSkipReason({
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        interacted: focusMoved(),
        pocket: isMobileWidth(window.innerWidth),
        deepLink,
        alreadyShown: wasBootShown(storage),
      });
      markBootShown(storage);
      if (reason === null) { setPhase("on"); onSound(); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [deepLink, onSound]);

  useEffect(() => {
    if (phase === "off") return;
    if (phase === "fade") {
      const done = window.setTimeout(() => { setPhase("off"); actions.announce(copy.announce.started); }, BOOT_FADE_MS);
      return () => window.clearTimeout(done);
    }
    const finish = () => setPhase("fade");
    const timer = window.setTimeout(finish, BOOT_DURATION_MS);
    window.addEventListener("pointerdown", finish, true);
    window.addEventListener("keydown", finish, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", finish, true);
      window.removeEventListener("keydown", finish, true);
    };
  }, [phase, actions, copy]);

  if (phase === "off") return null;
  return (
    <div className="os-boot" data-phase={phase} aria-hidden="true" style={{ "--os-boot-ms": `${BOOT_DURATION_MS}ms`, "--os-boot-fade": `${BOOT_FADE_MS}ms` } as React.CSSProperties}>
      <EdavLogo size={88}/>
      <p className="os-boot__title">{copy.boot.starting}</p>
      <div className="os-boot__bar"><span className="os-boot__fill"/></div>
      <p className="os-boot__hint">{copy.boot.skipHint}</p>
    </div>
  );
}
