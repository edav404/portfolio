import type { Metadata } from "next";
import { OsLayoutView } from "@/components/views/os";

// Bajo el layout raíz EN (`app/en/layout.tsx`). Sin template.tsx.
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function OsLayout({ children }: LayoutProps<"/en/os">) {
  return <OsLayoutView locale="en">{children}</OsLayoutView>;
}
