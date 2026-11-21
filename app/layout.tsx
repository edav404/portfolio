import type { Metadata, Viewport } from "next";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { JsonLd } from "@/components/ui";
import { knowsAbout, profile } from "@/content/profile";
import { cvHref, siteName, siteUrl } from "@/content/site";
import "./globals.css";
import "./desktop.css";

// Posicionamiento único desde content/profile.ts (CNT-01): "Desarrollador Full Stack y de automatización".
const defaultTitle = `${profile.name} | ${profile.headline.es}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: defaultTitle, template: `%s | ${profile.name}` },
  description: profile.seoDescription.es,
  applicationName: siteName,
  authors: [{ name: profile.name, url: siteUrl }],
  creator: profile.name,
  keywords: ["desarrollador Full Stack Medellín", "automatización de procesos", "desarrollador web Medellín", "Next.js", "Power Platform", "WordPress", "WooCommerce", "Shopify"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "es_CO", url: siteUrl, siteName, title: defaultTitle, description: profile.seoDescription.es },
  twitter: { card: "summary_large_image", title: defaultTitle, description: profile.seoDescription.es },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#167ea5", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const person = {
    "@context": "https://schema.org", "@type": "Person", "@id": `${siteUrl}/#person`, name: profile.name, url: siteUrl, email: `mailto:${profile.contact.email}`,
    jobTitle: profile.headline.es, address: { "@type": "PostalAddress", addressLocality: "Medellín", addressCountry: "CO" },
    sameAs: [profile.contact.linkedin, profile.contact.github],
    knowsAbout: knowsAbout.es,
  };
  return <html lang="es"><body><JsonLd data={person}/><Header cvHref={cvHref.es}/><main id="contenido">{children}</main><Footer/></body></html>;
}
