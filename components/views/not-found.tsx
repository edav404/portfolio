import Link from "next/link";
import { Icon } from "@/components/icons";
import { href, publishedLocales } from "@/content/routes";

/**
 * Contenido de la página 404 (ES). Lo usan `app/(es)/(site)/not-found.tsx` (notFound() explícito)
 * y `app/global-not-found.tsx` (URLs sin ruta). Ligero: sin mascota ni componentes cliente
 * pesados (PERF-02 / MAS-09).
 */
export function NotFoundView() {
  // El enlace a la versión en inglés aparece cuando el EN se publique (P9); antes, /en/ no es destino.
  const english = publishedLocales.includes("en");
  return <section className="not-found section-shell"><div className="error-code">404</div><div className="window error-window"><div className="window-bar"><span>EDAV OS — Error del sistema</span><div className="window-controls"><i/><i/><i/></div></div><div className="window-body"><h1>Esta ruta se perdió en el ciberespacio.</h1><p>El archivo que buscas no existe, cambió de nombre o decidió tomarse el día libre. Prueba con alguna de estas rutas:</p><div className="button-row"><Link className="button" href={href("home", "es")}>Volver al inicio <Icon name="arrow"/></Link><Link className="button button-secondary" href={href("projects", "es")}>Ver proyectos</Link><Link className="button button-secondary" href={href("contact", "es")}>Contactar</Link></div>{english && <p lang="en"><Link href={href("home", "en")}>English version</Link></p>}</div></div></section>;
}
