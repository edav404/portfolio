"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { Locale } from "@/content/types";
import { intentFromPath, samePath, shouldNavigate } from "@/lib/os/window-url";
import { createInitialState, reduceWithHistory, reduce, type Action, type OsState } from "@/lib/os/window-reducer";

/** Tiempo máximo que una navegación puede quedar sin confirmar antes de darla por cancelada. */
export const NAV_TIMEOUT_MS = 10_000;

export type Transition = (prev: OsState, next: OsState, action: Action) => void;

/**
 * Estado del escritorio + puente con el router (docs/arquitectura-os.md §1.3, §12).
 * - El estado inicial sale de la URL (sin desajuste de hidratación).
 * - `act` calcula la transición y el plan de historial con `reduceWithHistory`, despacha al reducer
 *   y ejecuta `router.push/replace(href, { scroll: false })` solo para acciones del usuario.
 *   Antes de navegar se valida el slug contra el catálogo (un 404 por RSC rompería el shell).
 * - La navegación lanzada queda como intención PENDIENTE en el reducer (aparte del historial confirmado):
 *   Next descarta una navegación pendiente si llega otra, así que solo `ROUTE_CHANGED` (la ruta observada)
 *   confirma entradas. Si no se confirma en `NAV_TIMEOUT_MS`, `NAV_TIMEOUT` la cancela (las ventanas
 *   optimistas siguen abiertas, la selección vuelve a la URL real).
 * - `usePathname` despacha `ROUTE_CHANGED` (origen "route") solo cuando la ruta OBSERVADA cambia de verdad:
 *   transición idempotente, nunca navega.
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

  // Ruta observada: solo un cambio real de pathname (no cada re-ejecución del efecto) reconcilia con la intención pendiente.
  const observed = useRef(pathname ?? "");
  useEffect(() => {
    const current = pathname ?? "";
    if (samePath(observed.current, current)) return;
    observed.current = current;
    const target = intentFromPath(current, knownSlugs);
    if (target) act({ type: "ROUTE_CHANGED", target, origin: "route" });
  }, [pathname, knownSlugs, act]);

  useEffect(() => {
    if (state.pending === null) return;
    const timer = setTimeout(() => act({ type: "NAV_TIMEOUT", origin: "route" }), NAV_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [state.pending, act]);

  return { state, act, ref, pathname: pathname ?? "" };
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
