"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "@/content/format";
import { activeId, taskbarIds, type OsState } from "@/lib/os/window-reducer";
import type { Prefs } from "@/lib/os/prefs";
import { iconFor } from "./app-meta";
import { useAssistantCollapsed, toggleAssistant } from "./assistant";
import { Balloon } from "./balloon";
import { OsGlyph, XpIcon } from "./icons";
import { EdavLogo } from "./logo";
import { useOsCommands } from "./os-commands";
import { useOsActions, useOsStatic } from "./os-context";
import { HELP_PANEL_ID, ShortcutsHelp } from "./shortcuts-help";
import { START_PANEL_ID, StartPanel } from "./start-panel";
import { usePocket } from "./use-pocket";
import { useRoving } from "./use-roving";
import { useShortcuts } from "./use-shortcuts";
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
  const toolbarRef = useRef<HTMLDivElement>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const helpReturn = useRef<HTMLElement | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const commands = useOsCommands();
  const assistantCollapsed = useAssistantCollapsed();
  const assistantOn = prefs.assistant === "clippy" && !assistantCollapsed;
  const pocket = usePocket();
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

  const toggleHelp = () => {
    if (helpOpen) { setHelpOpen(false); return; }
    const active = document.activeElement;
    helpReturn.current = active instanceof HTMLElement && active !== document.body ? active : helpButtonRef.current;
    setHelpOpen(true);
  };

  // Atajos globales opt-in (Alt+Shift+tecla física). El filtro y la ayuda salen de lib/os/shortcuts.
  useShortcuts(prefs.shortcuts, {
    start: () => { setStartOpen((value) => !value); startRef.current?.focus({ preventScroll: true }); },
    taskbar: () => toolbarRef.current?.querySelector<HTMLElement>('[data-roving][tabindex="0"]')?.focus({ preventScroll: true }),
    desktop: () => commands.focusDesktop(),
    cyclePrev: () => commands.cycle(-1),
    cycleNext: () => commands.cycle(1),
    close: () => commands.closeActive(),
    help: toggleHelp,
  });

  const activate = (id: (typeof ids)[number]) => {
    // Pocket: el boton muestra el titulo de la pantalla activa; no minimiza (la salida es Atras, ✕ o Escape).
    if (pocket) return;
    const win = state.windows[id]!;
    if (win.minimized) actions.open(id);
    else if (id === active) actions.minimize(id);
    else actions.focus(id);
  };

  return (
    <footer className="xp-taskbar">
      <div ref={toolbarRef} role="toolbar" aria-label={copy.taskbar.label} aria-orientation="horizontal" className="xp-taskbar__toolbar" onKeyDown={roving.onKeyDown}>
        <button
          ref={startRef}
          type="button"
          className="xp-start-button"
          data-roving="start"
          tabIndex={roving.tabIndexFor("start")}
          aria-expanded={startOpen}
          aria-controls={START_PANEL_ID}
          onFocus={() => roving.onFocusItem("start")}
          onClick={() => { if (pocket && startOpen) closeStart(true); else setStartOpen((value) => !value); }}
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
                onFocus={(event) => {
                  roving.onFocusItem(id);
                  // Al minimizar, el foco llega aquí: pasa a ser la parada roving y se desplaza a la vista.
                  event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
                }}
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
        <button type="button" className="xp-tray__btn xp-tray__btn--desktop-only" aria-label={copy.taskbar.assistant} aria-pressed={assistantOn} onClick={() => toggleAssistant(prefs, onPref)}>
          <OsGlyph name="assistant"/>
        </button>
        <button type="button" className="xp-tray__btn xp-tray__btn--desktop-only" aria-label={copy.taskbar.screenEffect} aria-pressed={prefs.screenEffect} onClick={() => onPref({ screenEffect: !prefs.screenEffect })}>
          <OsGlyph name="crt"/>
        </button>
        <button
          ref={helpButtonRef}
          type="button"
          className="xp-tray__btn"
          aria-label={copy.shortcuts.title}
          aria-haspopup="dialog"
          aria-expanded={helpOpen}
          aria-controls={helpOpen ? HELP_PANEL_ID : undefined}
          onClick={toggleHelp}
        >
          <XpIcon name="help" size={16}/>
        </button>
        <Clock/>
      </div>
      {helpOpen ? <ShortcutsHelp onClose={() => setHelpOpen(false)} returnRef={helpReturn}/> : null}
      <Balloon/>
    </footer>
  );
});
