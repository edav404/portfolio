import Link from "next/link";
import { notFound } from "next/navigation";
import OsShell from "@/components/os/os-shell";
import styles from "@/components/os/apps/apps.module.css";
import type { OsCopy, OsHrefs, OsProjectIndexItem, WelcomeCopy } from "@/components/os/types";
import "@/components/os/os.css";
import { people } from "@/content/people";
import { getOsProject, osProjectSlugs, osProjects, projectTitle, statusLabels } from "@/content/projects";
import { profile } from "@/content/profile";
import { href, hrefFor } from "@/content/routes";
import { cvHref } from "@/content/site";
import type { Locale } from "@/content/types";
import { format, roleInSentence } from "@/content/format";
import { uiFor } from "@/content/ui";
import { languageIndex } from "@/lib/i18n/pages";
import { resolveCredits } from "@/lib/os/credits";
import { buildMetadata } from "@/lib/metadata";
import { isOsPath } from "@/lib/os/window-url";
import { ProjectDetailPublisher } from "@/components/os/apps/project-detail";
import { osProjectDetail } from "@/lib/os-project-detail";

/**
 * Vistas de servidor de `/os/` y `/en/os/` (docs/arquitectura-os.md §1). El único módulo que resuelve
 * `ui.osShell` y el catálogo de proyectos: el shell cliente recibe todo por props (un solo idioma en el
 * bundle). El catálogo (`osProjectSlugs`) es la única fuente de parámetros, metadata y listados.
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

/** Índice lean del catálogo autorizado: lo mínimo para Welcome, la barra de tareas y las cabeceras. */
function projectIndex(locale: Locale): OsProjectIndexItem[] {
  return osProjects().map((project) => {
    const title = projectTitle(project, locale);
    return {
      slug: project.slug,
      title,
      category: project.category[locale],
      year: project.year,
      summary: project.summary[locale],
      image: project.image,
      alt: project.alt?.[locale] ?? title,
      publicHref: href("project", locale, { slug: project.slug }),
      kind: project.kind,
      ownership: project.ownership,
      status: statusLabels[project.status][locale],
      credits: resolveCredits(project.credits, people, locale),
    };
  });
}

/** Equivalentes ES↔EN de las rutas del SO (solo las del SO: el cliente elige por la ruta actual). */
function osLanguageIndex(locale: Locale): Record<string, string> {
  return Object.fromEntries(Object.entries(languageIndex(locale)).filter(([path]) => isOsPath(path)));
}

/**
 * Raíz del SO: persiste entre las rutas de `/os/…` (layout). Monta el shell cliente con el escritorio,
 * la barra de tareas y la ventana inicial ya en el HTML. El respaldo sin JS va en `<noscript>`:
 * mensaje visible, localizado y enfocable, más los proyectos como enlaces reales.
 */
export function OsLayoutView({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const text = uiFor(locale, "osShell");
  const legacy = uiFor(locale, "os");
  const projects = projectIndex(locale);
  const other: Locale = locale === "es" ? "en" : "es";
  const copy: OsCopy = {
    heading: text.heading, apps: text.apps, desktop: text.desktop, window: text.window, steps: text.steps, start: text.start,
    taskbar: text.taskbar, contextMenu: text.contextMenu, shortcuts: text.shortcuts, announce: text.announce, project: text.project, pocket: text.pocket,
    noscript: text.noscript, fallback: text.fallback,
    gallery: text.gallery, errors: text.errors, settings: text.settings, boot: text.boot, clippy: text.clippy, aboutApp: text.aboutApp,
    servicesApp: text.servicesApp, contactApp: text.contactApp, terminal: text.terminal,
    music: uiFor(locale, "music"), contactForm: uiFor(locale, "contactForm"),
  };
  const welcome: WelcomeCopy = {
    kicker: legacy.welcome.kicker,
    title: legacy.welcome.title,
    intro: format(legacy.welcome.intro, { name: profile.name, role: roleInSentence(profile.headline[locale], locale) }),
    exploreWork: legacy.welcome.exploreWork,
    startProject: legacy.welcome.startProject,
    projectsCount: format(legacy.welcome.projectsCount, { count: projects.length }),
  };
  const hrefs: OsHrefs = {
    home: href("home", locale),
    cv: cvHref[locale],
    languageIndex: osLanguageIndex(locale),
    languageFallback: hrefFor({ route: "os" }, other),
    otherLocale: other,
    owner: profile.name,
  };
  const noscript = (
    <noscript>
      <div className={styles.noscript}>
        <p>{text.noscript.message} <Link href={href("home", locale)}>{text.noscript.link}</Link></p>
        <h2 className={styles.heading}>{text.fallback.projectsTitle}</h2>
        <p>{format(text.fallback.projectsCount, { count: projects.length })}</p>
        <ul>
          {projects.map((project) => (
            <li key={project.slug}><Link href={href("osProject", locale, { slug: project.slug })}>{project.title}</Link></li>
          ))}
        </ul>
      </div>
    </noscript>
  );
  return (
    <OsShell locale={locale} copy={copy} welcome={welcome} projects={projects} knownSlugs={osProjectSlugs} hrefs={hrefs} noscript={noscript}>
      {children}
    </OsShell>
  );
}

/** `/os/`: el escritorio lo pinta el layout; la página no aporta contenido. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- mismo contrato que `OsProjectView` (las páginas pasan el idioma)
export function OsHomeView(_props: { locale: Locale }) {
  return null;
}

/**
 * Detalle de UN proyecto del catálogo (solo sus datos, serializables). Slug fuera del catálogo: 404. No
 * pinta nada: entrega los datos al shell, que los conserva por slug; cada ventana los pinta y su
 * cabecera (portada, resumen, pie) sale del índice.
 */
export function OsProjectView({ locale, slug }: { locale: Locale; slug: string }) {
  const project = getOsProject(slug);
  if (!project) notFound();
  const data = osProjectDetail(project.slug, locale)!;
  return <ProjectDetailPublisher slug={project.slug} data={data}/>;
}
