import { AboutView, aboutMetadata } from "@/components/views/about";

// Adaptador fino: la vista vive en components/views/about.tsx y recibe el idioma.
export const metadata = aboutMetadata("en");

export default function AboutPage() {
  return <AboutView locale="en"/>;
}
