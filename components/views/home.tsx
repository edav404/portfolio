import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { MusicWidget } from "@/components/music-widget";
import { DesktopLaunchButton, PortfolioExperience } from "@/components/portfolio-experience";
import { ContactKit, Cta, JsonLd, ProjectCard, SectionHeading, Window } from "@/components/ui";
import { experienceSince } from "@/content/experience";
import { pageFor } from "@/content/pages";
import { profile, technologies } from "@/content/profile";
import { caseStudies, featuredCaseStudies } from "@/content/projects";
import { href } from "@/content/routes";
import { services, testimonials } from "@/content/services";
import { cvHref, siteUrl } from "@/content/site";
import { stats } from "@/content/stats";
import type { Locale } from "@/content/types";
import { format, uiFor } from "@/content/ui";
import { buildMetadata, defaultTitle } from "@/lib/metadata";

/** La portada conserva su título absoluto (nombre + posicionamiento, CNT-01). */
export function homeMetadata(locale: Locale) {
  return buildMetadata({ route: "home", locale, title: defaultTitle(locale), absoluteTitle: true, description: pageFor(locale, "home").seo.description });
}

/**
 * Portada (Server Component): todo su contenido sale en el HTML inicial (SEO-01 / PERF-01).
 * El escritorio es opcional y se carga bajo demanda (`PortfolioExperience`); sus textos
 * compartidos con la web se resuelven aquí y viajan por props.
 * Cifras y posicionamiento salen de `content/` (CNT-01 / CNT-02 / COD-02).
 */
export function HomeView({ locale }: { locale: Locale }) {
  const page = pageFor(locale, "home");
  const common = uiFor(locale, "common");
  const a11y = uiFor(locale, "a11y");
  const os = uiFor(locale, "os");
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: `${profile.name} — ${profile.headline[locale]}`,
    url: siteUrl,
    email: profile.contact.email,
    areaServed: "CO",
    serviceType: services.map((service) => service.title[locale]),
  };
  const facts = [
    { value: format(common.since, { year: experienceSince }), label: page.hero.sinceLabel },
    ...stats.map((stat) => ({ value: stat.value, label: stat.label[locale] })),
  ];
  const experienceCopy = { loading: os.loading, open: os.open, contactForm: uiFor(locale, "contactForm"), music: uiFor(locale, "music"), os };
  const music = uiFor(locale, "music");

  return <>
    <JsonLd data={serviceSchema}/>
    <PortfolioExperience copy={experienceCopy}>
      <div className="standard-home">
        <section className="hero section-shell" aria-labelledby="hero-title">
          <div className="hero-grid">
            <div className="hero-copy">
              <p className="status-pill"><span/> {profile.availability[locale]}</p>
              <h1 id="hero-title"><span className="hero-name">{profile.name}</span> {profile.headline[locale]}</h1>
              <p className="hero-lead">{profile.tagline[locale]}</p>
              <div className="button-row">
                <Cta href={href("contact", locale)}>{page.hero.primaryCta}</Cta>
                <a className="button button-secondary" href={cvHref[locale]} type="application/pdf">{page.hero.cvCta}<Icon name="download"/></a>
              </div>
              <ContactKit locale={locale} className="hero-contact"/>
              <ul className="hero-facts">{facts.map((fact) => <li key={fact.label}><strong>{fact.value}</strong> {fact.label}</li>)}</ul>
            </div>
            <div className="hero-visual">
              <div className="orb orb-one" aria-hidden="true"/><div className="orb orb-two" aria-hidden="true"/>
              <Window title={page.hero.windowTitle} className="hero-window">
                <div className="terminal-line"><span>{"C:\\EDAV>"}</span> {"whoami"}</div>
                <div className="profile-chip"><div className="avatar" aria-hidden="true">ED</div><div><strong>{profile.name}</strong><p>{profile.shortHeadline[locale]} · {profile.location[locale]}</p></div></div>
                <div className="terminal-line"><span>{"C:\\EDAV>"}</span> {"start desktop98"}</div>
                <p className="terminal-output">{page.hero.desktopNote}</p>
                <DesktopLaunchButton/>
              </Window>
              <div className="floating-tag tag-code" aria-hidden="true">{"<automate />"}</div><div className="floating-tag tag-online" aria-hidden="true">{"● online"}</div>
            </div>
          </div>
        </section>

        <section className="ticker" aria-label={a11y.techTicker}><div>{[...technologies, ...technologies].map((tech, index) => <span key={`${tech}-${index}`} aria-hidden={index >= technologies.length || undefined}>{tech}<i aria-hidden="true">✦</i></span>)}</div></section>

        <section className="section-shell takeaways" aria-labelledby="resumen-title">
          <Window title={page.summary.windowTitle}><div className="takeaway-grid"><div><p className="eyebrow">{page.summary.eyebrow}</p><h2 id="resumen-title">{page.summary.title}</h2></div><ul>{profile.focus[locale].map((item) => <li key={item}>{item}</li>)}</ul></div></Window>
        </section>

        <section className="section-shell section-block" id="proyectos" aria-labelledby="proyectos-title">
          <div className="section-heading"><p className="eyebrow">{page.featured.eyebrow}</p><h2 id="proyectos-title">{page.featured.title}</h2><p>{page.featured.copy}</p></div>
          <div className="project-grid">{featuredCaseStudies().map((project) => <ProjectCard key={project.slug} project={project} locale={locale}/>)}</div>
          <div className="center-action"><Cta href={href("projects", locale)}>{format(page.featured.cta, { count: caseStudies.length })}</Cta></div>
        </section>

        <section className="services-section section-block" aria-labelledby="servicios-title"><div className="section-shell">
          <div className="section-heading"><p className="eyebrow">{page.services.eyebrow}</p><h2 id="servicios-title">{page.services.title}</h2><p>{page.services.copy}</p></div>
          <div className="services-grid">{services.map((service, index) => <article className="service-card" key={service.slug}><Icon name={index === 1 ? "folder" : index === 3 ? "spark" : "code"}/><h3>{service.title[locale]}</h3><p>{service.description[locale]}</p><Link className="text-link" href={`${href("services", locale)}#${service.slug}`}>{page.services.cta} <Icon name="arrow"/></Link></article>)}</div>
        </div></section>

        <section className="section-shell section-block split-section">
          <div><SectionHeading eyebrow={page.about.eyebrow} title={page.about.title}/>{page.about.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<Cta href={href("about", locale)} secondary>{page.about.cta}</Cta></div>
          <Window title={page.about.skillsWindow} className="skills-window"><p className="eyebrow">{page.about.skillsEyebrow}</p><div className="skill-cloud">{technologies.map((tech) => <span key={tech}>{tech}</span>)}</div></Window>
        </section>

        <section className="section-shell section-block"><SectionHeading eyebrow={page.testimonials.eyebrow} title={page.testimonials.title}/><div className="testimonials-grid">{testimonials.map((item) => <blockquote className="testimonial" key={item.name}><div className="quote-mark" aria-hidden="true">“</div><p>{item.quote[locale]}</p><footer><Image src={item.logo} alt={format(a11y.logoOf, { name: item.name })} width={52} height={52}/><div><cite>{item.name}</cite><span>{item.project[locale]}</span></div></footer></blockquote>)}</div></section>

        <section className="section-shell section-block now-section"><div><SectionHeading eyebrow={page.now.eyebrow} title={page.now.title}/><p>{page.now.copy}</p><Link className="text-link" href={href("now", locale)}>{page.now.cta} <Icon name="arrow"/></Link></div><MusicWidget copy={music}/></section>

        <section className="section-shell final-cta" aria-labelledby="cta-title"><div><p className="eyebrow">{page.finalCta.eyebrow}</p><h2 id="cta-title">{page.finalCta.title}</h2><p>{page.finalCta.copy}</p><ContactKit locale={locale} className="contact-kit-dark"/></div><Cta href={href("contact", locale)}>{page.finalCta.cta}</Cta></section>
      </div>
    </PortfolioExperience>
  </>;
}
