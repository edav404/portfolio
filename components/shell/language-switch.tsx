"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type LanguageSwitchProps = {
  /** Ruta de esta página → ruta equivalente en el otro idioma (lib/i18n/pages.ts, `languageIndex`). */
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

/**
 * Enlace a la misma página en el otro idioma (D5, §2.2). Cambiar de idioma cruza de layout raíz:
 * es una recarga completa deliberada, así que no se precarga (`prefetch={false}`).
 */
export function LanguageSwitch({ index, fallback, targetLocale, label, className = "language-switch", onNavigate }: LanguageSwitchProps) {
  const pathname = usePathname();
  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const target = index[path] ?? fallback;
  return <Link className={className} href={target} hrefLang={targetLocale} lang={targetLocale} prefetch={false} onClick={onNavigate}>{label}</Link>;
}
