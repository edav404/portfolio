import type { ProjectDetailData } from "@/components/os/apps/project-detail";
import { getOsProject } from "@/content/projects";
import type { Locale } from "@/content/types";

/**
 * Detalle serializable de un proyecto del catálogo autorizado del SO (docs/arquitectura-os.md §1.2).
 * Lo usan la página del slug (HTML y RSC) y el endpoint bajo demanda `/api/os-project/<idioma>/<slug>/`,
 * que sirve a las ventanas cuyo detalle no llegó por navegación (p. ej. una navegación que Next descartó).
 * `null` si el slug no está en el catálogo.
 */
export function osProjectDetail(slug: string, locale: Locale): ProjectDetailData | null {
  const project = getOsProject(slug);
  if (!project) return null;
  return {
    client: project.client[locale],
    location: project.location[locale],
    challenge: project.challenge[locale],
    solution: project.solution[locale],
    ...(project.myRole ? { myRole: project.myRole[locale] } : {}),
    services: [...project.services[locale]],
    technologies: [...project.technologies],
    links: (project.links ?? []).map((link) => ({ href: link.href, label: link.label[locale] })),
  };
}
