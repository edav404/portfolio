"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Raíz temática del shell público (D4): `data-theme="classic"` y, solo en la portada,
 * `data-page="home"` en el MISMO elemento (tokens.css). `usePathname()` también se resuelve en el
 * render del servidor, así que el HTML inicial ya trae el atributo correcto (sin parpadeo).
 */
export function ThemeRoot({ homeHref, children }: { homeHref: string; children: ReactNode }) {
  // Con trailingSlash la portada es "/" en ambos casos; se normaliza por si el idioma la cambia ("/en/").
  const strip = (path: string) => path.replace(/\/+$/, "") || "/";
  const isHome = strip(usePathname()) === strip(homeHref);
  return <div className="theme-root" data-theme="classic" data-page={isHome ? "home" : undefined}>{children}</div>;
}
