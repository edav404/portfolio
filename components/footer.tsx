import Link from "next/link";
import { ContactKit } from "@/components/ui";
import { site } from "@/data/site";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <p className="eyebrow">EDAV OS · ONLINE</p>
          <p className="footer-title">{site.name} · {site.role}.</p>
          <ContactKit className="contact-kit-dark" label="Contacto directo y CV"/>
        </div>
        <nav className="footer-links" aria-label="Enlaces del pie">
          <Link href="/proyectos">Proyectos</Link>
          <Link href="/servicios">Servicios</Link>
          <Link href="/sobre-mi">Sobre mí</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/contacto">Contacto</Link>
          {/* Carga completa a propósito: así la portada monta de nuevo y abre el escritorio aunque ya se esté en "/". */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/?view=retro">Modo escritorio (EDAV Desktop 98)</a>
          <a href={`https://www.last.fm/user/${site.lastfm}`} target="_blank" rel="noreferrer">Last.fm</a>
        </nav>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} {site.name}</span><span>Medellín, Colombia · Hecho con código y curiosidad.</span></div>
    </footer>
  );
}
