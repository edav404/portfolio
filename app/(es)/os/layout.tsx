import type { Metadata } from "next";
import { OsLayoutView } from "@/components/views/os";

// Red de seguridad: el SO no se indexa (cada página repite el noindex con osMetadata). Sin template.tsx.
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function OsLayout({ children }: LayoutProps<"/os">) {
  return <OsLayoutView locale="es">{children}</OsLayoutView>;
}
