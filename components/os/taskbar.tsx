"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "@/content/format";
import { activeId, taskbarIds, type OsState } from "@/lib/os/window-reducer";
import type { Prefs } from "@/lib/os/prefs";
import { iconFor } from "./app-meta";
import { OsGlyph, XpIcon } from "./icons";
import { EdavLogo } from "./logo";
import { useOsActions, useOsStatic } from "./os-context";
import { START_PANEL_ID, StartPanel } from "./start-panel";
import { useRoving } from "./use-roving";
import { windowDomId } from "./window-frame";
import { useWindowTitle } from "./window-layer";

/** Reloj con placeholder estable hasta montar (SSR y primer render del cliente coinciden). */
function Clock() {
  const { copy, locale } = useOsStatic();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, []);
  if (!now) return <time className="xp-tray__clock">{copy.taskbar.clockPlaceholder}</time>;
  const tag = locale === "es" ? "es-CO" : "en-US";
  const time = new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit" }).format(now);
  const date = new Intl.DateTimeFormat(tag, { dateStyle: "full" }).format(now);
  return <time className="xp-tray__clock" dateTime={now.toISOString()} aria-label={format(copy.taskbar.clock, { date, time })}>{time}</time>;
}

type Props = { state: OsState; prefs: Prefs; onPref: (patch: Partial<Prefs>) => void };

/**
 * Barra de tareas: `toolbar` (Inicio + una tarea por ventana, roving tabindex, una parada de Tab) y
 * bandeja (grupo con paradas normales). Las ventanas minimizadas siguen montadas, así que el
 * `aria-controls` de su tarea apunta a un id que existe.
 */
export const Taskbar = memo(function Taskbar({ state, prefs, onPref }: Props) {
  const { copy, hrefs } = useOsStatic();
  const actions = useOsActions();
  const titleOf = useWindowTitle();
  const pathname = usePathname();
  const [startOpen, setStartOpen] = useState(false);
  const startRef = useRef<HTMLButtonElement>(null);
  const ids = taskbarIds(state);
  const active = activeId(state);
  const idsKey = ids.join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `idsKey` resume `ids`
  const keys = useMemo(() => ["start", ...ids], [idsKey]);
  const roving = useRoving(keys, "horizontal");
  const languageHref = hrefs.languageIndex[pathname ?? ""] ?? hrefs.languageFallback;

  const closeStart = useCallback((restoreFocus: boolean) => {
    setStartOpen(false);
    if (restoreFocus) startRef.current?.focus({ preventScroll: true });
  }, []);

  const activate = (id: (typeof ids)[number]) => {
    const win = state.windows[id]!;
    if (win.minimized) actions.open(id);
    else if (id === active) actions.minimize(id);
    else actions.focus(id);
  };

  return (
    <footer className="xp-taskbar">
      <div role="toolbar" aria-label={copy.taskbar.label} aria-orientation="horizontal" className="xp-taskbar__toolbar" onKeyDown={roving.onKeyDown}>
        <button
          ref={startRef}
          type="button"
          className="xp-start-button"
          data-roving="start"
          tabIndex={roving.tabIndexFor("start")}
          aria-expanded={startOpen}
          aria-controls={START_PANEL_ID}
          onFocus={() => roving.onFocusItem("start")}
          onClick={() => setStartOpen((value) => !value)}
        >
          <EdavLogo size={22}/>
          <span className="xp-start-button__label">{copy.start.button}</span>
        </button>
        <div className="xp-taskbar__tasks">
          {ids.map((id) => {
            const win = state.windows[id]!;
            const isActive = id === active;
            return (
              <button
                key={id}
                type="button"
                className="xp-task"
                data-roving={id}
                data-task={id}
                data-active={isActive}
                data-minimized={win.minimized}
                tabIndex={roving.tabIndexFor(id)}
                aria-pressed={isActive}
                aria-controls={windowDomId(id)}
                onFocus={() => roving.onFocusItem(id)}
                onClick={() => activate(id)}
              >
                <XpIcon name={iconFor(id)} size={16}/>
                <span className="xp-task__label">{titleOf(id)}</span>
                {win.minimized || isActive ? <span className="xp-visually-hidden">{win.minimized ? copy.taskbar.minimized : copy.taskbar.active}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
      <StartPanel open={startOpen} onClose={closeStart} buttonRef={startRef} languageHref={languageHref}/>
      <div className="xp-tray" role="group" aria-label={copy.taskbar.tray}>
        <Link className="xp-tray__btn" href={languageHref} prefetch={false} hrefLang={hrefs.otherLocale} lang={hrefs.otherLocale}>
          <OsGlyph name="language"/>
          <span>{copy.start.language}</span>
        </Link>
        <button type="button" className="xp-tray__btn" aria-label={copy.taskbar.sound} aria-pressed={prefs.sound} onClick={() => onPref({ sound: !prefs.sound })}>
          <OsGlyph name={prefs.sound ? "volume" : "volume-off"}/>
        </button>
        <button type="button" className="xp-tray__btn xp-tray__btn--desktop-only" aria-label={copy.taskbar.screenEffect} aria-pressed={prefs.screenEffect} onClick={() => onPref({ screenEffect: !prefs.screenEffect })}>
          <OsGlyph name="crt"/>
        </button>
        <Clock/>
      </div>
    </footer>
  );
});
