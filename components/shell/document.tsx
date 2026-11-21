import { JsonLd } from "@/components/ui";
import { knowsAbout, profile } from "@/content/profile";
import { siteUrl } from "@/content/site";
import type { Locale } from "@/content/types";
import { fontVariables } from "@/lib/fonts";
import { LocaleProvider } from "@/lib/i18n/locale-context";

/**
 * Documento HTML de un layout raíz por idioma (D1 de docs/arquitectura-rutas.md).
 * `<html>` lleva `lang` y las variables de next/font (lib/fonts.ts); el tema va en el wrapper del
 * shell (D4): `SiteShell` → classic, portales del escritorio → xp.
 * Incluye el JSON-LD `Person` (`@id …/#person`), común a todas las páginas del idioma, y el
 * `LocaleProvider` para los componentes cliente.
 */
export function Document({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const person = {
    "@context": "https://schema.org", "@type": "Person", "@id": `${siteUrl}/#person`, name: profile.name, url: siteUrl, email: `mailto:${profile.contact.email}`,
    jobTitle: profile.headline[locale], address: { "@type": "PostalAddress", addressLocality: "Medellín", addressCountry: "CO" },
    sameAs: [profile.contact.linkedin, profile.contact.github],
    knowsAbout: knowsAbout[locale],
  };
  return <html lang={locale} className={fontVariables}><body><JsonLd data={person}/><LocaleProvider locale={locale}>{children}</LocaleProvider></body></html>;
}
