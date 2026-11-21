import { Document } from "@/components/shell/document";
import { rootMetadata, siteViewport } from "@/lib/metadata";
import "../globals.css";
import "../desktop.css";

// Sin canonical ni openGraph: cada página los define completos con buildMetadata (D8).
export const metadata = rootMetadata("es");

export const viewport = siteViewport;

// Layout raíz ES (D1): `<html lang="es">`. El árbol EN tendrá su propio layout raíz (P6).
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <Document locale="es">{children}</Document>;
}
