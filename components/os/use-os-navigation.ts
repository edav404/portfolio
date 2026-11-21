"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { Locale } from "@/content/types";
import { intentFromPath, shouldNavigate } from "@/lib/os/window-url";
import { createInitialState, reduceWithHistory, reduce, type Action, type OsState } from "@/lib/os/window-reducer";

export type Transition = (prev: OsState, next: OsState, action: Action) => void;

/**
 * Estado del escritorio + puente con el router (docs/arquitectura-os.md §1.3, §12).
 * - El estado inicial sale de la URL (sin desajuste de hidratación).
 * - `act` calcula la transición y el plan de historial con `reduceWithHistory`, despacha al reducer
 *   y ejecuta `router.push/replace(href, { scroll: false })` solo para acciones del usuario.
 *   Antes de navegar se valida el slug contra el catálogo (un 404 por RSC rompería el shell).
 * - `usePathname` despacha `ROUTE_CHANGED` (origen "route"): transición idempotente, nunca navega.
 * El espejo `ref` permite encadenar acciones en el mismo tick; el reducer es puro, así que React
 * recalcula exactamente el mismo estado.
 */
export function useOsNavigation(opts: { locale: Locale; knownSlugs: readonly string[]; onTransition?: Transition }) {
  const { locale } = opts;
  // El catálogo llega como prop del servidor y cambia de identidad en cada navegación RSC: se conserva
  // la referencia mientras el contenido sea igual, para que `act` y el efecto de ruta no se re-creen.
  const [knownSlugs, setKnownSlugs] = useState(opts.knownSlugs);
  if (knownSlugs !== opts.knownSlugs && !sameList(knownSlugs, opts.knownSlugs)) setKnownSlugs(opts.knownSlugs);
  const router = useRouter();
  const pathname = usePathname();
  const [state, dispatch] = useReducer(reduce, undefined, () => createInitialState({ path: pathname ?? "/os/", locale, knownSlugs }));
  const ref = useRef(state);
  const onTransition = useRef(opts.onTransition);
  useEffect(() => { onTransition.current = opts.onTransition; });
  useEffect(() => { ref.current = state; }, [state]);

  /** Devuelve `true` si el estado cambió. */
  const act = useCallback((action: Action): boolean => {
    const prev = ref.current;
    const { state: next, plan } = reduceWithHistory(prev, action, locale);
    if (next === prev) return false;
    ref.current = next;
    dispatch(action);
    onTransition.current?.(prev, next, action);
    if (shouldNavigate(plan, knownSlugs)) {
      if (plan.kind === "push") router.push(plan.href, plan.options);
      else router.replace(plan.href, plan.options);
    }
    return true;
  }, [knownSlugs, locale, router]);

  useEffect(() => {
    const target = intentFromPath(pathname ?? "", knownSlugs);
    if (target) act({ type: "ROUTE_CHANGED", target, origin: "route" });
  }, [pathname, knownSlugs, act]);

  return { state, act, ref, pathname: pathname ?? "" };
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
