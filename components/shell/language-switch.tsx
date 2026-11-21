"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { canonicalPath, matchPath } from "@/content/routes";

export type LanguageSwitchProps = {
  /** Ruta canónica de esta página → ruta equivalente en el otro idioma (lib/i18n/pages.ts, `languageIndex`). */
  index: Record<string, string>;
  /** Destino si la página actual no tiene equivalente (404, rutas nuevas): portada del otro idioma. */
  fallback: string;
  /** Idioma de destino (`hreflang` y `lang` del enlace). */
  targetLocale: string;
  /** Texto en el idioma de destino ("English version" / "Versión en español"). */
  label: string;
  className?: string;
  onNavigate?: () => void;
};

/** Parámetros de query que tienen sentido en la otra versión, por ruta (`?servicio=` del contacto). */
const keptParams: Partial<Record<string, readonly string[]>> = { contact: ["servicio"] };

// `?query#hash` actual. En el servidor no hay ninguno: el HTML inicial enlaza a la ruta sola y el
// cliente completa el enlace al hidratar (sin `useSearchParams`, así que sin Suspense ni HTML perdido).
function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  return () => { window.removeEventListener("hashchange", onChange); window.removeEventListener("popstate", onChange); };
}
const locationSnapshot = () => `${window.location.search}${window.location.hash}`;
const serverSnapshot = () => "";

/** Conserva los parámetros permitidos de la ruta de destino y el fragmento (las vistas comparten ids). */
export function carryOver(target: string, current: string): string {
  const url = new URL(current || "/", "https://x.invalid");
  const key = matchPath(target)?.key;
  const allowed = key ? keptParams[key] ?? [] : [];
  const query = new URLSearchParams();
  for (const name of allowed) {
    const value = url.searchParams.get(name);
    if (value) query.set(name, value);
  }
  const search = query.toString();
  return `${target}${search ? `?${search}` : ""}${url.hash}`;
}

/**
 * Enlace a la misma página en el otro idioma (D5, §2.2). Cambiar de idioma cruza de layout raíz:
 * es una recarga completa deliberada, así que no se precarga (`prefetch={false}`).
 */
export function LanguageSwitch({ index, fallback, targetLocale, label, className = "language-switch", onNavigate }: LanguageSwitchProps) {
  const pathname = usePathname();
  const current = useSyncExternalStore(subscribe, locationSnapshot, serverSnapshot);
  const target = index[canonicalPath(pathname) ?? pathname] ?? fallback;
  return <Link className={className} href={carryOver(target, current)} hrefLang={targetLocale} lang={targetLocale} prefetch={false} onClick={onNavigate}>{label}</Link>;
}
