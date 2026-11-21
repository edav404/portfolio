"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FocusEvent as ReactFocusEvent, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";
import type { AppId } from "@/lib/os/window-reducer";
import { APP_ICON, DESKTOP_APPS, START_PINNED, START_SYSTEM } from "./app-meta";
import { preloadApp } from "./apps/registry";
import { OsGlyph, XpIcon } from "./icons";
import { EdavLogo } from "./logo";
import { wrapTab } from "@/lib/os/pocket";
import { useOsActions, useOsStatic } from "./os-context";
import { usePocket } from "./use-pocket";

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
 * fuera cierra. "Todos los programas" es otro Disclosure: además de Intro/Espacio, → lo abre y mueve el
 * foco a su primer elemento, ← (o Esc) lo cierra y devuelve el foco a su botón (el padre); un segundo
 * Esc cierra Inicio. Si el foco sale del panel con Tab, se cierra.
 */
export function StartPanel({ open, onClose, buttonRef, languageHref }: Props) {
  const { copy, hrefs } = useOsStatic();
  const actions = useOsActions();
  const pocket = usePocket();
  const panelRef = useRef<HTMLDivElement>(null);
  const [all, setAll] = useState(false);
  const allButtonRef = useRef<HTMLButtonElement>(null);
  const allPanelRef = useRef<HTMLDivElement>(null);
  const focusFirstOfAll = useRef(false);

  // Cada vez que Inicio se cierra, el submenú vuelve a estar plegado (ajuste durante el render, con guarda).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) { setWasOpen(open); if (!open) setAll(false); }
  useEffect(() => {
    if (all && focusFirstOfAll.current) allPanelRef.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
    focusFirstOfAll.current = false;
  }, [all]);

  // Pocket: hoja a pantalla completa. El resto del fondo queda inerte solo mientras esta abierta y el foco
  // entra en la hoja (la barra de tareas sigue operable para cerrarla con el mismo boton).
  useEffect(() => {
    if (!open || !pocket) return;
    const behind = [document.getElementById("os-desktop"), document.querySelector<HTMLElement>(".xp-skip-link")].filter((el): el is HTMLElement => el !== null);
    behind.forEach((el) => el.setAttribute("inert", ""));
    panelRef.current?.focus({ preventScroll: true });
    return () => behind.forEach((el) => el.removeAttribute("inert"));
  }, [open, pocket]);

  const collapseAll = () => { setAll(false); allButtonRef.current?.focus({ preventScroll: true }); };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      onClose(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      event.preventDefault();
      if (allPanelRef.current?.contains(document.activeElement)) { collapseAll(); return; }
      onClose(true);
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
    <button key={key} type="button" className="xp-start__item" onClick={() => choose(id)} onPointerEnter={() => preloadApp(id)} onFocus={() => preloadApp(id)}>
      <XpIcon name={APP_ICON[id]}/>
      <span>
        <span className="xp-start__item-title">{copy.apps[id].title}</span>
        <span className="xp-start__item-sub">{copy.apps[id].file}</span>
      </span>
    </button>
  );

  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (pocket && event.key === "Tab") {
      // Foco contenido en la hoja: Tab da la vuelta entre su primer y ultimo elemento.
      const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>("button, a[href]") ?? []).filter((el) => !el.closest("[hidden]"));
      const index = items.indexOf(target);
      const atEdge = event.shiftKey ? index <= 0 : index === items.length - 1;
      const next = wrapTab(index, items.length, event.shiftKey);
      if (atEdge && next >= 0) { event.preventDefault(); items[next].focus({ preventScroll: true }); }
      return;
    }
    if (event.key === "ArrowRight" && target === allButtonRef.current && !all) {
      event.preventDefault();
      focusFirstOfAll.current = true;
      setAll(true);
    } else if (event.key === "ArrowLeft" && allPanelRef.current?.contains(target)) {
      event.preventDefault();
      collapseAll();
    }
  };
  const onPanelBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && !panelRef.current?.contains(next) && !buttonRef.current?.contains(next)) onClose(false);
  };

  return (
    <div id={START_PANEL_ID} ref={panelRef} className="xp-start" role="group" aria-label={copy.start.panel} tabIndex={-1} hidden={!open} onKeyDown={onPanelKeyDown} onBlur={onPanelBlur}>
      <div className="xp-start__head">
        <span className="xp-start__avatar"><EdavLogo size={32}/></span>
        <span className="xp-start__user">{hrefs.owner}</span>
      </div>
      <div className="xp-start__body">
        <div className="xp-start__left" role="group" aria-label={copy.start.programsGroup}>
          {START_PINNED.map((id) => item(id, id))}
          <div className="xp-start__rule" aria-hidden="true"/>
          <button ref={allButtonRef} type="button" className="xp-start__all" aria-expanded={all} aria-controls="os-start-all" onClick={() => setAll((value) => !value)}>
            {copy.start.allPrograms}
            <OsGlyph name="chevron"/>
          </button>
          <div id="os-start-all" ref={allPanelRef} className="xp-start__allpanel" hidden={!all}>
            {DESKTOP_APPS.map((id) => item(id, `all-${id}`))}
          </div>
        </div>
        <div className="xp-start__right" role="group" aria-label={copy.start.systemGroup}>
          <a className="xp-start__item" href={hrefs.cv} download onClick={() => onClose(pocket)}>
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
