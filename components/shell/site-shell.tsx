import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { href } from "@/content/routes";
import { cvHref } from "@/content/site";
import { ThemeRoot } from "./theme-root";
import type { Locale } from "@/content/types";
import { uiFor } from "@/content/ui";
import { languageIndex } from "@/lib/i18n/pages";

const navKeys = ["home", "projects", "services", "about", "blog", "now", "contact"] as const;

/**
 * Shell de las páginas públicas: cabecera, `<main>` y pie. Resuelve aquí (servidor) los textos y
 * enlaces de la cabecera, que es un componente cliente.
 * Todo va dentro de `ThemeRoot` (`data-theme="classic"`, `data-page="home"` en la portada); el
 * escritorio y su asistente son portales en <body> con `data-theme="xp"` (docs/arquitectura-rutas.md §2.1).
 */
export function SiteShell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const nav = uiFor(locale, "nav");
  const a11y = uiFor(locale, "a11y");
  const language = uiFor(locale, "language");
  const other = locale === "es" ? "en" : "es";
  const header = {
    copy: {
      skipToContent: a11y.skipToContent, homeLink: a11y.homeLink, openMenu: a11y.openMenu, closeMenu: a11y.closeMenu,
      mainNav: a11y.mainNav, downloadCvPdf: a11y.downloadCvPdf,
      brandName: nav.brandName, brandTagline: nav.brandTagline, cv: nav.cv, startProject: nav.startProject,
    },
    homeHref: href("home", locale),
    contactHref: href("contact", locale),
    cvHref: cvHref[locale],
    links: navKeys.map((key) => ({ href: href(key, locale), label: nav[key] })),
    // Visible también mientras EN no esté publicado: es la vía para revisarlo (P9).
    language: { index: languageIndex(locale), fallback: href("home", other), targetLocale: other, label: language.switchTo },
  };
  return <ThemeRoot homeHref={header.homeHref}><Header {...header}/><main id="contenido">{children}</main><Footer locale={locale}/></ThemeRoot>;
}
