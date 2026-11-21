"use client";

/**
 * Portada con escritorio opcional (SEO-01 / UX-01 / ARQ-01 / PERF-01).
 *
 * - El contenido de `/` llega como `children` desde un Server Component y se pinta en el
 *   HTML inicial; este componente no decide qué se renderiza en el servidor.
 * - El escritorio (`DesktopShell`) se carga con `next/dynamic` y `ssr: false` solo cuando
 *   el visitante lo pide: su JS no se descarga en `/` si nadie entra al SO.
 * - Sin cookie ni localStorage: el HTML de `/` es siempre el mismo. `?view=retro` (enlace
 *   compartible) abre el escritorio tras hidratar. La preferencia persistente (cookie) y el
 *   selector XP como overlay llegan en la Fase 5, sobre esta misma base.
 */

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { DesktopIcon } from "@/components/desktop/desktop-icons";

const loadDesktop = () => import("@/components/desktop/desktop-shell").then((module) => module.DesktopShell);
const DesktopShell = dynamic(loadDesktop, {
  ssr: false,
  loading: () => <div className="loading-screen os-loading" role="status"><p>Cargando EDAV Desktop 98…</p></div>,
});

type DesktopControls = { open: () => void; preload: () => void };
const DesktopContext = createContext<DesktopControls | null>(null);

const RETRO_PARAM = "retro";

function setViewParam(view: string | null) {
  const url = new URL(window.location.href);
  if (view) url.searchParams.set("view", view); else url.searchParams.delete("view");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function PortfolioExperience({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [skipBoot, setSkipBoot] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const open = useCallback(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setActive(true);
    setViewParam(RETRO_PARAM);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const close = useCallback(() => {
    setActive(false);
    setSkipBoot(true);
    setViewParam(null);
    // Devuelve el foco al botón que abrió el escritorio, ya visible de nuevo.
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  }, []);

  // Enlace profundo `/?view=retro`: se lee solo en el cliente y tras hidratar.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("view") !== RETRO_PARAM) return;
    const timer = window.setTimeout(() => setActive(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const controls: DesktopControls = { open, preload: () => void loadDesktop() };

  return <DesktopContext.Provider value={controls}>
    <div hidden={active}>{children}</div>
    {active && <DesktopShell skipBoot={skipBoot} onSwitchToStandard={close}/>}
  </DesktopContext.Provider>;
}

/** Botón en línea (no flotante: no tapa contenido) que abre el escritorio. */
export function DesktopLaunchButton() {
  const controls = useContext(DesktopContext);
  if (!controls) return null;
  return <button type="button" className="experience-switch" onClick={controls.open} onPointerEnter={controls.preload} onFocus={controls.preload}>
    <DesktopIcon name="terminal"/> Abrir EDAV Desktop 98
  </button>;
}
