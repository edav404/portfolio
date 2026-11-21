"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { format } from "@/content/format";
import type { Locale } from "@/content/types";
import { deriveEvents } from "@/lib/os/events";
import { createDebouncedSaver, loadGeometry, saveGeometry } from "@/lib/os/persistence";
import { createPrefsStore, type Prefs } from "@/lib/os/prefs";
import { intentFromPath } from "@/lib/os/window-url";
import {
  activeId, collectGeometry, persistsGeometry, projectWindowId, requestClose as closePolicy, slugOf,
  type Action, type OsState, type WindowId,
} from "@/lib/os/window-reducer";
import { isMobileWidth } from "@/lib/os/window-geometry";
import { AnnouncerRegion, createAnnouncer } from "./announcer";
import { iconKeyFor } from "./app-meta";
import { captureActivator, createActivatorStore, focusElement, isUsableElement, resolveReturnTarget, type Activator } from "./focus-manager";
import { DesktopSurface } from "./desktop-surface";
import { OsCommandsContext, OsPrefsContext, type OsCommands } from "./os-commands";
import { OsActionsContext, OsDetailsContext, OsStaticContext, type OsActions, type OsStatic } from "./os-context";
import { Taskbar } from "./taskbar";
import type { OsCopy, OsHrefs, OsProjectIndexItem, WelcomeCopy } from "./types";
import { useOsNavigation } from "./use-os-navigation";
import { windowBodyId, windowDomId } from "./window-frame";
import { GuardContext, createGuardStore } from "./window-guard";
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
  | { kind: "return"; id: WindowId; next: WindowId | null; activator?: Activator | null };


/**
 * Núcleo cliente del SO (docs/arquitectura-os.md §2.3). Estado = `useReducer` sobre el reducer puro, con
 * estado inicial derivado de la URL; lo que depende del navegador (viewport, geometría guardada,
 * preferencias, reloj) se aplica solo tras montar. Persiste entre las rutas de `/os/` (layout).
 */
export default function OsShell({ locale, copy, welcome, projects, knownSlugs, hrefs, noscript, children }: Props) {
  const [prefsStore] = useState(() => createPrefsStore(typeof window === "undefined" ? null : undefined));
  const prefs = useSyncExternalStore(prefsStore.subscribe, prefsStore.getSnapshot, prefsStore.getServerSnapshot);
  const [saver] = useState(() => createDebouncedSaver((geometry) => { saveGeometry(geometry); }));
  // Anunciador unico (role="status" montado siempre): cola con deduplicacion y minimo ~1 s entre mensajes.
  const [announcer] = useState(createAnnouncer);
  const setAnnouncement = useCallback((text: string | ((before: string) => string)) => announcer.announce(typeof text === "string" ? text : text("").trim()), [announcer]);
  useEffect(() => () => announcer.dispose(), [announcer]);
  const [guards] = useState(createGuardStore);
  const [activators] = useState(createActivatorStore);
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
      case "return": {
        // Cadena (docs §4): activador -> boton de Inicio (si vino de un menu) -> icono -> siguiente ventana -> escritorio.
        const target = resolveReturnTarget<HTMLElement>([
          request.activator?.el,
          request.activator?.fromMenu ? document.querySelector<HTMLElement>(".xp-start-button") : null,
          document.querySelector<HTMLElement>(`[data-icon="${iconKeyFor(request.id)}"]`),
          request.next ? document.getElementById(windowBodyId(request.next)) : null,
          document.getElementById("os-desktop"),
        ], isUsableElement);
        focusElement(target);
        break;
      }
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
        activators.remember(id, captureActivator());
        const changed = act({ type: "OPEN", id });
        pending.current = { kind: "content", id };
        if (!changed) flushFocus();
      },
      focus(id) { act({ type: "FOCUS", id }); },
      close(id) {
        const inside = hasFocus(id);
        act({ type: "CLOSE", id });
        guards.setDirty(id, false);
        if (inside) pending.current = { kind: "return", id, next: activeId(ref.current), activator: activators.take(id) };
      },
      minimize(id) {
        const inside = hasFocus(id);
        act({ type: "MINIMIZE", id });
        if (inside) pending.current = { kind: "task", id };
      },
      toggleMaximize(id) { act({ type: "TOGGLE_MAXIMIZE", id }); },
      pocketBack() {
        const id = activeId(ref.current);
        if (id !== null && guards.isDirty(id)) { guards.ask(id); return; }
        const inside = id !== null && hasFocus(id);
        act({ type: "POCKET_BACK" });
        if (inside && id !== null) pending.current = { kind: "return", id, next: activeId(ref.current), activator: activators.take(id) };
      },
      // Vía común de cierre (✕, Atrás, Escape, atajo): con borrador pide confirmación en la ventana.
      requestClose(id) {
        const policy = closePolicy(id, { dirty: guards.isDirty(id), pocket: isMobileWidth(window.innerWidth) });
        if (policy.confirm) { guards.ask(id); return; }
        if (policy.action.type === "POCKET_BACK") this.pocketBack();
        else this.close(id);
      },
      move(id, x, y) { act({ type: "MOVE", id, x, y }); },
      resize(id, rect) { act({ type: "RESIZE", id, w: rect.w, h: rect.h, x: rect.x, y: rect.y }); },
      nudge(id, delta) { act({ type: "NUDGE", id, ...delta }); },
      snap(id, to) { act({ type: "SNAP", id, to }); },
      announce(text) { announcer.announce(text); },
    };
  }, [act, ref, flushFocus, pending, guards, activators, announcer]);

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
    const key = "shortcuts" in patch ? (patch.shortcuts ? "shortcutsOn" : "shortcutsOff") : "sound" in patch ? (patch.sound ? "soundOn" : "soundOff") : "screenEffect" in patch ? (patch.screenEffect ? "effectOn" : "effectOff") : null;
    if (key) setAnnouncement(copy.announce[key]);
  }, [prefsStore, copy, setAnnouncement]);

  // Comandos del cromo (menú contextual del escritorio y atajos opt-in): identidad estable salvo idioma.
  const commands = useMemo<OsCommands>(() => {
    const say = actions.announce;
    return {
      resetWindows() { act({ type: "RESET_GEOMETRY" }); say(copy.announce.windowsReset); },
      showDesktop() {
        act({ type: "MINIMIZE_ALL" });
        say(copy.announce.desktopShown);
        document.getElementById("os-desktop")?.focus({ preventScroll: true });
      },
      cycle(dir) {
        if (!act({ type: "CYCLE", dir })) return;
        const id = activeId(ref.current);
        if (id) pending.current = { kind: "content", id };
      },
      closeActive() { const id = activeId(ref.current); if (id) actions.requestClose(id); },
      focusDesktop() { document.getElementById("os-desktop")?.focus({ preventScroll: true }); },
      openSettings() { actions.open("settings"); },
      setPref: onPref,
    };
  }, [act, ref, pending, actions, copy, onPref]);

  const skipToWindow = (event: React.MouseEvent) => {
    event.preventDefault();
    const id = activeId(ref.current) ?? ("welcome" as WindowId);
    (document.getElementById(windowBodyId(id)) ?? document.getElementById("os-desktop"))?.focus({ preventScroll: true });
  };

  return (
    <OsStaticContext.Provider value={staticValue}>
      <OsActionsContext.Provider value={actions}>
       <OsCommandsContext.Provider value={commands}>
        <OsPrefsContext.Provider value={prefs}>
        <OsDetailsContext.Provider value={detailsValue}>
        <GuardContext.Provider value={guards}>
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
            <AnnouncerRegion announcer={announcer}/>
          </div>
        </GuardContext.Provider>
        </OsDetailsContext.Provider>
        </OsPrefsContext.Provider>
       </OsCommandsContext.Provider>
      </OsActionsContext.Provider>
    </OsStaticContext.Provider>
  );
}
