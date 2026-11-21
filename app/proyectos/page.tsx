import type { Metadata } from "next";
import { ProjectCard, SectionHeading } from "@/components/ui";
import { projects } from "@/data/projects";

export const metadata: Metadata = { title: "Proyectos de desarrollo web y e-commerce", description: "Casos de estudio de Emmanuel Dávila, desarrollador Full Stack y de automatización: desarrollo web, WordPress, WooCommerce, Shopify y e-commerce.", alternates: { canonical: "/proyectos" } };

export default function ProjectsPage() {
  return <><section className="page-hero section-shell"><p className="eyebrow">C:\EDAV\PROYECTOS</p><h1>Trabajo real, proceso visible.</h1><p>Una colección de proyectos personales, académicos y para clientes en Colombia, México y Estados Unidos.</p><a className="button" href="#catalogo">Explorar catálogo</a></section><section className="section-shell section-block" id="catalogo"><SectionHeading eyebrow={`${projects.length} casos documentados`} title="Todos los proyectos." copy="Cada caso resume el reto, las decisiones de diseño, la solución y las tecnologías utilizadas."/><div className="project-grid">{projects.map((project) => <ProjectCard key={project.slug} project={project}/>)}</div></section></>;
}
