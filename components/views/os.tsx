import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOsProject, osProjectSlugs, osProjects, projectTitle } from "@/content/projects";
import { href } from "@/content/routes";
import type { Locale } from "@/content/types";
import { format, uiFor } from "@/content/ui";
import { buildMetadata } from "@/lib/metadata";

/**
 * Vistas de servidor de `/os/` y `/en/os/` (docs/arquitectura-os.md §1). Por ahora: el SSR del
 * escritorio vacío ("en construcción") y el respaldo sin JS. O4 monta aquí el shell cliente.
 * El catálogo (`osProjectSlugs`) es la única fuente de parámetros, metadata y listados.
 */

/** Parámetros de `/os/proyectos/[slug]/` y `/en/os/projects/[slug]/` (mismo slug en ambos idiomas). */
export function osProjectParams() {
  return osProjectSlugs.map((slug) => ({ slug }));
}

/** `noindex, follow`, canonical y `og:url` propios; sin hreflang (ruta no indexable). */
export function osMetadata(locale: Locale) {
  const { meta } = uiFor(locale, "osShell");
  return buildMetadata({ route: "os", locale, title: meta.title, description: meta.description });
}

export function osProjectMetadata(locale: Locale, slug: string) {
  const project = getOsProject(slug);
  if (!project) return {};
  const { meta } = uiFor(locale, "osShell");
  const title = projectTitle(project, locale);
  return buildMetadata({
    route: "osProject", params: { slug: project.slug }, locale,
    title: format(meta.projectTitle, { title }), description: project.summary[locale],
    image: { url: project.image, alt: project.alt?.[locale] ?? title },
  });
}

/** Raíz del SO: persiste entre las rutas de `/os/…`. `<noscript>` visible, localizado y enfocable. */
export function OsLayoutView({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const copy = uiFor(locale, "osShell");
  return (
    <div className="os-root" data-theme="xp">
      <noscript>
        <p>{copy.noscript.message} <Link href={href("home", locale)}>{copy.noscript.link}</Link></p>
      </noscript>
      <h1 className="sr-only">{copy.heading}</h1>
      {children}
    </div>
  );
}

/** Escritorio vacío de `/os/`: título, descripción y los proyectos autorizados como enlaces reales. */
export function OsHomeView({ locale }: { locale: Locale }) {
  const copy = uiFor(locale, "osShell");
  const projects = osProjects();
  return (
    <main id="os-desktop">
      <h2>{copy.fallback.title}</h2>
      <p>{copy.fallback.lead}</p>
      <section aria-labelledby="os-fallback-projects">
        <h3 id="os-fallback-projects">{copy.fallback.projectsTitle}</h3>
        <p>{format(copy.fallback.projectsCount, { count: projects.length })}</p>
        <ul>
          {projects.map((project) => (
            <li key={project.slug}>
              <Link href={href("osProject", locale, { slug: project.slug })}>{projectTitle(project, locale)}</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

/** Detalle de UN proyecto del catálogo (solo sus datos). Slug fuera del catálogo: 404. */
export function OsProjectView({ locale, slug }: { locale: Locale; slug: string }) {
  const project = getOsProject(slug);
  if (!project) notFound();
  const copy = uiFor(locale, "osShell");
  const title = projectTitle(project, locale);
  return (
    <main id="os-desktop">
      <article>
        <h2>{title}</h2>
        <p>{project.category[locale]} · {project.year}</p>
        <Image src={project.image} alt={project.alt?.[locale] ?? title} width={640} height={400} sizes="(max-width: 768px) 100vw, 640px"/>
        <p>{project.summary[locale]}</p>
        <p>
          <Link href={href("project", locale, { slug: project.slug })}>{copy.fallback.openPublic}</Link>
          {" "}
          <Link href={href("os", locale)}>{copy.fallback.backToOs}</Link>
        </p>
      </article>
    </main>
  );
}
