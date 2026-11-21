import { ContactView, contactMetadata } from "@/components/views/contact";

// Adaptador fino: la vista vive en components/views/contact.tsx y recibe el idioma.
export const metadata = contactMetadata("es");

export default function ContactPage() {
  return <ContactView locale="es"/>;
}
