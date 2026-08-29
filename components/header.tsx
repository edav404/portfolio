"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";

const links = [
  ["/", "Inicio"],
  ["/proyectos", "Proyectos"],
  ["/servicios", "Servicios"],
  ["/sobre-mi", "Sobre mí"],
  ["/ahora", "Ahora"],
  ["/contacto", "Contacto"],
] as const;

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <div className="nav-shell">
        <Link href="/" className="brand" aria-label="EDAV OS, inicio">
          <span className="brand-mark">ED</span>
          <span><strong>EDAV OS</strong><small>creative system 1.0</small></span>
        </Link>
        <button className="menu-button" type="button" aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(!open)}>
          <Icon name={open ? "x" : "menu"} />
          <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
        </button>
        <nav id="main-navigation" className={open ? "main-nav is-open" : "main-nav"} aria-label="Navegación principal">
          {links.map(([href, label]) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}>{label}</Link>;
          })}
          <Link className="nav-cta" href="/contacto" onClick={() => setOpen(false)}>Iniciar proyecto</Link>
        </nav>
      </div>
    </header>
  );
}
