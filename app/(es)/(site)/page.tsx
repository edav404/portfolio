import { HomeView, homeMetadata } from "@/components/views/home";

// Adaptador fino: la vista vive en components/views/home.tsx y recibe el idioma.
export const metadata = homeMetadata("es");

export default function HomePage() {
  return <HomeView locale="es"/>;
}
