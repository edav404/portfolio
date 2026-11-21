"use client";

import { memo, type CSSProperties } from "react";
import { TITLEBAR_H, VISIBLE_X } from "@/lib/os/window-geometry";
import { slugOf, type AppId, type WindowId, type WindowState } from "@/lib/os/window-reducer";
import { format } from "@/content/format";
import { iconFor } from "./app-meta";
import ProjectWindow from "./apps/project-window";
import { DEFERRED_APPS } from "./apps/registry";
import Welcome from "./apps/welcome";
import { OsGlyph, XpIcon } from "./icons";
import { useOsActions, useOsStatic } from "./os-context";

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

/**
 * Cromo de una ventana Luna (`dialog` no modal). Minimizar la deja montada y `hidden`.
 * Arrastre y redimensionado con lógica llegan en O5: los `.xp-resize` son decorativos por ahora.
 */
export const WindowFrame = memo(function WindowFrame({ win, z, active, title }: Props) {
  const { copy } = useOsStatic();
  const actions = useOsActions();
  const { id } = win;
  const label = (action: string) => format(copy.window.actionOn, { action, title });
  const titleId = `${windowDomId(id)}-title`;
  return (
    <div
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
    >
      <div className="xp-titlebar" onDoubleClick={(event) => { if (!(event.target as HTMLElement).closest("button")) actions.toggleMaximize(id); }}>
        <button type="button" className="xp-back" onClick={actions.pocketBack}>
          <OsGlyph name="back"/>
          {copy.pocket.back}
        </button>
        <span className="xp-titlebar__icon" aria-hidden="true"><XpIcon name={iconFor(id)} size={16}/></span>
        <h2 id={titleId} className="xp-titlebar__title">{title}</h2>
        <div className="xp-titlebar__controls">
          <button type="button" className="xp-caption xp-caption--min" aria-label={label(copy.window.minimize)} onClick={() => actions.minimize(id)}>
            <OsGlyph name="minimize"/>
          </button>
          <button type="button" className="xp-caption xp-caption--max" aria-label={label(copy.window.maximize)} aria-pressed={win.maximized} onClick={() => actions.toggleMaximize(id)}>
            <OsGlyph name={win.maximized ? "restore" : "maximize"}/>
          </button>
          <button type="button" className="xp-caption xp-caption--close" aria-label={label(copy.window.close)} onClick={() => actions.close(id)}>
            <OsGlyph name="close"/>
          </button>
        </div>
      </div>
      <div id={windowBodyId(id)} className="xp-window__body" role="group" tabIndex={-1} aria-labelledby={titleId}>
        <WindowContent id={id}/>
      </div>
      {DIRS.map((dir) => <div key={dir} className="xp-resize" data-dir={dir} aria-hidden="true"/>)}
    </div>
  );
});
