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
import { createPortal } from "react-dom";
import { DesktopIcon } from "@/components/desktop/desktop-icons";
import type { DesktopCopy } from "@/components/desktop/desktop-shell";

const loadDesktop = () => import("@/components/desktop/desktop-shell").then((module) => module.DesktopShell);
const DesktopShell = dynamic(loadDesktop, {
  ssr: false,
  loading: () => <DesktopLoading/>,
});

/** Textos ya resueltos por el servidor: el cliente no importa content/ui.ts. */
export type ExperienceCopy = DesktopCopy & { loading: string; open: string };

type DesktopControls = { open: () => void; preload: () => void; label: string; registerLauncher: (element: HTMLElement | null) => void };
const DesktopContext = createContext<DesktopControls | null>(null);
const LoadingText = createContext("");

/** "Cargando…" dentro del portal: misma raíz temática que el escritorio. */
function DesktopLoading() {
  return <div className="os-loading" data-theme="xp" role="status"><p>{useContext(LoadingText)}</p></div>;
}

const RETRO_PARAM = "retro";

function setViewParam(view: string | null) {
  const url = new URL(window.location.href);
  if (view) url.searchParams.set("view", view); else url.searchParams.delete("view");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function PortfolioExperience({ copy, children }: { copy: ExperienceCopy; children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [skipBoot, setSkipBoot] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  // Botón de apertura de la portada: destino de respaldo cuando el escritorio se abrió por
  // enlace profundo (`?view=retro`) y no hay un elemento previo al que volver.
  const launcherRef = useRef<HTMLElement | null>(null);
  const restoreFocusRef = useRef(false);

  const open = useCallback(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    setActive(true);
    setViewParam(RETRO_PARAM);
  }, []);

  const close = useCallback(() => {
    restoreFocusRef.current = true;
    setActive(false);
    setSkipBoot(true);
    setViewParam(null);
  }, []);

  // Foco de vuelta tras el commit que desmonta el escritorio (determinista, sin rAF): para entonces
  // DesktopShell ya quitó html[data-os-open] en su limpieza y el shell vuelve a ser visible.
  // preventScroll: la página no se movió y el scroll se conserva.
  useEffect(() => {
    if (active || !restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    const target = [returnFocusRef.current, launcherRef.current].find((element) => element?.isConnected);
    target?.focus({ preventScroll: true });
  }, [active]);

  const registerLauncher = useCallback((element: HTMLElement | null) => {
    if (element) launcherRef.current ??= element;
    else launcherRef.current = null;
  }, []);

  // Enlace profundo `/?view=retro`: se lee solo en el cliente y tras hidratar.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("view") !== RETRO_PARAM) return;
    const timer = window.setTimeout(() => setActive(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const controls: DesktopControls = { open, preload: () => void loadDesktop(), label: copy.open, registerLauncher };

  // El escritorio se monta en un portal en <body>, fuera del .theme-root del shell público: así lleva
  // su propio tema (data-theme="xp") sin anidarlo. DesktopShell pone html[data-os-open] al montarse,
  // que oculta el shell y bloquea el scroll del documento sin perder la posición.
  return <DesktopContext.Provider value={controls}><LoadingText.Provider value={copy.loading}>
    {children}
    {active && createPortal(<DesktopShell copy={copy} skipBoot={skipBoot} onSwitchToStandard={close}/>, document.body)}
  </LoadingText.Provider></DesktopContext.Provider>;
}

/** Botón en línea (no flotante: no tapa contenido) que abre el escritorio. */
export function DesktopLaunchButton() {
  const controls = useContext(DesktopContext);
  if (!controls) return null;
  return <button type="button" className="experience-switch" ref={controls.registerLauncher} onClick={controls.open} onPointerEnter={controls.preload} onFocus={controls.preload}>
    <DesktopIcon name="terminal"/> {controls.label}
  </button>;
}
