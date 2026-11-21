import { Document } from "@/components/shell/document";
import { rootMetadata, siteViewport } from "@/lib/metadata";
import "../globals.css";

// Sin canonical ni openGraph: cada página los define completos con buildMetadata (D8).
export const metadata = rootMetadata("en");

export const viewport = siteViewport;

// Layout raíz EN (D1, con la simplificación de §8: raíz directa bajo `app/en/`, sin grupo `(en)`).
// Cruzar entre `/` y `/en/` es una recarga completa (§2.2).
export default function RootLayout({ children }: LayoutProps<"/en">) {
  return <Document locale="en">{children}</Document>;
}
