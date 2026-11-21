/**
 * Adaptador temporal: expone la vista en español de `content/projects.ts`
 * con la forma que consume la UI actual. Se elimina cuando la UI lea
 * `content/` directamente (Fases 3–5).
 *
 * Solo incluye proyectos con portada: los personales y las automatizaciones
 * se muestran cuando la galería con filtros esté lista (Fase 4).
 */
import { projects as allProjects, projectTitle } from "@/content/projects";

export type Project = {
  slug: string;
  title: string;
  year: string;
  client: string;
  location: string;
  category: string;
  image: string;
  alt: string;
  summary: string;
  challenge: string;
  solution: string;
  services: string[];
  technologies: string[];
};

export const projects: Project[] = allProjects
  .filter((project) => project.image)
  .map((project) => ({
    slug: project.slug,
    title: projectTitle(project, "es"),
    year: project.year,
    client: project.client.es,
    location: project.location.es,
    category: project.category.es,
    image: project.image!,
    alt: project.alt?.es ?? projectTitle(project, "es"),
    summary: project.summary.es,
    challenge: project.challenge.es,
    solution: project.solution.es,
    services: project.services.es,
    technologies: project.technologies,
  }));

export const featuredProjects = projects.slice(0, 6);

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}
