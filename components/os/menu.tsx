"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { EMPTY_TYPE_AHEAD, isTypeAheadKey, nextIndex, pushTypeAhead, typeAheadIndex, type MenuKey, type TypeAheadBuffer } from "@/lib/os/menu-nav";

export type MenuEntry =
  | { kind: "separator"; id: string }
  | {
      kind: "item" | "checkbox";
      id: string;
      label: string;
      checked?: boolean;
      disabled?: boolean;
      /** `false` si la acción mueve el foco por su cuenta (p. ej. abre una ventana). */
      restoreFocus?: boolean;
      onSelect: () => void;
    };

type Props = {
  label: string;
  entries: readonly MenuEntry[];
  /** Posición (px) en coordenadas del cliente (`clientX/clientY`). */
  x: number;
  y: number;
  /** `restoreFocus`: devolver el foco al activador (Esc, Tab, elegir un elemento). */
  onClose: (restoreFocus: boolean) => void;
};

/**
 * Menú APG (role=menu): el foco entra en el primer elemento; ↑/↓ con vuelta, Inicio/Fin, type-ahead,
 * Intro/Espacio activan, Esc y Tab cierran devolviendo el foco, un clic fuera cierra. Los elementos
 * llevan tabindex -1 (el foco se mueve por script). Se coloca dentro de los límites de `.os-root`.
 */
export function Menu({ label, entries, x, y, onClose }: Props) {
  const ref = useRef<HTMLUListElement>(null);
  const buffer = useRef<TypeAheadBuffer>(EMPTY_TYPE_AHEAD);
  const enabled = useMemo(() => entries.map((entry) => entry.kind !== "separator" && entry.disabled !== true), [entries]);
  const labels = useMemo(() => entries.map((entry) => (entry.kind === "separator" ? "" : entry.label)), [entries]);

  const items = () => Array.from(ref.current?.querySelectorAll<HTMLElement>("[data-menu-index]") ?? []);
  const focusAt = (index: number) => { items().find((el) => Number(el.dataset.menuIndex) === index)?.focus({ preventScroll: true }); };
  const currentIndex = () => {
    const active = document.activeElement as HTMLElement | null;
    return active && ref.current?.contains(active) && active.dataset.menuIndex ? Number(active.dataset.menuIndex) : -1;
  };

  // Primer elemento al abrir.
  useEffect(() => { focusAt(nextIndex(enabled, -1, "Home")); }, []); // eslint-disable-line react-hooks/exhaustive-deps -- solo al montar

  // Posición en coordenadas del cliente, dentro de los límites del contenedor posicionado (solo estilo;
  // no provoca otro render). Se fija antes de pintar.
  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!el || !parent) return;
    const box = parent.getBoundingClientRect();
    el.style.left = `${Math.max(0, Math.min(x - box.left, parent.clientWidth - el.offsetWidth))}px`;
    el.style.top = `${Math.max(0, Math.min(y - box.top, parent.clientHeight - el.offsetHeight))}px`;
  }, [x, y]);

  // Un clic fuera cierra (sin robar el foco al elemento clicado).
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [onClose]);

  const select = (entry: MenuEntry) => {
    if (entry.kind === "separator" || entry.disabled) return;
    onClose(entry.restoreFocus !== false);
    entry.onSelect();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const key = event.key;
    if (key === "ArrowDown" || key === "ArrowUp" || key === "Home" || key === "End") {
      event.preventDefault();
      focusAt(nextIndex(enabled, currentIndex(), key as MenuKey));
    } else if (key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose(true);
    } else if (key === "Tab") {
      event.preventDefault();
      onClose(true);
    } else if (isTypeAheadKey(event)) {
      event.preventDefault();
      buffer.current = pushTypeAhead(buffer.current, key, event.timeStamp);
      const index = typeAheadIndex(labels, enabled, currentIndex(), buffer.current.text);
      if (index >= 0) focusAt(index);
    }
  };

  return (
    <ul ref={ref} className="xp-menu" role="menu" data-os-menu="" aria-label={label} onKeyDown={onKeyDown} onContextMenu={(event) => event.preventDefault()}>
      {entries.map((entry, index) =>
        entry.kind === "separator" ? (
          <li key={entry.id} role="separator" className="xp-menu__sep"/>
        ) : (
          <li key={entry.id} role="none">
            <button
              type="button"
              className="xp-menu__item"
              role={entry.kind === "checkbox" ? "menuitemcheckbox" : "menuitem"}
              aria-checked={entry.kind === "checkbox" ? entry.checked === true : undefined}
              aria-disabled={entry.disabled || undefined}
              tabIndex={-1}
              data-menu-index={index}
              onClick={() => select(entry)}
            >
              <span aria-hidden="true" className="xp-menu__check">{entry.kind === "checkbox" && entry.checked ? "✓" : ""}</span>
              <span>{entry.label}</span>
            </button>
          </li>
        ),
      )}
    </ul>
  );
}
