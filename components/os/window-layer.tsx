"use client";

import { memo } from "react";
import { slugOf, taskbarIds, zIndexOf, type OsState, type WindowId } from "@/lib/os/window-reducer";
import { activeId } from "@/lib/os/window-reducer";
import { WindowFrame } from "./window-frame";
import { useOsStatic } from "./os-context";

/** Título visible de una ventana (app o proyecto). */
export function useWindowTitle() {
  const { copy, projects } = useOsStatic();
  return (id: WindowId): string => {
    const slug = slugOf(id);
    if (slug === null) return copy.apps[id as keyof typeof copy.apps].title;
    return projects.find((project) => project.slug === slug)?.title ?? slug;
  };
}

/**
 * Capa de ventanas. El DOM sigue el orden de la barra de tareas (estable); el z-order se expresa con
 * `z-index` = índice en `order`, así reordenar no mueve nodos ni pierde el foco.
 */
export const WindowLayer = memo(function WindowLayer({ state }: { state: OsState }) {
  const titleOf = useWindowTitle();
  const active = activeId(state);
  return (
    <div className="os-windows">
      {taskbarIds(state).map((id) => (
        <WindowFrame key={id} win={state.windows[id]!} z={zIndexOf(state, id)} active={id === active} title={titleOf(id)}/>
      ))}
    </div>
  );
});
