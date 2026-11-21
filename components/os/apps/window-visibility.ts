"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Contrato de suspensión (docs/arquitectura-os.md §3): una ventana minimizada sigue montada pero no
 * puede consumir recursos. `useWindowHidden(ref)` dice si la ventana que contiene a `ref` NO se ve:
 * minimizada (`hidden` en el marco), oculta por CSS (Pocket) o con la pestaña en segundo plano.
 * Las apps con efectos continuos (sondeo, temporizadores, audio, animaciones) los paran mientras sea
 * `true` y los reanudan al volver a `false`.
 *
 * No depende del marco: observa el atributo `hidden` del `dialog` más cercano y la visibilidad real
 * del nodo (`IntersectionObserver` da `false` con `display: none`).
 */
export function useWindowHidden(ref: RefObject<HTMLElement | null>): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const frame = node.closest<HTMLElement>("[role='dialog'], [role='region']") ?? node.parentElement;
    let attrHidden = frame?.hasAttribute("hidden") ?? false;
    let intersecting = true;
    let tabHidden = document.visibilityState === "hidden";
    const apply = () => setHidden(attrHidden || !intersecting || tabHidden);

    const mutation = frame ? new MutationObserver(() => { attrHidden = frame.hasAttribute("hidden"); apply(); }) : null;
    if (frame) mutation?.observe(frame, { attributes: true, attributeFilter: ["hidden"] });
    const intersection = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => {
      const last = entries[entries.length - 1];
      if (last) { intersecting = last.isIntersecting; apply(); }
    });
    intersection?.observe(node);
    const onVisibility = () => { tabHidden = document.visibilityState === "hidden"; apply(); };
    document.addEventListener("visibilitychange", onVisibility);
    apply();

    return () => {
      mutation?.disconnect();
      intersection?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ref]);

  return hidden;
}

/**
 * `initialFocus: "control"` (registro de apps): mueve el foco al control principal al montar, solo si
 * el foco sigue en el contenido de la ventana o en el documento (si el usuario ya fue a otra parte, no
 * se le roba).
 */
export function useInitialControlFocus(controlRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const control = controlRef.current;
    if (!control) return;
    const active = document.activeElement;
    const windowBody = control.closest(".xp-window__body");
    const stillHere = active === null || active === document.body || (windowBody !== null && windowBody.contains(active));
    if (stillHere) control.focus({ preventScroll: true });
  }, [controlRef]);
}
