"use client";

import { createContext, useContext } from "react";
import type { StepDelta } from "@/lib/os/gesture";
import type { SnapTarget } from "@/lib/os/window-geometry";
import type { Rect, WindowId } from "@/lib/os/window-reducer";
import type { Locale } from "@/content/types";
import type { OsCopy, OsHrefs, OsProjectIndexItem, WelcomeCopy } from "./types";
import type { ReactNode } from "react";

/** Datos que no cambian durante la sesión del shell. */
export type OsStatic = {
  locale: Locale;
  copy: OsCopy;
  welcome: WelcomeCopy;
  projects: readonly OsProjectIndexItem[];
  hrefs: OsHrefs;
};

/** Acciones estables (la identidad no cambia): las ventanas y las apps las usan sin re-renderizar. */
export type OsActions = {
  open(id: WindowId): void;
  focus(id: WindowId): void;
  close(id: WindowId): void;
  minimize(id: WindowId): void;
  toggleMaximize(id: WindowId): void;
  pocketBack(): void;
  /** Vía común de cierre (✕, Atrás, Escape, atajo): con borrador pide confirmación en la ventana en vez de cerrar. */
  requestClose(id: WindowId): void;
  /** Un solo commit al soltar el arrastre. */
  move(id: WindowId, x: number, y: number): void;
  resize(id: WindowId, rect: Rect): void;
  nudge(id: WindowId, delta: StepDelta): void;
  snap(id: WindowId, to: SnapTarget): void;
  /** Mensaje para el anunciador (`role="status"` único). */
  announce(text: string): void;
};

export const OsStaticContext = createContext<OsStatic | null>(null);
export const OsActionsContext = createContext<OsActions | null>(null);
/** Detalle (servidor) de los proyectos ya recibidos, por slug. */
export const OsDetailsContext = createContext<Readonly<Record<string, ReactNode>>>({});

export function useOsStatic(): OsStatic {
  const value = useContext(OsStaticContext);
  if (!value) throw new Error("useOsStatic fuera de OsShell");
  return value;
}

export function useOsActions(): OsActions {
  const value = useContext(OsActionsContext);
  if (!value) throw new Error("useOsActions fuera de OsShell");
  return value;
}

export function useOsDetails() {
  return useContext(OsDetailsContext);
}
