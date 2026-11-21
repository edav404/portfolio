import { SiteShell } from "@/components/shell/site-shell";

// Páginas públicas ES: cabecera, contenido y pie.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return <SiteShell locale="es">{children}</SiteShell>;
}
