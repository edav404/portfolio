import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { cvHref } from "@/content/site";
import type { Locale } from "@/content/types";

/**
 * Shell de las páginas públicas: cabecera, `<main>` y pie.
 * P5 añadirá aquí el wrapper `data-theme="classic"` (docs/arquitectura-rutas.md §2.1).
 */
export function SiteShell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <><Header cvHref={cvHref[locale]}/><main id="contenido">{children}</main><Footer/></>;
}
