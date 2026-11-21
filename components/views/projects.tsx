import { ProjectCard, SectionHeading } from "@/components/ui";
import { pageFor } from "@/content/pages";
import { caseStudies } from "@/content/projects";
import type { Locale } from "@/content/types";
import { format, uiFor } from "@/content/ui";
import { buildMetadata } from "@/lib/metadata";

export function projectsMetadata(locale: Locale) {
  const { seo } = pageFor(locale, "projects");
  return buildMetadata({ route: "projects", locale, title: seo.title, description: seo.description });
}

export function ProjectsView({ locale }: { locale: Locale }) {
  const page = pageFor(locale, "projects");
  const copy = uiFor(locale, "project");
  return <><section className="page-hero section-shell"><p className="eyebrow">{page.hero.eyebrow}</p><h1>{page.hero.title}</h1><p>{page.hero.lead}</p><a className="button" href="#catalogo">{page.hero.cta}</a></section><section className="section-shell section-block" id="catalogo"><SectionHeading eyebrow={format(copy.documentedCount, { count: caseStudies.length })} title={page.catalog.title} copy={page.catalog.copy}/><div className="project-grid">{caseStudies.map((project) => <ProjectCard key={project.slug} project={project} locale={locale}/>)}</div></section></>;
}
