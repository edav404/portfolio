"use client";

/**
 * Idioma de la página para componentes cliente (docs/arquitectura-rutas.md §4.3).
 * Solo transporta el `Locale`: los textos llegan ya resueltos por props desde el servidor.
 */
import { createContext, useContext, type ReactNode } from "react";
import { defaultLocale, type Locale } from "@/content/types";

const LocaleContext = createContext<Locale>(defaultLocale);

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}
