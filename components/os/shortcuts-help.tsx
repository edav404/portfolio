"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { format } from "@/content/format";
import { SHORTCUT_ROWS as ROWS, physicalKeyName } from "@/lib/os/shortcuts";
import { useOsCommands, useOsPrefs } from "./os-commands";
import { useOsStatic } from "./os-context";
import { readLayoutMap } from "./use-shortcuts";

export const HELP_PANEL_ID = "os-shortcuts-help";

type Props = {
  /** Se cierra con Esc o el botón; `restore` devuelve el foco a quien abrió la ayuda. */
  onClose: () => void;
  returnRef: RefObject<HTMLElement | null>;
};

/**
 * Ayuda de atajos: diálogo no modal anclado a la bandeja. Muestra la MISMA tecla que dispara cada
 * atajo ("tecla S"; si `navigator.keyboard.getLayoutMap()` existe, también lo que imprime esa tecla en
 * la distribución actual) y el interruptor de activación (opt-in). Esc lo cierra y devuelve el foco.
 */
export function ShortcutsHelp({ onClose, returnRef }: Props) {
  const { copy } = useOsStatic();
  const commands = useOsCommands();
  const prefs = useOsPrefs();
  const text = copy.shortcuts;
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const switchId = useId();
  const [layout, setLayout] = useState<ReadonlyMap<string, string> | null>(null);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    let alive = true;
    void readLayoutMap().then((map) => { if (alive) setLayout(map); });
    return () => { alive = false; };
  }, []);

  const physical = (codes: readonly string[]) => {
    const names = codes.map((code) => {
      const base = physicalKeyName(code);
      const printed = layout?.get(code)?.toUpperCase();
      return printed && printed !== base && code.startsWith("Key") ? `${base} (${printed})` : base;
    });
    return format(text.physicalKey, { key: names.join(" / ") });
  };

  const close = () => { onClose(); returnRef.current?.focus({ preventScroll: true }); };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    close();
  };

  return (
    <div id={HELP_PANEL_ID} ref={ref} className="xp-help" role="dialog" aria-modal="false" aria-labelledby={titleId} tabIndex={-1} data-os-transient="" onKeyDown={onKeyDown}>
      <h2 id={titleId} className="xp-help__title">{text.title}</h2>
      <div className="xp-help__switch">
        <input id={switchId} type="checkbox" checked={prefs.shortcuts} onChange={(event) => commands.setPref({ shortcuts: event.target.checked })} aria-describedby={`${switchId}-help`}/>
        <label htmlFor={switchId}>{text.optIn}</label>
        <p id={`${switchId}-help`} className="xp-help__note">{text.optInHelp}</p>
      </div>
      <table className="xp-help__table">
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.text}>
              <th scope="row">{text[row.text]}</th>
              <td><kbd>{text[row.keys]}</kbd> <span className="xp-help__note">{physical(row.codes)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="xp-help__close" onClick={close}>{copy.window.close}</button>
    </div>
  );
}
