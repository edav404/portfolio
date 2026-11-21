import { ProjectsView, projectsMetadata } from "@/components/views/projects";

// Adaptador fino: la vista vive en components/views/projects.tsx y recibe el idioma.
export const metadata = projectsMetadata("es");

export default function ProjectsPage() {
  return <ProjectsView locale="es"/>;
}
