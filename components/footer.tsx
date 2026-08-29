import Link from "next/link";
import { site } from "@/data/site";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <p className="eyebrow">EDAV OS · ONLINE</p>
          <p className="footer-title">Hagamos que tu próxima idea se sienta propia.</p>
        </div>
        <div className="footer-links">
          <Link href="/proyectos">Proyectos</Link>
          <Link href="/servicios">Servicios</Link>
          <Link href="/contacto">Contacto</Link>
          <a href={`https://www.last.fm/user/${site.lastfm}`} target="_blank" rel="noreferrer">Last.fm</a>
        </div>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} Emmanuel Dávila</span><span>Medellín, Colombia · Hecho con código y curiosidad.</span></div>
    </footer>
  );
}
