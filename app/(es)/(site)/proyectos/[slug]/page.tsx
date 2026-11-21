import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cta, JsonLd } from "@/components/ui";
import { profile } from "@/content/profile";
import { caseStudies, getCaseStudy, projectTitle, statusLabels } from "@/content/projects";
import { siteUrl } from "@/content/site";
import { buildMetadata } from "@/lib/metadata";

// Vista ES; la versión /en/ llegará con el árbol de rutas i18n.
const locale = "es";

// Catálogo finito: un slug desconocido no se renderiza (lo atiende app/global-not-found.tsx).
export const dynamicParams = false;

export function generateStaticParams() { return caseStudies.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const project = getCaseStudy(slug); if (!project) return {};
  const title = projectTitle(project, locale);
  return buildMetadata({
    route: "project", params: { slug: project.slug }, locale,
    title: `${title} — Caso de estudio`, description: project.summary[locale],
    image: { url: project.image, alt: project.alt?.[locale] ?? title },
  });
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const caseStudy = getCaseStudy((await params).slug); if (!caseStudy) notFound();
  // Vista localizada con la forma que usa el JSX de abajo.
  const project = {
    slug: caseStudy.slug, year: caseStudy.year, image: caseStudy.image, technologies: caseStudy.technologies,
    title: projectTitle(caseStudy, locale), alt: caseStudy.alt?.[locale] ?? projectTitle(caseStudy, locale),
    summary: caseStudy.summary[locale], challenge: caseStudy.challenge[locale], solution: caseStudy.solution[locale],
    client: caseStudy.client[locale], location: caseStudy.location[locale], category: caseStudy.category[locale],
    services: caseStudy.services[locale], status: statusLabels[caseStudy.status][locale],
  };
  const faq = [
    { q: `¿Qué se hizo en el proyecto ${project.title}?`, a: project.solution },
    { q: `¿Qué tecnologías se utilizaron en ${project.title}?`, a: project.technologies.join(", ") + "." },
    { q: "¿Emmanuel desarrolla proyectos similares?", a: "Sí. Cada solución se adapta al negocio, la identidad, el contenido y los objetivos concretos del proyecto." },
  ];
  const schema = { "@context": "https://schema.org", "@type": "CreativeWork", name: project.title, creator: { "@type": "Person", "@id": `${siteUrl}/#person`, name: profile.name }, description: project.summary, image: `${siteUrl}${project.image}`, dateCreated: project.year, url: `${siteUrl}/proyectos/${project.slug}/` };
  const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
  return <><JsonLd data={schema}/><JsonLd data={faqSchema}/><article><header className="project-hero section-shell"><nav className="breadcrumbs" aria-label="Migas de pan"><Link href="/">Inicio</Link><span>/</span><Link href="/proyectos">Proyectos</Link><span>/</span><span aria-current="page">{project.title}</span></nav><p className="eyebrow">{project.category} · {project.year}</p><h1>{project.title}</h1><p>{project.summary}</p><Cta href="/contacto">Quiero un proyecto similar</Cta></header><div className="project-cover section-shell"><Image src={project.image} alt={project.alt} fill fetchPriority="high" sizes="100vw"/></div><section className="section-shell case-grid"><aside><dl><div><dt>Cliente</dt><dd>{project.client}</dd></div><div><dt>Ubicación</dt><dd>{project.location}</dd></div><div><dt>Año</dt><dd>{project.year}</dd></div><div><dt>Estado</dt><dd><span className="status-inline">{project.status}</span></dd></div></dl></aside><div className="case-content"><section><p className="eyebrow">TL;DR</p><h2>La solución en breve</h2><p>{project.solution}</p></section><section><h2>El reto</h2><p>{project.challenge}</p></section><section><h2>Qué construí</h2><ul>{project.services.map((service) => <li key={service}>{service}</li>)}</ul></section><section><h2>Tecnologías</h2><table><thead><tr><th>Área</th><th>Herramientas</th></tr></thead><tbody><tr><td>Implementación</td><td>{project.technologies.join(", ")}</td></tr><tr><td>Enfoque</td><td>Responsive, accesibilidad, rendimiento y facilidad de edición</td></tr></tbody></table></section></div></section><section className="section-shell faq-section"><p className="eyebrow">Preguntas frecuentes</p><h2>Sobre este proyecto</h2>{faq.map(({ q, a }) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section><section className="section-shell final-cta"><div><p className="eyebrow">Siguiente paso</p><h2>Tu proyecto podría ser el próximo caso.</h2></div><Cta href="/contacto">Cuéntame tu idea</Cta></section></article></>;
}
