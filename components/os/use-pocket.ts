"use client";

import { useSyncExternalStore } from "react";
import { POCKET_QUERY } from "@/lib/os/pocket";

function subscribe(listener: () => void): () => void {
  const query = window.matchMedia(POCKET_QUERY);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

/** `true` en Pocket (≤ 768 px). El servidor y el primer render del cliente dan `false` (sin desajuste de hidratación). */
export function usePocket(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(POCKET_QUERY).matches, () => false);
}
