import { ContactKit, Cta, JsonLd, SectionHeading, Window } from "@/components/ui";
import { education, experience, experienceSince, type ExperienceEntry } from "@/content/experience";
import { pageFor } from "@/content/pages";
import { profile, skillGroups, skills } from "@/content/profile";
import { href } from "@/content/routes";
import { siteUrl } from "@/content/site";
import type { Locale } from "@/content/types";
import { roleInSentence } from "@/content/format";
import { format, uiFor } from "@/content/ui";
import { formatPeriod } from "@/lib/i18n/format";
import { absoluteUrl, buildMetadata } from "@/lib/metadata";

export function aboutMetadata(locale: Locale) {
  const { seo } = pageFor(locale, "about");
  return buildMetadata({ route: "about", locale, title: seo.title, description: seo.description });
}

export function AboutView({ locale }: { locale: Locale }) {
  const page = pageFor(locale, "about");
  const common = uiFor(locale, "common");
  const period = (entry: ExperienceEntry) => formatPeriod(entry.start, entry.end, common.present, locale);
  // Página de perfil (E-E-A-T): enlaza con la entidad `Person` del layout raíz.
  const profileSchema = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: absoluteUrl(href("about", locale)),
    mainEntity: { "@type": "Person", "@id": `${siteUrl}/#person`, name: profile.fullName, jobTitle: profile.headline[locale], sameAs: [profile.contact.linkedin, profile.contact.github] },
  };
  const contact = href("contact", locale);

  return <>
    <JsonLd data={profileSchema}/>
    <section className="page-hero section-shell">
      <p className="eyebrow">{page.hero.eyebrow}</p>
      <h1>{profile.about.title[locale]}</h1>
      <p>{format(page.hero.intro, { name: profile.name, role: roleInSentence(profile.headline[locale], locale) })} {profile.about.lead[locale]}</p>
      <Cta href={contact}>{page.hero.cta}</Cta>
    </section>

    <section className="section-shell about-layout">
      <div className="about-copy">
        <p className="eyebrow">{page.profile.eyebrow}</p>
        <h2>{profile.about.bioTitle[locale]}</h2>
        {profile.bio[locale].map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
      <Window title={page.profile.windowTitle}>
        <dl className="profile-list">
          <div><dt>{page.profile.name}</dt><dd>{profile.fullName}</dd></div>
          <div><dt>{page.profile.base}</dt><dd>{profile.location[locale]}</dd></div>
          <div><dt>{page.profile.role}</dt><dd>{profile.headline[locale]}</dd></div>
          <div><dt>{page.profile.experience}</dt><dd>{format(common.since, { year: experienceSince })}</dd></div>
          <div><dt>{page.profile.mode}</dt><dd><span className="status-inline">{profile.availability[locale]}</span></dd></div>
        </dl>
        <ContactKit locale={locale} className="about-contact" label={uiFor(locale, "contactKit").labelWithCv}/>
      </Window>
    </section>

    <section className="section-shell section-block" aria-labelledby="experiencia-title">
      <div className="section-heading"><p className="eyebrow">{page.experience.eyebrow}</p><h2 id="experiencia-title">{page.experience.title}</h2></div>
      <div className="service-detail-list">
        {experience.map((entry) => <article className="service-detail" key={entry.id}>
          <div className="service-detail-head">
            <span>{period(entry)}</span>
            <div><h3>{entry.organization}</h3><p>{entry.role[locale]} · {entry.location[locale]}</p></div>
          </div>
          <div className="service-detail-body">
            <p>{entry.summary[locale]}</p>
            <ul>{entry.highlights[locale].map((item) => <li key={item}>{item}</li>)}</ul>
            <p className="stack-note">{entry.stack.join(", ")}</p>
          </div>
        </article>)}
      </div>
    </section>

    <section className="section-shell section-block" aria-labelledby="formacion-title">
      <div className="section-heading"><p className="eyebrow">{page.education.eyebrow}</p><h2 id="formacion-title">{page.education.title}</h2></div>
      <dl className="profile-list">
        {education.map((entry) => <div key={entry.id}><dt>{entry.institution}</dt><dd>{entry.title[locale]} · {entry.detail[locale]}</dd></div>)}
      </dl>
    </section>

    <section className="section-shell section-block">
      <SectionHeading eyebrow={page.skills.eyebrow} title={page.skills.title}/>
      <Window title={page.skills.windowTitle}>
        {skillGroups.map((group) => <div key={group.id}>
          <h3>{group.label[locale]}</h3>
          <div className="skill-cloud" role="list">{skills[group.id].map((skill) => <span role="listitem" key={skill}>{skill}</span>)}</div>
        </div>)}
      </Window>
    </section>

    <section className="section-shell final-cta"><div><p className="eyebrow">{page.finalCta.eyebrow}</p><h2>{page.finalCta.title}</h2></div><Cta href={contact}>{page.finalCta.cta}</Cta></section>
  </>;
}
