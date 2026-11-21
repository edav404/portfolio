"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { LanguageSwitch, type LanguageSwitchProps } from "@/components/shell/language-switch";

/** Textos ya resueltos por el servidor (SiteShell): el cliente no importa content/ui.ts. */
export type HeaderCopy = {
  skipToContent: string;
  homeLink: string;
  brandName: string;
  brandTagline: string;
  openMenu: string;
  closeMenu: string;
  mainNav: string;
  downloadCvPdf: string;
  cv: string;
  startProject: string;
};

export type HeaderProps = {
  copy: HeaderCopy;
  homeHref: string;
  contactHref: string;
  cvHref: string;
  links: { href: string; label: string }[];
  /** Selector de idioma (equivalencias calculadas en el servidor). */
  language: Omit<LanguageSwitchProps, "className" | "onNavigate">;
};

export function Header({ copy, homeHref, contactHref, cvHref, links, language }: HeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="site-header">
      <a className="skip-link" href="#contenido">{copy.skipToContent}</a>
      <div className="nav-shell">
        <Link href={homeHref} className="brand" aria-label={copy.homeLink}>
          <span className="brand-mark">ED</span>
          <span><strong>{copy.brandName}</strong><small>{copy.brandTagline}</small></span>
        </Link>
        <button className="menu-button" type="button" aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(!open)}>
          <Icon name={open ? "x" : "menu"} />
          <span className="sr-only">{open ? copy.closeMenu : copy.openMenu}</span>
        </button>
        <nav id="main-navigation" className={open ? "main-nav is-open" : "main-nav"} aria-label={copy.mainNav}>
          {links.map(({ href, label }) => {
            const active = href === homeHref ? pathname === homeHref : pathname.startsWith(href);
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} onClick={close}>{label}</Link>;
          })}
          <LanguageSwitch {...language} onNavigate={close}/>
          <a className="nav-cv" href={cvHref} aria-label={copy.downloadCvPdf} type="application/pdf" onClick={close}><Icon name="download" />{copy.cv}</a>
          <Link className="nav-cta" href={contactHref} onClick={close}>{copy.startProject}</Link>
        </nav>
      </div>
    </header>
  );
}
