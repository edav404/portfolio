"use client";

import { useCallback, useEffect, useId, useImperativeHandle, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { EMPTY_TYPE_AHEAD, isTypeAheadKey, nextIndex, pushTypeAhead, typeAheadIndex, type TypeAheadBuffer } from "@/lib/os/menu-nav";

/**
 * Menú de sistema de la ventana (docs/arquitectura-os.md §3.1): Menu Button de la APG sobre el icono de
 * la barra de título. Abre con clic, Intro, Espacio, flecha abajo (primer elemento), flecha arriba
 * (último), Shift+F10 y clic derecho sobre la barra (este último mediante el `ref`). Flechas, Inicio/Fin
 * y type-ahead dentro; Esc cierra y devuelve el foco al botón; Tab cierra y sigue. Todo es operable con
 * un solo clic.
 */
export type SystemAction =
  | "restore" | "move" | "size" | "minimize" | "maximize"
  | "snapLeft" | "snapRight" | "center" | "reset" | "steps" | "close";

export type SystemMenuHandle = { open(where?: "first" | "last"): void; focusButton(): void };

type Item = { action: SystemAction; label: string; enabled: boolean; separator?: boolean };

type Props = {
  ref?: Ref<SystemMenuHandle>;
  buttonId: string;
  /** aria-label del botón ("Menú de ventana de …"). */
  label: string;
  icon: ReactNode;
  maximized: boolean;
  labels: Record<SystemAction, string>;
  onAction: (action: SystemAction) => void;
  /** Marco minimizado u oculto (Pocket): un menú abierto no sobrevive a que su ventana deje de verse. */
  suspended?: boolean;
};

export function SystemMenu({ ref, buttonId, label, icon, maximized, labels, onAction, suspended = false }: Props) {
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const target = useRef<"first" | "last">("first");
  const typed = useRef<TypeAheadBuffer>(EMPTY_TYPE_AHEAD);

  const items: Item[] = [
    { action: "restore", label: labels.restore, enabled: maximized },
    { action: "move", label: labels.move, enabled: !maximized },
    { action: "size", label: labels.size, enabled: !maximized },
    { action: "minimize", label: labels.minimize, enabled: true },
    { action: "maximize", label: labels.maximize, enabled: !maximized },
    { action: "snapLeft", label: labels.snapLeft, enabled: true, separator: true },
    { action: "snapRight", label: labels.snapRight, enabled: true },
    { action: "center", label: labels.center, enabled: true },
    { action: "reset", label: labels.reset, enabled: true },
    { action: "steps", label: labels.steps, enabled: !maximized, separator: true },
    { action: "close", label: labels.close, enabled: true, separator: true },
  ];
  // Transitorio: se cierra al ocultarse/minimizarse el marco (ajuste de estado durante el render, con guarda).
  if (suspended && open) setOpen(false);
  const enabled = items.map((item) => item.enabled);

  const openMenu = useCallback((where: "first" | "last" = "first") => { target.current = where; setOpen(true); }, []);
  useImperativeHandle(ref, () => ({ open: openMenu, focusButton: () => buttonRef.current?.focus({ preventScroll: true }) }), [openMenu]);

  const itemEls = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  // El menú se limita al área útil y hace scroll: el elemento enfocado siempre queda a la vista (WCAG 2.4.11).
  const focusAt = (index: number) => {
    const el = index >= 0 ? itemEls()[index] : undefined;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "nearest" });
  };
  const currentIndex = () => itemEls().indexOf(document.activeElement as HTMLElement);

  // Al abrir: foco en el primer o último elemento habilitado y, si no cabe sobre la barra de tareas, se sube.
  useEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    if (menu) {
      // Área útil = sobre la barra de tareas y dentro del viewport; si no cabe, el menú hace scroll.
      const limit = document.querySelector(".xp-taskbar")?.getBoundingClientRect().top ?? window.innerHeight - 30;
      menu.style.maxHeight = `${Math.max(96, Math.floor(limit) - 8)}px`;
      menu.style.overflowY = "auto";
      const rect = menu.getBoundingClientRect();
      let delta = 0;
      if (rect.bottom > limit) delta = -Math.ceil(rect.bottom - limit);
      if (rect.top + delta < 0) delta = Math.ceil(-rect.top);
      if (delta !== 0) menu.style.top = `calc(100% + ${delta}px)`;
      focusAt(nextIndex(enabled, -1, target.current === "last" ? "ArrowUp" : "ArrowDown"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir
  }, [open]);

  // Clic fuera cierra sin mover el foco: el propio clic ya lo lleva adonde el usuario apuntó.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      const node = event.target as Node;
      if (!menuRef.current?.contains(node) && !buttonRef.current?.contains(node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus({ preventScroll: true });
  };

  const choose = (item: Item) => {
    if (!item.enabled) return;
    close(true);
    onAction(item.action);
  };

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") { event.preventDefault(); openMenu("first"); }
    else if (event.key === "ArrowUp") { event.preventDefault(); openMenu("last"); }
    else if (event.key === "F10" && event.shiftKey) { event.preventDefault(); openMenu("first"); }
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = currentIndex();
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
      event.preventDefault();
      focusAt(nextIndex(enabled, index, event.key));
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    } else if (event.key === "Tab") {
      close(true); // el foco vuelve al botón y la tecla sigue desde ahí
    } else if (event.key === "F10" && event.shiftKey) {
      event.preventDefault();
      close(true);
    } else if (isTypeAheadKey(event.nativeEvent)) {
      event.preventDefault();
      typed.current = pushTypeAhead(typed.current, event.key, event.timeStamp);
      focusAt(typeAheadIndex(items.map((item) => item.label), enabled, index, typed.current.text));
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        className="xp-titlebar__icon"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={() => (open ? close(true) : openMenu("first"))}
        onKeyDown={onButtonKeyDown}
      >
        {icon}
      </button>
      {open ? (
        <div ref={menuRef} id={menuId} role="menu" aria-labelledby={buttonId} className="xp-menu xp-sysmenu" data-os-menu onKeyDown={onMenuKeyDown}>
          {items.map((item) => (
            <div key={item.action} role="none">
              {item.separator ? <div role="separator" className="xp-menu__sep"/> : null}
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                className="xp-menu__item"
                aria-disabled={item.enabled ? undefined : true}
                onClick={() => choose(item)}
              >
                {item.label}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
