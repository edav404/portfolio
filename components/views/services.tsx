import { Cta, JsonLd } from "@/components/ui";
import { pageFor } from "@/content/pages";
import { href } from "@/content/routes";
import { services } from "@/content/services";
import type { Locale } from "@/content/types";
import { buildMetadata } from "@/lib/metadata";

export function servicesMetadata(locale: Locale) {
  const { seo } = pageFor(locale, "services");
  return buildMetadata({ route: "services", locale, title: seo.title, description: seo.description });
}

export function ServicesView({ locale }: { locale: Locale }) {
  const page = pageFor(locale, "services");
  const contact = href("contact", locale);
  const faqs = Object.values(page.faq.items);
  const steps = Object.values(page.process.steps);
  const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) };
  return <><JsonLd data={faqSchema}/><section className="page-hero section-shell"><p className="eyebrow">{page.hero.eyebrow}</p><h1>{page.hero.title}</h1><p>{page.hero.lead}</p><Cta href={contact}>{page.hero.cta}</Cta></section><section className="section-shell takeaways"><div className="takeaway-grid"><div><p className="eyebrow">{page.howIWork.eyebrow}</p><h2>{page.howIWork.title}</h2></div><ul>{page.howIWork.steps.map((step) => <li key={step}>{step}</li>)}</ul></div></section><section className="section-shell section-block"><div className="service-detail-list">{services.map((service, index) => <article id={service.slug} key={service.slug} className="service-detail"><div className="service-detail-head"><span>{String(index + 1).padStart(2, "0")}</span><div><p className="eyebrow">{service.kicker[locale]}</p><h2>{service.title[locale]}</h2></div></div><div className="service-detail-body"><p>{service.description[locale]}</p><h3>{page.detail.includes}</h3><ul>{service.includes[locale].map((item) => <li key={item}>{item}</li>)}</ul><p className="stack-note"><strong>{page.detail.technologies}</strong> {service.stack[locale]}</p><Cta href={`${contact}?servicio=${service.slug}`} secondary>{page.detail.cta}</Cta></div></article>)}</div></section><section className="section-shell process-section"><p className="eyebrow">{page.process.eyebrow}</p><h2>{page.process.title}</h2><ol>{steps.map((step, index) => <li key={step.title}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step.title}</strong><p>{step.copy}</p></li>)}</ol></section><section className="section-shell faq-section"><p className="eyebrow">{page.faq.eyebrow}</p><h2>{page.faq.title}</h2>{faqs.map(({ question, answer }) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section><section className="section-shell final-cta"><div><p className="eyebrow">{page.finalCta.eyebrow}</p><h2>{page.finalCta.title}</h2><p>{page.finalCta.copy}</p></div><Cta href={contact}>{page.finalCta.cta}</Cta></section></>;
}
