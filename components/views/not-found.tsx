import Link from "next/link";
import { Icon } from "@/components/icons";
import { href } from "@/content/routes";
import type { Locale } from "@/content/types";
import { uiFor } from "@/content/ui";

/**
 * Contenido de la página 404. Lo usan `app/(es)/(site)/not-found.tsx` (notFound() explícito)
 * y `app/global-not-found.tsx` (URLs sin ruta). Ligero: sin mascota ni componentes cliente
 * pesados (PERF-02 / MAS-09). El cambio de idioma lo da el selector de la cabecera.
 */
export function NotFoundView({ locale }: { locale: Locale }) {
  const copy = uiFor(locale, "notFound");
  return <section className="not-found section-shell"><div className="error-code">404</div><div className="window error-window"><div className="window-bar"><span>{copy.windowTitle}</span><div className="window-controls"><i/><i/><i/></div></div><div className="window-body"><h1>{copy.title}</h1><p>{copy.body}</p><div className="button-row"><Link className="button" href={href("home", locale)}>{copy.home} <Icon name="arrow"/></Link><Link className="button button-secondary" href={href("projects", locale)}>{copy.projects}</Link><Link className="button button-secondary" href={href("contact", locale)}>{copy.contact}</Link></div></div></div></section>;
}
