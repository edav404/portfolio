"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { format } from "@/content/format";
import type { Locale } from "@/content/types";
import { deriveEvents } from "@/lib/os/events";
import { createDebouncedSaver, loadGeometry, saveGeometry } from "@/lib/os/persistence";
import { createPrefsStore, type Prefs } from "@/lib/os/prefs";
import { intentFromPath } from "@/lib/os/window-url";
import {
  activeId, collectGeometry, persistsGeometry, projectWindowId, slugOf,
  type Action, type OsState, type WindowId,
} from "@/lib/os/window-reducer";
import { iconKeyFor } from "./app-meta";
import { DesktopSurface } from "./desktop-surface";
import { OsActionsContext, OsDetailsContext, OsStaticContext, type OsActions, type OsStatic } from "./os-context";
import { Taskbar } from "./taskbar";
import type { OsCopy, OsHrefs, OsProjectIndexItem, WelcomeCopy } from "./types";
import { useOsNavigation } from "./use-os-navigation";
import { windowBodyId, windowDomId } from "./window-frame";
import { WindowLayer } from "./window-layer";

type Props = {
  locale: Locale;
  copy: OsCopy;
  welcome: WelcomeCopy;
  projects: readonly OsProjectIndexItem[];
  knownSlugs: readonly string[];
  hrefs: OsHrefs;
  /** Banner y respaldo sin JS (el servidor lo construye con el copy localizado). */
  noscript: ReactNode;
  /** Detalle de la ruta actual (la página del slug); `null` en `/os/`. */
  children?: ReactNode;
};

type PendingFocus =
  | { kind: "content"; id: WindowId }
  | { kind: "task"; id: WindowId }
  | { kind: "return"; id: WindowId; next: WindowId | null };


/**
 * Núcleo cliente del SO (docs/arquitectura-os.md §2.3). Estado = `useReducer` sobre el reducer puro, con
 * estado inicial derivado de la URL; lo que depende del navegador (viewport, geometría guardada,
 * preferencias, reloj) se aplica solo tras montar. Persiste entre las rutas de `/os/` (layout).
 */
export default function OsShell({ locale, copy, welcome, projects, knownSlugs, hrefs, noscript, children }: Props) {
  const [prefsStore] = useState(() => createPrefsStore(typeof window === "undefined" ? null : undefined));
  const prefs = useSyncExternalStore(prefsStore.subscribe, prefsStore.getSnapshot, prefsStore.getServerSnapshot);
  const [saver] = useState(() => createDebouncedSaver((geometry) => { saveGeometry(geometry); }));
  const [announcement, setAnnouncement] = useState("");
  const pending = useRef<PendingFocus | null>(null);

  const titleOf = useCallback((id: WindowId): string => {
    const slug = slugOf(id);
    if (slug === null) return copy.apps[id as keyof typeof copy.apps].title;
    return projects.find((project) => project.slug === slug)?.title ?? slug;
  }, [copy, projects]);

  const flushFocus = useCallback(() => {
    const request = pending.current;
    if (!request) return;
    pending.current = null;
    const focus = (el: HTMLElement | null) => { el?.focus({ preventScroll: true }); return el !== null; };
    switch (request.kind) {
      case "content": focus(document.getElementById(windowBodyId(request.id))); break;
      case "task": focus(document.querySelector<HTMLElement>(`[data-task="${request.id}"]`)); break;
      case "return":
        if (focus(document.querySelector<HTMLElement>(`[data-icon="${iconKeyFor(request.id)}"]`))) break;
        if (request.next && focus(document.getElementById(windowBodyId(request.next)))) break;
        focus(document.getElementById("os-desktop"));
        break;
    }
  }, [pending]);

  const onTransition = (prev: OsState, next: OsState, action: Action) => {
    const origin = action.origin ?? "user";
    if (persistsGeometry(action) && origin !== "hydrate") saver.schedule(collectGeometry(next));
    if (origin === "user") {
      for (const event of deriveEvents(prev, next, action)) {
        if (!event.id) continue;
        const key = event.type === "minimized" ? "minimized" : event.type === "maximized" ? "maximized" : event.type === "restored" ? "restored" : event.type === "closed" ? "closed" : null;
        if (key) setAnnouncement((before) => { const text = format(copy.announce[key], { title: titleOf(event.id!) }); return text === before ? `${text} ` : text; });
      }
    }
    // Atrás/Adelante o enlace: el foco va a la ventana de proyecto solo si cambió la selección.
    if (action.type === "ROUTE_CHANGED" && next.selection !== null && next.selection !== prev.selection) {
      pending.current = { kind: "content", id: projectWindowId(next.selection) };
    }
  };

  const { state, act, ref, pathname } = useOsNavigation({ locale, knownSlugs, onTransition });

  useEffect(() => { flushFocus(); }, [state, flushFocus]);

  const actions = useMemo<OsActions>(() => {
    const winEl = (id: WindowId) => document.getElementById(windowDomId(id));
    const hasFocus = (id: WindowId) => winEl(id)?.contains(document.activeElement) === true;
    return {
      open(id) {
        const changed = act({ type: "OPEN", id });
        pending.current = { kind: "content", id };
        if (!changed) flushFocus();
      },
      focus(id) { act({ type: "FOCUS", id }); },
      close(id) {
        const inside = hasFocus(id);
        act({ type: "CLOSE", id });
        if (inside) pending.current = { kind: "return", id, next: activeId(ref.current) };
      },
      minimize(id) {
        const inside = hasFocus(id);
        act({ type: "MINIMIZE", id });
        if (inside) pending.current = { kind: "task", id };
      },
      toggleMaximize(id) { act({ type: "TOGGLE_MAXIMIZE", id }); },
      pocketBack() {
        const id = activeId(ref.current);
        const inside = id !== null && hasFocus(id);
        act({ type: "POCKET_BACK" });
        if (inside && id !== null) pending.current = { kind: "return", id, next: activeId(ref.current) };
      },
    };
  }, [act, ref, flushFocus, pending]);

  // Tras montar: viewport y geometría guardada en UNA transición (HYDRATE), foco del deep link, resize y guardado.
  useEffect(() => {
    const saved = loadGeometry();
    act({ type: "HYDRATE", viewport: { w: window.innerWidth, h: window.innerHeight }, saved, origin: "hydrate" });
    for (const id of Object.keys(ref.current.windows)) {
      if (!(id in saved)) act({ type: "SNAP", id: id as WindowId, to: "default", origin: "hydrate" });
    }
    if (ref.current.selection !== null) {
      pending.current = { kind: "content", id: projectWindowId(ref.current.selection) };
      flushFocus();
    }
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => act({ type: "SET_VIEWPORT", w: window.innerWidth, h: window.innerHeight, origin: "hydrate" }));
    };
    const onHide = () => saver.flush();
    window.addEventListener("resize", onResize);
    window.addEventListener("pagehide", onHide);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pagehide", onHide);
      saver.flush();
    };
  }, [act, ref, saver, pending, flushFocus]);

  // Detalle de proyecto: el de la ruta actual entra ya en el HTML del servidor; se conserva por slug.
  const routeTarget = intentFromPath(pathname, knownSlugs);
  const routeSlug = routeTarget?.kind === "project" ? routeTarget.slug : null;
  const [details, setDetails] = useState<Record<string, ReactNode>>({});
  // Se guarda al recibirlo (ajuste de estado durante el render, con guarda): sobrevive a la navegación.
  if (routeSlug && children && details[routeSlug] !== children) setDetails((before) => ({ ...before, [routeSlug]: children }));
  const detailsValue = useMemo(() => (routeSlug && children ? { ...details, [routeSlug]: children } : details), [details, routeSlug, children]);

  const staticValue = useMemo<OsStatic>(() => ({ locale, copy, welcome, projects, hrefs }), [locale, copy, welcome, projects, hrefs]);

  const onPref = useCallback((patch: Partial<Prefs>) => {
    prefsStore.set(patch);
    const key = "sound" in patch ? (patch.sound ? "soundOn" : "soundOff") : "screenEffect" in patch ? (patch.screenEffect ? "effectOn" : "effectOff") : null;
    if (key) setAnnouncement(copy.announce[key]);
  }, [prefsStore, copy]);

  const skipToWindow = (event: React.MouseEvent) => {
    event.preventDefault();
    const id = activeId(ref.current) ?? ("welcome" as WindowId);
    (document.getElementById(windowBodyId(id)) ?? document.getElementById("os-desktop"))?.focus({ preventScroll: true });
  };

  return (
    <OsStaticContext.Provider value={staticValue}>
      <OsActionsContext.Provider value={actions}>
        <OsDetailsContext.Provider value={detailsValue}>
          <div className={prefs.screenEffect ? "os-root is-crt" : "os-root"} data-theme="xp">
            {noscript}
            <a className="xp-skip-link" href="#os-desktop" onClick={skipToWindow}>{copy.desktop.skipToWindow}</a>
            <main id="os-desktop" tabIndex={-1}>
              <h1 className="sr-only">{copy.heading}</h1>
              <DesktopSurface state={state}/>
              <WindowLayer state={state}/>
            </main>
            <Taskbar state={state} prefs={prefs} onPref={onPref}/>
            <div className="xp-crt" aria-hidden="true"/>
            <div className="xp-visually-hidden" role="status">{announcement}</div>
          </div>
        </OsDetailsContext.Provider>
      </OsActionsContext.Provider>
    </OsStaticContext.Provider>
  );
}
