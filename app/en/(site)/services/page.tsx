import { ServicesView, servicesMetadata } from "@/components/views/services";

// Adaptador fino: la vista vive en components/views/services.tsx y recibe el idioma.
export const metadata = servicesMetadata("en");

export default function ServicesPage() {
  return <ServicesView locale="en"/>;
}
