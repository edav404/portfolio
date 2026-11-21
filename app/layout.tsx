import type { Metadata, Viewport } from "next";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { JsonLd } from "@/components/ui";
import { site } from "@/data/site";
import "./globals.css";
import "./desktop.css";

// Posicionamiento único desde content/profile.ts (CNT-01): "Desarrollador Full Stack y de automatización".
const defaultTitle = `${site.name} | ${site.role}`;

export const metadata: Metadata = {
  metadataBase: new URL(site.domain),
  title: { default: defaultTitle, template: "%s | Emmanuel Dávila" },
  description: site.description,
  applicationName: "EDAV OS",
  authors: [{ name: site.name, url: site.domain }],
  creator: site.name,
  keywords: ["desarrollador Full Stack Medellín", "automatización de procesos", "desarrollador web Medellín", "Next.js", "Power Platform", "WordPress", "WooCommerce", "Shopify"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "es_CO", url: site.domain, siteName: "EDAV OS", title: defaultTitle, description: site.description },
  twitter: { card: "summary_large_image", title: defaultTitle, description: site.description },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#167ea5", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const person = {
    "@context": "https://schema.org", "@type": "Person", name: site.name, url: site.domain, email: `mailto:${site.email}`,
    jobTitle: site.role, address: { "@type": "PostalAddress", addressLocality: "Medellín", addressCountry: "CO" },
    sameAs: [site.linkedin, site.github],
    knowsAbout: ["Desarrollo web Full Stack", "Automatización de procesos", "Power Platform", "Microsoft 365", "WordPress", "WooCommerce", "Shopify", "React", "Next.js"],
  };
  return <html lang="es"><body><JsonLd data={person}/><Header cvHref={site.cv.es}/><main id="contenido">{children}</main><Footer/></body></html>;
}
