import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cta, JsonLd } from "@/components/ui";
import { profile } from "@/content/profile";
import { caseStudies, getCaseStudy, projectTitle } from "@/content/projects";
import { href } from "@/content/routes";
import { siteUrl } from "@/content/site";
import type { Locale } from "@/content/types";
import { format, uiFor } from "@/content/ui";
import { absoluteUrl, buildMetadata } from "@/lib/metadata";

/** Parámetros de `/proyectos/[slug]/` (mismo slug en todos los idiomas). */
export function projectParams() {
  return caseStudies.map(({ slug }) => ({ slug }));
}

export function projectMetadata(locale: Locale, slug: string) {
  const project = getCaseStudy(slug);
  if (!project) return {};
  const title = projectTitle(project, locale);
  return buildMetadata({
    route: "project", params: { slug: project.slug }, locale,
    title: format(uiFor(locale, "project").caseStudyTitle, { title }), description: project.summary[locale],
    image: { url: project.image, alt: project.alt?.[locale] ?? title },
  });
}

export function ProjectView({ locale, slug }: { locale: Locale; slug: string }) {
  const caseStudy = getCaseStudy(slug);
  if (!caseStudy) notFound();
  const copy = uiFor(locale, "project");
  const nav = uiFor(locale, "nav");
  const common = uiFor(locale, "common");
  const a11y = uiFor(locale, "a11y");
  // Vista localizada con la forma que usa el JSX de abajo.
  const project = {
    slug: caseStudy.slug, year: caseStudy.year, image: caseStudy.image, technologies: caseStudy.technologies,
    title: projectTitle(caseStudy, locale), alt: caseStudy.alt?.[locale] ?? projectTitle(caseStudy, locale),
    summary: caseStudy.summary[locale], challenge: caseStudy.challenge[locale], solution: caseStudy.solution[locale],
    client: caseStudy.client[locale], location: caseStudy.location[locale], category: caseStudy.category[locale],
    services: caseStudy.services[locale], status: copy.statusLabels[caseStudy.status],
  };
  const faq = [
    { q: format(copy.faqWhat, { title: project.title }), a: project.solution },
    { q: format(copy.faqTech, { title: project.title }), a: project.technologies.join(", ") + "." },
    { q: copy.faqSimilar, a: copy.faqSimilarAnswer },
  ];
  const url = absoluteUrl(href("project", locale, { slug: project.slug }));
  const schema = { "@context": "https://schema.org", "@type": "CreativeWork", name: project.title, creator: { "@type": "Person", "@id": `${siteUrl}/#person`, name: profile.name }, description: project.summary, image: absoluteUrl(project.image), dateCreated: project.year, url };
  const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
  const contact = href("contact", locale);
  return <><JsonLd data={schema}/><JsonLd data={faqSchema}/><article><header className="project-hero section-shell"><nav className="breadcrumbs" aria-label={a11y.breadcrumbs}><Link href={href("home", locale)}>{nav.home}</Link><span>/</span><Link href={href("projects", locale)}>{nav.projects}</Link><span>/</span><span aria-current="page">{project.title}</span></nav><p className="eyebrow">{project.category} · {project.year}</p><h1>{project.title}</h1><p>{project.summary}</p><Cta href={contact}>{copy.similarCta}</Cta></header><div className="project-cover section-shell"><Image src={project.image} alt={project.alt} fill fetchPriority="high" sizes="100vw"/></div><section className="section-shell case-grid"><aside><dl><div><dt>{copy.client}</dt><dd>{project.client}</dd></div><div><dt>{copy.location}</dt><dd>{project.location}</dd></div><div><dt>{copy.year}</dt><dd>{project.year}</dd></div><div><dt>{copy.status}</dt><dd><span className="status-inline">{project.status}</span></dd></div></dl></aside><div className="case-content"><section><p className="eyebrow">{common.tldr}</p><h2>{copy.solutionTitle}</h2><p>{project.solution}</p></section><section><h2>{copy.challengeTitle}</h2><p>{project.challenge}</p></section><section><h2>{copy.builtTitle}</h2><ul>{project.services.map((service) => <li key={service}>{service}</li>)}</ul></section><section><h2>{copy.technologiesTitle}</h2><table><thead><tr><th>{copy.areaHeader}</th><th>{copy.toolsHeader}</th></tr></thead><tbody><tr><td>{copy.implementation}</td><td>{project.technologies.join(", ")}</td></tr><tr><td>{copy.approach}</td><td>{copy.approachValue}</td></tr></tbody></table></section></div></section><section className="section-shell faq-section"><p className="eyebrow">{common.faq}</p><h2>{copy.faqTitle}</h2>{faq.map(({ q, a }) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section><section className="section-shell final-cta"><div><p className="eyebrow">{common.nextStep}</p><h2>{copy.nextTitle}</h2></div><Cta href={contact}>{copy.nextCta}</Cta></section></article></>;
}
