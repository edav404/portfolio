import type { Metadata } from "next";
import { Document } from "@/components/shell/document";
import { SiteShell } from "@/components/shell/site-shell";
import { NotFoundView } from "@/components/views/not-found";
import { rootMetadata, siteViewport } from "@/lib/metadata";
import "./globals.css";

/**
 * 404 de toda URL sin ruta (docs/arquitectura-rutas.md §9.3): páginas ES inexistentes, slugs
 * rechazados por `dynamicParams = false`, `/api/*`, `/cv/*` y archivos de `public/` que no existen.
 * A diferencia de un `notFound()` en una página (que en Next 16.4.6 responde un HTML vacío y
 * pinta la UI al hidratar), esta página sale completa en el HTML inicial, con `lang="es"`.
 * No pasa por ningún layout: importa su CSS y define su metadata. Sin canonical (SEO-12);
 * Next añade `noindex` por el status 404. Requiere `experimental.globalNotFound` en next.config.ts.
 */
export const metadata: Metadata = {
  ...rootMetadata("es"),
  title: { absolute: "Página no encontrada | Emmanuel Dávila" },
  description: "La página que buscas no existe o cambió de dirección.",
};

export const viewport = siteViewport;

export default function GlobalNotFound() {
  return <Document locale="es"><SiteShell locale="es"><NotFoundView locale="es"/></SiteShell></Document>;
}
