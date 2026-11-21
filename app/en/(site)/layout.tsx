import { SiteShell } from "@/components/shell/site-shell";

// Páginas públicas EN: cabecera, contenido y pie (mismo shell y tema que ES).
export default function SiteLayout({ children }: LayoutProps<"/en">) {
  return <SiteShell locale="en">{children}</SiteShell>;
}
