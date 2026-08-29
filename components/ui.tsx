import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import type { Project } from "@/data/projects";

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

export function ProjectCard({ project, priority = false }: { project: Project; priority?: boolean }) {
  return (
    <article className="project-card">
      <Link href={`/proyectos/${project.slug}`} aria-label={`Ver caso de estudio ${project.title}`}>
        <div className="project-image">
          <Image src={project.image} alt={project.alt} fill sizes="(max-width: 760px) 100vw, 50vw" priority={priority} />
          <span className="project-year">{project.year}</span>
        </div>
        <div className="project-copy">
          <p className="eyebrow">{project.category}</p>
          <h3>{project.title}</h3>
          <p>{project.summary}</p>
          <span className="text-link">Abrir caso de estudio <Icon name="arrow" /></span>
        </div>
      </Link>
    </article>
  );
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
