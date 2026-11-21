import type { Metadata } from "next";
import { MusicWidget } from "@/components/music-widget";
import { Cta, Window } from "@/components/ui";
import { profile } from "@/content/profile";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({ route: "now", locale: "es", title: "Ahora — Música y actividad", description: "Qué escucha y en qué está trabajando actualmente Emmanuel Dávila." });

export default function NowPage() {
  return <><section className="page-hero section-shell"><p className="eyebrow">C:\EDAV\NOW.PLAYING</p><h1>Lo que suena mientras construyo.</h1><p>Una página viva con mi actividad musical reciente en Last.fm y algunas cosas que ocupan mi curiosidad ahora mismo.</p><a className="button" href={`https://www.last.fm/user/${profile.contact.lastfm}`} target="_blank" rel="noreferrer">Seguir en Last.fm</a></section><section className="section-shell now-page-grid"><Window title="lastfm_player.exe"><MusicWidget/></Window><Window title="current_focus.txt"><p className="eyebrow">Foco actual</p><ul className="focus-list"><li>Desarrollo de experiencias web con identidad propia.</li><li>Arquitecturas modernas con React, Next.js y TypeScript.</li><li>Automatización, APIs y productos que conectan sistemas.</li><li>Diseño responsive, accesibilidad y SEO técnico.</li></ul></Window></section><section className="section-shell final-cta"><div><p className="eyebrow">Compartamos ideas</p><h2>¿También creas mejor con música?</h2></div><Cta href="/contacto">Hablemos de tu proyecto</Cta></section></>;
}
