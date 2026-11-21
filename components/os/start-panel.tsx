"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { AppId } from "@/lib/os/window-reducer";
import { APP_ICON, DESKTOP_APPS, START_PINNED, START_SYSTEM } from "./app-meta";
import { OsGlyph, XpIcon } from "./icons";
import { EdavLogo } from "./logo";
import { useOsActions, useOsStatic } from "./os-context";

export const START_PANEL_ID = "os-start-panel";

type Props = {
  open: boolean;
  /** `restoreFocus`: devolver el foco al botón de Inicio (Esc). */
  onClose: (restoreFocus: boolean) => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
  languageHref: string;
};

/**
 * Menú Inicio = Disclosure (§4): botones y enlaces normales dentro de grupos con nombre, sin roles
 * `menu`. Tab recorre el contenido en orden natural; Esc cierra y devuelve el foco al botón; un clic
 * fuera cierra. "Todos los programas" es otro Disclosure.
 */
export function StartPanel({ open, onClose, buttonRef, languageHref }: Props) {
  const { copy, hrefs } = useOsStatic();
  const actions = useOsActions();
  const panelRef = useRef<HTMLDivElement>(null);
  const [all, setAll] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      onClose(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopPropagation(); onClose(true); }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, buttonRef]);

  const choose = (id: AppId) => { onClose(false); actions.open(id); };
  const item = (id: AppId, key: string) => (
    <button key={key} type="button" className="xp-start__item" onClick={() => choose(id)}>
      <XpIcon name={APP_ICON[id]}/>
      <span>
        <span className="xp-start__item-title">{copy.apps[id].title}</span>
        <span className="xp-start__item-sub">{copy.apps[id].file}</span>
      </span>
    </button>
  );

  return (
    <div id={START_PANEL_ID} ref={panelRef} className="xp-start" role="group" aria-label={copy.start.panel} hidden={!open}>
      <div className="xp-start__head">
        <span className="xp-start__avatar"><EdavLogo size={32}/></span>
        <span className="xp-start__user">{hrefs.owner}</span>
      </div>
      <div className="xp-start__body">
        <div className="xp-start__left" role="group" aria-label={copy.start.programsGroup}>
          {START_PINNED.map((id) => item(id, id))}
          <div className="xp-start__rule" aria-hidden="true"/>
          <button type="button" className="xp-start__all" aria-expanded={all} aria-controls="os-start-all" onClick={() => setAll((value) => !value)}>
            {copy.start.allPrograms}
            <OsGlyph name="chevron"/>
          </button>
          <div id="os-start-all" className="xp-start__allpanel" hidden={!all}>
            {DESKTOP_APPS.map((id) => item(id, `all-${id}`))}
          </div>
        </div>
        <div className="xp-start__right" role="group" aria-label={copy.start.systemGroup}>
          <a className="xp-start__item" href={hrefs.cv} download onClick={() => onClose(false)}>
            <XpIcon name="cv"/>
            <span><span className="xp-start__item-title">{copy.start.openCv}</span></span>
          </a>
          {START_SYSTEM.map((id) => item(id, id))}
        </div>
      </div>
      <div className="xp-start__foot">
        <Link className="xp-start__item" href={hrefs.home} prefetch={false} onClick={() => onClose(false)}>
          <XpIcon name="help"/>
          <span className="xp-start__item-title">{copy.start.webView}</span>
        </Link>
        <Link className="xp-start__item" href={languageHref} prefetch={false} hrefLang={hrefs.otherLocale} lang={hrefs.otherLocale} onClick={() => onClose(false)}>
          <OsGlyph name="language"/>
          <span className="xp-start__item-title">{copy.start.language}</span>
        </Link>
      </div>
    </div>
  );
}
