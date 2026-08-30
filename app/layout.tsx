import type { Metadata, Viewport } from "next";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { JsonLd } from "@/components/ui";
import { site } from "@/data/site";
import "./globals.css";
import "./desktop.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.domain),
  title: { default: "Emmanuel Dávila | Desarrollo y diseño web", template: "%s | Emmanuel Dávila" },
  description: site.description,
  applicationName: "EDAV OS",
  authors: [{ name: site.name, url: site.domain }],
  creator: site.name,
  keywords: ["desarrollador web Medellín", "diseñador web", "WordPress", "WooCommerce", "Shopify", "desarrollo Full Stack"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "es_CO", url: site.domain, siteName: "EDAV OS", title: "Emmanuel Dávila — Desarrollo y diseño web", description: site.description },
  twitter: { card: "summary_large_image", title: "Emmanuel Dávila — Desarrollo y diseño web", description: site.description },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#167ea5", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const person = {
    "@context": "https://schema.org", "@type": "Person", name: site.name, url: site.domain,
    jobTitle: site.role, address: { "@type": "PostalAddress", addressLocality: "Medellín", addressCountry: "CO" },
    knowsAbout: ["Desarrollo web", "Diseño web", "WordPress", "WooCommerce", "Shopify", "React", "Next.js"],
  };
  return <html lang="es"><body><JsonLd data={person}/><Header/><main id="contenido">{children}</main><Footer/></body></html>;
}
