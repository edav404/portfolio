"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { keyToStep, stepDelta, type KeyboardMode, type StepKey } from "@/lib/os/gesture";
import { TITLEBAR_H, VISIBLE_X, type Rect } from "@/lib/os/window-geometry";
import { slugOf, type AppId, type WindowId, type WindowState } from "@/lib/os/window-reducer";
import { format } from "@/content/format";
import { iconFor } from "./app-meta";
import ProjectWindow from "./apps/project-window";
import { DEFERRED_APPS } from "./apps/registry";
import Welcome from "./apps/welcome";
import { OsGlyph, XpIcon } from "./icons";
import { useOsActions, useOsStatic } from "./os-context";
import { StepsPanel } from "./steps-panel";
import { SystemMenu, type SystemAction, type SystemMenuHandle } from "./system-menu";
import { usePointerDrag } from "./use-pointer-drag";
import { WindowIdContext } from "./window-guard";

export const windowDomId = (id: WindowId) => `win-${id}`;
export const windowBodyId = (id: WindowId) => `win-${id}-body`;
const DIRS = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;

/**
 * Geometría SSR-segura (DS7): las medidas del estado se acotan con CSS (`min()`), así que una ventana
 * calculada para el viewport por defecto nunca se sale del área en el HTML del servidor.
 */
function geometryStyle(win: WindowState, z: number): CSSProperties {
  const { x, y, w, h } = win.rect;
  return {
    left: `min(${x}px, calc(100% - ${VISIBLE_X}px))`,
    top: `min(${y}px, calc(100% - ${TITLEBAR_H}px))`,
    width: `min(${w}px, 100%)`,
    height: `min(${h}px, 100%)`,
    zIndex: z,
  };
}

function WindowContent({ id }: { id: WindowId }) {
  const slug = slugOf(id);
  if (slug !== null) return <ProjectWindow slug={slug}/>;
  if (id === "welcome") return <Welcome/>;
  const App = DEFERRED_APPS[id as Exclude<AppId, "welcome">];
  return <App id={id as AppId}/>;
}

type Props = { win: WindowState; z: number; active: boolean; title: string };
type Mode = KeyboardMode | "steps";

/**
 * Cromo de una ventana Luna (`dialog` no modal). Minimizar la deja montada y `hidden`.
 * Arrastre y redimensionado: `usePointerDrag` (sin render durante el gesto, un commit al soltar). Sin
 * arrastre: menú de sistema, modo Mover/Tamaño por teclado y panel de pasos (WCAG 2.5.7).
 */
export const WindowFrame = memo(function WindowFrame({ win, z, active, title }: Props) {
  const { copy } = useOsStatic();
  const actions = useOsActions();
  const { id } = win;
  const label = (action: string) => format(copy.window.actionOn, { action, title });
  const titleId = `${windowDomId(id)}-title`;
  const frameRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<SystemMenuHandle>(null);
  const rectRef = useRef<Rect>(win.rect);
  const maximizedRef = useRef(win.maximized);
  const origin = useRef<Rect>(win.rect);
  const [mode, setMode] = useState<Mode | null>(null);

  useLayoutEffect(() => {
    rectRef.current = win.rect;
    maximizedRef.current = win.maximized;
    // Red de seguridad: tras un commit no puede quedar un `transform` del gesto.
    frameRef.current?.style.removeProperty("transform");
  }, [win.rect, win.maximized]);

  const drag = usePointerDrag({
    frameRef,
    rectRef,
    canStart: useCallback(() => !maximizedRef.current, []),
    onCommit: useCallback((kind, rect) => {
      if (kind === "move") actions.move(id, rect.x, rect.y);
      else actions.resize(id, rect);
    }, [actions, id]),
  });

  const endMode = (reason: "confirm" | "cancel") => {
    if (mode === null) return;
    if (reason === "cancel") {
      actions.resize(id, origin.current);
      actions.announce(copy.announce.moveCancel);
    } else {
      const { x, y, w, h } = win.rect;
      actions.announce(mode === "move" ? format(copy.announce.moveEnd, { title }) : format(copy.steps.position, { x, y, w, h }));
    }
    setMode(null);
    menuRef.current?.focusButton();
  };

  const startMode = (next: Mode) => {
    origin.current = win.rect;
    setMode(next);
    if (next !== "steps") actions.announce(format(next === "move" ? copy.steps.keyboardMove : copy.steps.keyboardSize, { title }));
  };

  // Maximizar o minimizar durante el modo lo termina (la geometría restaurada deja de ser editable).
  if (mode !== null && (win.maximized || win.minimized)) setMode(null);

  // Panel de pasos: un solo anuncio agrupado tras la última pulsación.
  useEffect(() => {
    if (mode !== "steps" || win.rect === origin.current) return;
    const { x, y, w, h } = win.rect;
    const timer = setTimeout(() => actions.announce(format(copy.steps.position, { x, y, w, h })), 600);
    return () => clearTimeout(timer);
  }, [mode, win.rect, actions, copy]);

  const onStep = (key: StepKey, big: boolean) => actions.nudge(id, stepDelta(key, big));

  // En captura: el modo Mover/Tamano tiene prioridad sobre las teclas del boton del menu (flecha abajo lo abriria).
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (mode !== "move" && mode !== "size") return;
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); endMode("cancel"); return; }
    if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); endMode("confirm"); return; }
    const step = keyToStep(event.key, mode);
    if (step) { event.preventDefault(); event.stopPropagation(); onStep(step, event.shiftKey); }
  };

  const onSystemAction = (action: SystemAction) => {
    switch (action) {
      case "restore": case "maximize": actions.toggleMaximize(id); break;
      case "move": startMode("move"); break;
      case "size": startMode("size"); break;
      case "steps": startMode("steps"); break;
      case "minimize": actions.minimize(id); break;
      case "snapLeft": actions.snap(id, "left"); break;
      case "snapRight": actions.snap(id, "right"); break;
      case "center": actions.snap(id, "center"); break;
      case "reset": actions.snap(id, "default"); break;
      case "close": actions.requestClose(id); break;
    }
  };

  const w = copy.window;
  return (
    <div
      ref={frameRef}
      id={windowDomId(id)}
      className="xp-window"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      tabIndex={-1}
      data-active={active}
      data-minimized={win.minimized}
      data-maximized={win.maximized}
      hidden={win.minimized}
      style={geometryStyle(win, z)}
      onPointerDownCapture={active ? undefined : () => actions.focus(id)}
      onFocusCapture={active ? undefined : () => actions.focus(id)}
      onKeyDownCapture={onKeyDown}
      onBlur={(event) => { if ((mode === "move" || mode === "size") && !event.currentTarget.contains(event.relatedTarget)) endMode("confirm"); }}
    >
      <div
        className="xp-titlebar"
        onPointerDown={drag.onTitlePointerDown}
        onDoubleClick={(event) => { if (!(event.target as HTMLElement).closest("button, [role=menu]")) actions.toggleMaximize(id); }}
        onContextMenu={(event) => {
          if ((event.target as HTMLElement).closest("button, [role=menu]")) return;
          event.preventDefault();
          menuRef.current?.open("first");
        }}
      >
        <button type="button" className="xp-back" onClick={actions.pocketBack}>
          <OsGlyph name="back"/>
          {copy.pocket.back}
        </button>
        <SystemMenu
          ref={menuRef}
          buttonId={`${windowDomId(id)}-sysmenu`}
          label={format(w.systemMenu, { title })}
          icon={<XpIcon name={iconFor(id)} size={16}/>}
          maximized={win.maximized}
          labels={{
            restore: w.menuRestore, move: w.menuMove, size: w.menuSize, minimize: w.menuMinimize, maximize: w.menuMaximize,
            snapLeft: w.menuSnapLeft, snapRight: w.menuSnapRight, center: w.menuCenter, reset: w.menuResetPosition,
            steps: w.menuMoveAndResize, close: w.menuClose,
          }}
          onAction={onSystemAction}
        />
        <h2 id={titleId} className="xp-titlebar__title">{title}</h2>
        <div className="xp-titlebar__controls">
          <button type="button" className="xp-caption xp-caption--min" aria-label={label(w.minimize)} onClick={() => actions.minimize(id)}>
            <OsGlyph name="minimize"/>
          </button>
          <button type="button" className="xp-caption xp-caption--max" aria-label={label(w.maximize)} aria-pressed={win.maximized} onClick={() => actions.toggleMaximize(id)}>
            <OsGlyph name={win.maximized ? "restore" : "maximize"}/>
          </button>
          <button type="button" className="xp-caption xp-caption--close" aria-label={label(w.close)} onClick={() => actions.requestClose(id)}>
            <OsGlyph name="close"/>
          </button>
        </div>
      </div>
      <div id={windowBodyId(id)} className="xp-window__body" role="group" tabIndex={-1} aria-labelledby={titleId}>
        <WindowIdContext.Provider value={id}>
          <WindowContent id={id}/>
        </WindowIdContext.Provider>
      </div>
      {mode === "steps" ? (
        <StepsPanel
          title={title}
          rect={win.rect}
          copy={copy.steps}
          onStep={onStep}
          onDone={() => endMode("confirm")}
          onCancel={() => endMode("cancel")}
        />
      ) : null}
      {DIRS.map((dir) => <div key={dir} className="xp-resize" data-dir={dir} aria-hidden="true" onPointerDown={drag.onHandlePointerDown}/>)}
    </div>
  );
});
