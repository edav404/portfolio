/**
 * Gestor de foco del SO (docs/arquitectura-os.md §4, "Foco"). Lo puro (`resolveReturnTarget`,
 * `shouldReturnFocus`) no toca el DOM y está testeado; el resto son ayudas finas sobre el DOM.
 * Todo `focus()` usa `preventScroll: true` (el escritorio no es un documento que deba desplazarse).
 */

/** Primer candidato de la cadena que `usable` acepta. Los ausentes (`null`/`undefined`) se saltan. */
export function resolveReturnTarget<T>(chain: ReadonlyArray<T | null | undefined>, usable: (candidate: T) => boolean): T | null {
  for (const candidate of chain) {
    if (candidate !== null && candidate !== undefined && usable(candidate)) return candidate;
  }
  return null;
}

/** El foco se devuelve solo si estaba dentro de la ventana que desaparece (no se roba si el usuario estaba en otra parte). */
export function shouldReturnFocus(contains: (node: unknown) => boolean, activeElement: unknown): boolean {
  return activeElement !== null && activeElement !== undefined && contains(activeElement);
}

/** Elemento enfocable ahora: conectado, no oculto ni inerte y con caja en pantalla. */
export function isUsableElement(el: HTMLElement | null | undefined): el is HTMLElement {
  if (!el || !el.isConnected) return false;
  if (el.closest("[hidden], [inert]")) return false;
  return el.getClientRects().length > 0;
}

export function focusElement(el: HTMLElement | null | undefined): boolean {
  if (!el) return false;
  el.focus({ preventScroll: true });
  return true;
}

/** Quien activó la apertura de una ventana: el elemento enfocado o el `data-focus-return` que lo contiene. */
export type Activator = { el: HTMLElement; fromMenu: boolean };

export function captureActivator(doc: Document = document): Activator | null {
  const active = doc.activeElement;
  if (!(active instanceof HTMLElement) || active === doc.body) return null;
  const marked = active.closest<HTMLElement>("[data-focus-return]");
  return { el: marked ?? active, fromMenu: active.closest("[data-os-menu], .xp-start") !== null };
}

/** Activador recordado por ventana (se guarda al abrir y se consume al cerrar). */
export function createActivatorStore() {
  const map = new Map<string, Activator>();
  return {
    remember(id: string, activator: Activator | null) { if (activator) map.set(id, activator); else map.delete(id); },
    take(id: string): Activator | null { const found = map.get(id) ?? null; map.delete(id); return found; },
  };
}
