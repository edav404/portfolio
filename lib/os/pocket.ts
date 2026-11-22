/**
 * Piezas puras del modo Pocket (docs/arquitectura-os.md §4, §5.4). Sin React ni DOM.
 * La pila local de Pocket es el propio `order` del reducer: Atrás, ✕ y Escape son `POCKET_BACK`
 * (vía `requestClose`) y nunca llaman a `history.back()`.
 */
import { activeId, nextAfterClose, type OsState, type WindowId } from "./window-reducer";

/** Media query de Pocket; coincide con `MOBILE_MAX` y con el bloque Pocket de `os.css`. */
export const POCKET_QUERY = "(max-width: 768px)";

export type PocketScreen = { kind: "launcher" } | { kind: "window"; id: WindowId; back: { kind: "launcher" } | { kind: "window"; id: WindowId } };

/** Pantalla activa y a dónde llevaría Atrás: la ventana inferior de la pila local o el lanzador. */
export function pocketScreen(state: OsState): PocketScreen {
  const id = activeId(state);
  if (id === null) return { kind: "launcher" };
  const below = nextAfterClose(state, id);
  return { kind: "window", id, back: below === null ? { kind: "launcher" } : { kind: "window", id: below } };
}

/** ¿Hay que reubicar el foco tras cruzar el breakpoint? Estaba en una ventana y ya no hay elemento enfocado utilizable. */
export function needsFocusRecovery(opts: { hadFocusInWindow: boolean; activeIsUsable: boolean }): boolean {
  return opts.hadFocusInWindow && !opts.activeIsUsable;
}
