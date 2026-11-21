"use client";

import { memo, useMemo } from "react";
import { slugOf, type OsState, type WindowId } from "@/lib/os/window-reducer";
import { APP_ICON, DESKTOP_APPS } from "./app-meta";
import { XpIcon } from "./icons";
import { useOsActions, useOsStatic } from "./os-context";
import { useRoving } from "./use-roving";

/**
 * Fondo e iconos del escritorio. Un clic abre la app (Q10); el CV es un enlace de descarga.
 * La lista es una parada de Tab con flechas (roving). Los iconos de las apps con ventana abierta
 * quedan marcados con `data-selected`.
 */
export const DesktopSurface = memo(function DesktopSurface({ state }: { state: OsState }) {
  const { copy, hrefs } = useOsStatic();
  const actions = useOsActions();
  const keys = useMemo(() => [...DESKTOP_APPS, "cv"], []);
  const roving = useRoving(keys, "both");
  const open = new Set<string>(Object.keys(state.windows).map((id) => (slugOf(id as WindowId) === null ? id : "projects")));
  return (
    <>
      <div className="os-wallpaper" aria-hidden="true"/>
      <ul className="os-desktop-icons" role="list" aria-label={copy.desktop.iconsGroup} onKeyDown={roving.onKeyDown}>
        {DESKTOP_APPS.map((id) => (
          <li key={id}>
            <button
              type="button"
              className="xp-icon"
              data-roving={id}
              data-icon={id}
              data-selected={open.has(id)}
              tabIndex={roving.tabIndexFor(id)}
              onFocus={() => roving.onFocusItem(id)}
              onClick={() => actions.open(id)}
            >
              <XpIcon name={APP_ICON[id]}/>
              <span className="xp-icon__label">{copy.apps[id].title}</span>
            </button>
          </li>
        ))}
        <li>
          <a className="xp-icon" href={hrefs.cv} download data-roving="cv" tabIndex={roving.tabIndexFor("cv")} onFocus={() => roving.onFocusItem("cv")}>
            <XpIcon name="cv"/>
            <span className="xp-icon__label">{copy.apps.cv.title}</span>
          </a>
        </li>
      </ul>
    </>
  );
});
