"use client";

import { createContext, useContext } from "react";
import type { Prefs } from "@/lib/os/prefs";

/**
 * Comandos del cromo del SO (menú contextual, atajos) que no son acciones de una ventana concreta.
 * Identidad estable; los provee `OsShell`. Separado de `OsActions` para no tocar el contrato de las apps.
 */
export type OsCommands = {
  resetWindows(): void;
  showDesktop(): void;
  /** Cicla la ventana activa y enfoca su destino. */
  cycle(dir: 1 | -1): void;
  /** Cierra la ventana activa (misma vía que el botón ✕). */
  closeActive(): void;
  /** Enfoca la raíz del escritorio. */
  focusDesktop(): void;
  openSettings(): void;
  setPref(patch: Partial<Prefs>): void;
};

export const OsCommandsContext = createContext<OsCommands | null>(null);
/** Preferencias vigentes (cambian; por eso van aparte de los comandos). */
export const OsPrefsContext = createContext<Prefs | null>(null);

export function useOsCommands(): OsCommands {
  const value = useContext(OsCommandsContext);
  if (!value) throw new Error("useOsCommands fuera de OsShell");
  return value;
}

export function useOsPrefs(): Prefs {
  const value = useContext(OsPrefsContext);
  if (!value) throw new Error("useOsPrefs fuera de OsShell");
  return value;
}
