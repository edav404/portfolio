/**
 * Tipos compartidos del shell del SO (cliente). Solo tipos: `import type` no llega al bundle, así que
 * el copy sigue resolviéndose en el servidor (components/views/os.tsx) y llega por props.
 */
import type { Ownership, ProjectKind } from "@/content/projects";
import type { Resolved, Ui } from "@/content/ui";
import type { OsCredit } from "@/lib/os/credits";
import type { ContactFormCopy } from "@/components/contact-form";
import type { MusicCopy } from "@/components/music-widget";

export type OsShellText = Resolved<Ui["osShell"]>;

/** Subconjunto del copy `ui.osShell` que viaja al cliente. */
export type OsCopy = Pick<OsShellText, "heading" | "apps" | "desktop" | "window" | "steps" | "start" | "taskbar" | "contextMenu" | "shortcuts" | "announce" | "project" | "pocket" | "noscript" | "fallback"
  | "gallery" | "errors" | "settings" | "boot" | "clippy" | "aboutApp" | "servicesApp" | "contactApp" | "terminal"> & {
  /** Textos del reproductor y del formulario (secciones `music` y `contactForm`, resueltas en el servidor). */
  music: MusicCopy;
  contactForm: ContactFormCopy;
};

/** Textos de la ventana Welcome (ya formateados en el servidor). */
export type WelcomeCopy = {
  kicker: string;
  title: string;
  intro: string;
  exploreWork: string;
  startProject: string;
  projectsCount: string;
};

/** Índice lean del catálogo autorizado: lo que necesitan Welcome, la barra de tareas y la cabecera de cada ventana. */
export type OsProjectIndexItem = {
  slug: string;
  title: string;
  category: string;
  year: string;
  summary: string;
  image: string;
  /** Miniatura WebP ligera (≤ 480 px) para la galería. */
  thumb: string;
  alt: string;
  /** Ruta de la página pública del proyecto (`/proyectos/<slug>/`). */
  publicHref: string;
  kind: ProjectKind;
  ownership: Ownership;
  /** Estado ya traducido («Entregado»). */
  status: string;
  /** Personas del crédito, resueltas en el servidor. */
  credits: OsCredit[];
};

export type OsHrefs = {
  home: string;
  cv: string;
  /** Equivalente en el otro idioma de cada ruta del SO (clave: ruta actual). */
  languageIndex: Record<string, string>;
  /** Destino del selector de idioma si la ruta actual no está en el índice. */
  languageFallback: string;
  otherLocale: "es" | "en";
  /** Nombre que figura en la cabecera del menú Inicio. */
  owner: string;
};
