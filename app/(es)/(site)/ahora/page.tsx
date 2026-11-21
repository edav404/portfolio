import { NowView, nowMetadata } from "@/components/views/now";

// Adaptador fino: la vista vive en components/views/now.tsx y recibe el idioma.
export const metadata = nowMetadata("es");

export default function NowPage() {
  return <NowView locale="es"/>;
}
