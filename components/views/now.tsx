import { MusicWidget } from "@/components/music-widget";
import { Cta, Window } from "@/components/ui";
import { pageFor } from "@/content/pages";
import { profile } from "@/content/profile";
import { href } from "@/content/routes";
import type { Locale } from "@/content/types";
import { uiFor } from "@/content/ui";
import { buildMetadata } from "@/lib/metadata";

export function nowMetadata(locale: Locale) {
  const { seo } = pageFor(locale, "now");
  return buildMetadata({ route: "now", locale, title: seo.title, description: seo.description });
}

export function NowView({ locale }: { locale: Locale }) {
  const page = pageFor(locale, "now");
  return <><section className="page-hero section-shell"><p className="eyebrow">{page.hero.eyebrow}</p><h1>{page.hero.title}</h1><p>{page.hero.lead}</p><a className="button" href={`https://www.last.fm/user/${profile.contact.lastfm}`} target="_blank" rel="noreferrer">{page.hero.cta}</a></section><section className="section-shell now-page-grid"><Window title={page.focus.playerWindow}><MusicWidget copy={uiFor(locale, "music")}/></Window><Window title={page.focus.windowTitle}><p className="eyebrow">{page.focus.eyebrow}</p><ul className="focus-list">{page.focus.items.map((item) => <li key={item}>{item}</li>)}</ul></Window></section><section className="section-shell final-cta"><div><p className="eyebrow">{page.finalCta.eyebrow}</p><h2>{page.finalCta.title}</h2></div><Cta href={href("contact", locale)}>{page.finalCta.cta}</Cta></section></>;
}
