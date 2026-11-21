import { OsProjectView, osProjectMetadata, osProjectParams } from "@/components/views/os";

// Catálogo del SO (osProjectSlugs): un slug fuera de él no se renderiza (404).
export const dynamicParams = false;

export function generateStaticParams() {
  return osProjectParams();
}

export async function generateMetadata({ params }: PageProps<"/os/proyectos/[slug]">) {
  return osProjectMetadata("es", (await params).slug);
}

export default async function OsProjectPage({ params }: PageProps<"/os/proyectos/[slug]">) {
  return <OsProjectView locale="es" slug={(await params).slug}/>;
}
