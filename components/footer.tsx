import Link from "next/link";
import { ContactKit } from "@/components/ui";
import { profile } from "@/content/profile";
import { href } from "@/content/routes";
import type { Locale } from "@/content/types";
import { uiFor } from "@/content/ui";

export function Footer({ locale }: { locale: Locale }) {
  const copy = uiFor(locale, "footer");
  const nav = uiFor(locale, "nav");
  const a11y = uiFor(locale, "a11y");
  const links = (["projects", "services", "about", "blog", "contact"] as const).map((key) => ({ key, href: href(key, locale), label: nav[key] }));
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <p className="footer-title">{profile.name} · {profile.headline[locale]}.</p>
          <ContactKit locale={locale} className="contact-kit-dark" label={copy.contactKit}/>
        </div>
        <nav className="footer-links" aria-label={a11y.footerNav}>
          {links.map((link) => <Link key={link.key} href={link.href}>{link.label}</Link>)}
          {/* Carga completa a propósito: así la portada monta de nuevo y abre el escritorio aunque ya se esté en la portada. */}
          <a href={`${href("home", locale)}?view=retro`}>{copy.desktopMode}</a>
          <a href={`https://www.last.fm/user/${profile.contact.lastfm}`} target="_blank" rel="noreferrer">{copy.lastfm}</a>
        </nav>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} {profile.name}</span><span>{profile.location[locale]} · {copy.madeWith}</span></div>
    </footer>
  );
}
