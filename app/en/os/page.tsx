import { OsHomeView, osMetadata } from "@/components/views/os";

export const metadata = osMetadata("en");

export default function OsPage() {
  return <OsHomeView locale="en"/>;
}
