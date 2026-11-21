import { ProjectView, projectMetadata, projectParams } from "@/components/views/project";

// Catálogo finito: un slug desconocido no se renderiza (lo atiende app/global-not-found.tsx).
export const dynamicParams = false;

export function generateStaticParams() {
  return projectParams();
}

export async function generateMetadata({ params }: PageProps<"/proyectos/[slug]">) {
  return projectMetadata("es", (await params).slug);
}

export default async function ProjectPage({ params }: PageProps<"/proyectos/[slug]">) {
  return <ProjectView locale="es" slug={(await params).slug}/>;
}
