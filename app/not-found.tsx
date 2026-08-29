import Link from "next/link";
import { Icon } from "@/components/icons";

export default function NotFound() {
  return <section className="not-found section-shell"><div className="error-code">404</div><div className="window error-window"><div className="window-bar"><span>EDAV OS — Error del sistema</span><div className="window-controls"><i/><i/><i/></div></div><div className="window-body"><h1>Esta ruta se perdió en el ciberespacio.</h1><p>El archivo que buscas no existe, cambió de nombre o decidió tomarse el día libre.</p><div className="button-row"><Link className="button" href="/">Volver al inicio <Icon name="arrow"/></Link><Link className="button button-secondary" href="/proyectos">Abrir proyectos</Link></div></div></div></section>;
}
