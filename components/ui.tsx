import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import { profile } from "@/content/profile";
import { type CaseStudy, projectTitle } from "@/content/projects";
import { href } from "@/content/routes";
import { cvHref } from "@/content/site";
import type { Locale } from "@/content/types";
import { format, uiFor } from "@/content/ui";

export function Window({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`window ${className}`}>
      <div className="window-bar"><span>{title}</span><div className="window-controls" aria-hidden="true"><i/><i/><i/></div></div>
      <div className="window-body">{children}</div>
    </div>
  );
}

export function Cta({ href, children, secondary = false }: { href: string; children: ReactNode; secondary?: boolean }) {
  return <Link href={href} className={secondary ? "button button-secondary" : "button"}>{children}<Icon name="arrow" /></Link>;
}

export function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) {
  return <div className="section-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{copy && <p>{copy}</p>}</div>;
}

/**
 * Kit de contacto directo (UX-02): CV ES/EN, correo, LinkedIn y GitHub.
 * Datos desde `content/profile.ts` y `content/site.ts`; las rutas del CV las sirve `app/cv/[file]`.
 */
export function ContactKit({ locale, className = "", label }: { locale: Locale; className?: string; label?: string }) {
  const copy = uiFor(locale, "contactKit");
  return (
    <ul className={`contact-kit ${className}`.trim()} aria-label={label ?? copy.label}>
      <li><a href={cvHref.es} type="application/pdf" hrefLang={locale === "es" ? undefined : "es"} lang={locale === "es" ? undefined : "es"}><Icon name="download" />{copy.cvEs} <small>{copy.pdf}</small></a></li>
      <li><a href={cvHref.en} type="application/pdf" hrefLang={locale === "en" ? undefined : "en"} lang={locale === "en" ? undefined : "en"}><Icon name="download" />{copy.cvEn} <small>{copy.pdf}</small></a></li>
      <li><a href={`mailto:${profile.contact.email}`}><Icon name="mail" />{profile.contact.email}</a></li>
      <li><a href={profile.contact.linkedin} target="_blank" rel="me noreferrer"><Icon name="linkedin" />{copy.linkedin}</a></li>
      <li><a href={profile.contact.github} target="_blank" rel="me noreferrer"><Icon name="github" />{copy.github}</a></li>
    </ul>
  );
}

/**
 * Tarjeta de proyecto. `priority` de next/image está deprecado en Next 16 (PERF-04):
 * `eager` usa `fetchPriority="high"` y solo debe marcarse en la imagen LCP real.
 */
export function ProjectCard({ project, locale, eager = false }: { project: CaseStudy; locale: Locale; eager?: boolean }) {
  const title = projectTitle(project, locale);
  const copy = uiFor(locale, "project");
  return (
    <article className="project-card">
      <Link href={href("project", locale, { slug: project.slug })} aria-label={format(copy.viewCaseStudy, { title })}>
        <div className="project-image">
          <Image src={project.image} alt={project.alt?.[locale] ?? title} fill sizes="(max-width: 760px) 100vw, 50vw" fetchPriority={eager ? "high" : undefined} />
          <span className="project-year">{project.year}</span>
        </div>
        <div className="project-copy">
          <p className="eyebrow">{project.category[locale]}</p>
          <h3>{title}</h3>
          <p>{project.summary[locale]}</p>
          <span className="text-link">{copy.openCaseStudy} <Icon name="arrow" /></span>
        </div>
      </Link>
    </article>
  );
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
