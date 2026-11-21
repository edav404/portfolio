"use client";

import { useSyncExternalStore } from "react";
import type { Announcer } from "@/lib/os/announcer";

export { MIN_GAP_MS, createAnnouncer, type Announcer } from "@/lib/os/announcer";

/** Región viva única. No se remonta: `announcer` es estable durante la vida del shell. */
export function AnnouncerRegion({ announcer }: { announcer: Announcer }) {
  const text = useSyncExternalStore(announcer.subscribe, announcer.getSnapshot, () => "");
  return <div className="xp-visually-hidden" role="status">{text}</div>;
}
