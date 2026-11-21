import type { Metadata, Viewport } from "next";
import { Document } from "@/components/shell/document";
import { SiteShell } from "@/components/shell/site-shell";
import { NotFoundView } from "@/components/views/not-found";
import { profile } from "@/content/profile";
import "./globals.css";
import "./desktop.css";

/**
 * 404 de toda URL sin ruta (docs/arquitectura-rutas.md §9.3): páginas ES inexistentes, slugs
 * rechazados por `dynamicParams = false`, `/api/*`, `/cv/*` y archivos de `public/` que no existen.
 * A diferencia de un `notFound()` en una página (que en Next 16.4.6 responde un HTML vacío y
 * pinta la UI al hidratar), esta página sale completa en el HTML inicial, con `lang="es"`.
 * No pasa por ningún layout: importa su CSS y define su metadata. Sin canonical (SEO-12);
 * Next añade `noindex` por el status 404. Requiere `experimental.globalNotFound` en next.config.ts.
 */
export const metadata: Metadata = {
  title: `Página no encontrada | ${profile.name}`,
  description: "La página que buscas no existe o cambió de dirección.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#167ea5", colorScheme: "light" };

export default function GlobalNotFound() {
  return <Document locale="es"><SiteShell locale="es"><NotFoundView/></SiteShell></Document>;
}
