"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { slugOf, type OsState, type WindowId } from "@/lib/os/window-reducer";
import { APP_ICON, DESKTOP_APPS } from "./app-meta";
import { preloadApp } from "./apps/registry";
import { XpIcon } from "./icons";
import { Menu, type MenuEntry } from "./menu";
import { useOsCommands, useOsPrefs } from "./os-commands";
import { useOsActions, useOsStatic } from "./os-context";
import { useRoving } from "./use-roving";

type MenuState = { x: number; y: number; host: HTMLElement; returnTo: HTMLElement | null };

/**
 * Fondo e iconos del escritorio. Un clic abre la app (Q10); el CV es un enlace de descarga.
 * La lista es una parada de Tab con flechas (roving). Los iconos de las apps con ventana abierta
 * quedan marcados con `data-selected`.
 *
 * Menú contextual del escritorio (§4): clic derecho SOLO sobre el fondo (no se bloquea el menú nativo
 * sobre iconos ni campos) y tecla Menú / Mayús+F10 con el foco en la lista de iconos. Se pinta en un
 * portal dentro de `<main id="os-desktop">` (dentro del landmark y por encima de las ventanas).
 */
export const DesktopSurface = memo(function DesktopSurface({ state }: { state: OsState }) {
  const { copy, hrefs } = useOsStatic();
  const actions = useOsActions();
  const commands = useOsCommands();
  const prefs = useOsPrefs();
  const keys = useMemo(() => [...DESKTOP_APPS, "cv"], []);
  const roving = useRoving(keys, "both");
  const [menu, setMenu] = useState<MenuState | null>(null);
  /** Tras abrir con el teclado, el `contextmenu` nativo que lo sigue se descarta sin abrir otro. */
  const keyboardOpenedAt = useRef(0);
  const open = new Set<string>(Object.keys(state.windows).map((id) => (slugOf(id as WindowId) === null ? id : "projects")));

  const openMenuAt = (clientX: number, clientY: number) => {
    const host = document.getElementById("os-desktop");
    if (!host) return;
    const active = document.activeElement;
    const returnTo = active instanceof HTMLElement && active !== document.body ? active : host;
    setMenu({ x: clientX, y: clientY, host, returnTo });
  };

  const onContextMenu = (event: MouseEvent) => {
    if (performance.now() - keyboardOpenedAt.current < 600) { event.preventDefault(); return; }
    const target = event.target as HTMLElement;
    const onBackground = target.id === "os-desktop" || target.classList.contains("os-wallpaper") || target.classList.contains("os-desktop-icons");
    if (!onBackground) return;
    event.preventDefault();
    openMenuAt(event.clientX, event.clientY);
  };

  const onIconsKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    roving.onKeyDown(event);
    if (event.defaultPrevented) return;
    if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
      event.preventDefault();
      keyboardOpenedAt.current = performance.now();
      const box = (event.target as HTMLElement).getBoundingClientRect();
      openMenuAt(box.left + 8, box.bottom);
    }
  };

  const menuRef = useRef(menu);
  useEffect(() => { menuRef.current = menu; });
  const close = useCallback((restoreFocus: boolean) => {
    const current = menuRef.current;
    setMenu(null);
    if (!current || !restoreFocus) return;
    const target = current.returnTo?.isConnected ? current.returnTo : document.getElementById("os-desktop");
    target?.focus({ preventScroll: true });
  }, []);

  const entries: MenuEntry[] = [
    { kind: "item", id: "reset", label: copy.contextMenu.resetWindows, onSelect: commands.resetWindows },
    { kind: "item", id: "show", label: copy.contextMenu.showDesktop, restoreFocus: false, onSelect: commands.showDesktop },
    { kind: "separator", id: "sep" },
    { kind: "checkbox", id: "effect", label: copy.contextMenu.screenEffect, checked: prefs.screenEffect, onSelect: () => commands.setPref({ screenEffect: !prefs.screenEffect }) },
    { kind: "item", id: "properties", label: copy.contextMenu.properties, restoreFocus: false, onSelect: commands.openSettings },
  ];

  return (
    <div className="os-desktop-surface" onContextMenu={onContextMenu}>
      <div className="os-wallpaper" aria-hidden="true"/>
      <ul className="os-desktop-icons" role="list" aria-label={copy.desktop.iconsGroup} onKeyDown={onIconsKeyDown}>
        {DESKTOP_APPS.map((id) => (
          <li key={id}>
            <button
              type="button"
              className="xp-icon"
              data-roving={id}
              data-icon={id}
              data-selected={open.has(id)}
              tabIndex={roving.tabIndexFor(id)}
              onFocus={() => { roving.onFocusItem(id); preloadApp(id); }}
              onPointerEnter={() => preloadApp(id)}
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
      {menu ? createPortal(<Menu label={copy.contextMenu.label} entries={entries} x={menu.x} y={menu.y} onClose={close}/>, menu.host) : null}
    </div>
  );
});
