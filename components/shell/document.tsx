import { JsonLd } from "@/components/ui";
import { knowsAbout, profile } from "@/content/profile";
import { siteUrl } from "@/content/site";
import type { Locale } from "@/content/types";
import { LocaleProvider } from "@/lib/i18n/locale-context";

/**
 * Documento HTML de un layout raíz por idioma (D1 de docs/arquitectura-rutas.md).
 * `<html>` solo lleva `lang`: el tema va en el wrapper del layout anidado (D4, P5).
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
  return <html lang={locale}><body><JsonLd data={person}/><LocaleProvider locale={locale}>{children}</LocaleProvider></body></html>;
}
