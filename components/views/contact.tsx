import { Suspense } from "react";
import { ContactForm, ContactFormFromQuery } from "@/components/contact-form";
import { Window } from "@/components/ui";
import { pageFor } from "@/content/pages";
import { profile } from "@/content/profile";
import type { Locale } from "@/content/types";
import { uiFor } from "@/content/ui";
import { buildMetadata } from "@/lib/metadata";

export function contactMetadata(locale: Locale) {
  const { seo } = pageFor(locale, "contact");
  return buildMetadata({ route: "contact", locale, title: seo.title, description: seo.description });
}

export function ContactView({ locale }: { locale: Locale }) {
  const page = pageFor(locale, "contact");
  const form = uiFor(locale, "contactForm");
  return <><section className="page-hero section-shell"><p className="eyebrow">{page.hero.eyebrow}</p><h1>{page.hero.title}</h1><p>{page.hero.lead}</p><a className="button" href="#formulario">{page.hero.cta}</a></section><section className="section-shell contact-layout" id="formulario"><div><p className="eyebrow">{page.brief.eyebrow}</p><h2>{page.brief.title}</h2><p>{page.brief.copy}</p><ul className="contact-points">{page.brief.points.map((point) => <li key={point}>{point}</li>)}</ul><a className="text-link" href={profile.contact.whatsapp} target="_blank" rel="noreferrer">{page.brief.whatsapp}</a></div><Window title={page.brief.formWindow}>{/* La página sigue siendo estática: `?servicio=` se lee en el cliente; el HTML inicial ya trae el formulario (fallback) sin preselección. */}<Suspense fallback={<ContactForm copy={form}/>}><ContactFormFromQuery copy={form}/></Suspense></Window></section></>;
}
