import { OsHomeView, osMetadata } from "@/components/views/os";

export const metadata = osMetadata("es");

export default function OsPage() {
  return <OsHomeView locale="es"/>;
}
