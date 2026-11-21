"use client";

import { useCallback, useState, type KeyboardEvent } from "react";

/**
 * Roving tabindex: una sola parada de Tab en el grupo y flechas para recorrerlo. Cada elemento lleva
 * `data-roving="<clave>"`; `tabIndexFor` da el tabindex y `onFocusItem` fija la parada actual.
 * Si la clave actual deja de existir, la parada es la primera.
 */
export function useRoving(keys: readonly string[], axis: "horizontal" | "both") {
  const [current, setCurrent] = useState<string | null>(null);
  const active = current !== null && keys.includes(current) ? current : (keys[0] ?? null);

  const tabIndexFor = useCallback((key: string) => (key === active ? 0 : -1), [active]);
  const onFocusItem = useCallback((key: string) => setCurrent(key), []);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    const item = (event.target as HTMLElement).closest<HTMLElement>("[data-roving]");
    if (!item || !event.currentTarget.contains(item)) return;
    const index = keys.indexOf(item.dataset.roving ?? "");
    if (index < 0) return;
    const forward = axis === "both" ? ["ArrowRight", "ArrowDown"] : ["ArrowRight"];
    const backward = axis === "both" ? ["ArrowLeft", "ArrowUp"] : ["ArrowLeft"];
    let next = -1;
    if (forward.includes(event.key)) next = (index + 1) % keys.length;
    else if (backward.includes(event.key)) next = (index - 1 + keys.length) % keys.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = keys.length - 1;
    if (next < 0) return;
    event.preventDefault();
    const target = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[data-roving]")).find((el) => el.dataset.roving === keys[next]);
    target?.focus({ preventScroll: true });
  }, [axis, keys]);

  return { tabIndexFor, onFocusItem, onKeyDown };
}
