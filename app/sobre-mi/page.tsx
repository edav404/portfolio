import type { Metadata } from "next";
import { ContactKit, Cta, JsonLd, SectionHeading, Window } from "@/components/ui";
import { education, experience, experienceSince, type ExperienceEntry } from "@/content/experience";
import { profile, skillGroups, skills } from "@/content/profile";
import { siteUrl } from "@/content/site";
import type { Locale } from "@/content/types";

export const metadata: Metadata = { title: "Sobre mí — Desarrollador Full Stack y de automatización", description: "Conoce a Emmanuel Dávila, desarrollador Full Stack y de automatización en Medellín: desarrollo web a la medida, WordPress, Shopify y Microsoft 365.", alternates: { canonical: "/sobre-mi" } };

// Vista ES; la versión /en/ llegará con el árbol de rutas i18n. Todo el contenido sale de `content/` (CNT-03);
// las etiquetas de interfaz que quedan en el JSX pasarán a `content/ui.ts`.
const locale: Locale = "es";
const presentLabel = { es: "actualidad", en: "present" } as const;

/** "2026-07" → "jul 2026"; "2023" → "2023". */
function formatYearMonth(value: string): string {
  const [year, month] = value.split("-");
  if (!month) return year;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return new Intl.DateTimeFormat(locale === "es" ? "es-CO" : "en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function formatPeriod(entry: ExperienceEntry): string {
  return `${formatYearMonth(entry.start)} – ${entry.end ? formatYearMonth(entry.end) : presentLabel[locale]}`;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export default function AboutPage() {
  // Página de perfil (E-E-A-T): enlaza con la entidad `Person` del layout raíz.
  const profileSchema = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: `${siteUrl}/sobre-mi/`,
    mainEntity: { "@type": "Person", "@id": `${siteUrl}/#person`, name: profile.fullName, jobTitle: profile.headline[locale], sameAs: [profile.contact.linkedin, profile.contact.github] },
  };

  return <>
    <JsonLd data={profileSchema}/>
    <section className="page-hero section-shell">
      <p className="eyebrow">C:\EDAV\SOBRE-MI.EXE</p>
      <h1>{profile.about.title[locale]}</h1>
      <p>Soy {profile.name}, {lowerFirst(profile.headline[locale])}. {profile.about.lead[locale]}</p>
      <Cta href="/contacto">Trabajemos juntos</Cta>
    </section>

    <section className="section-shell about-layout">
      <div className="about-copy">
        <p className="eyebrow">TL;DR · Perfil</p>
        <h2>{profile.about.bioTitle[locale]}</h2>
        {profile.bio[locale].map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
      <Window title="perfil.ini">
        <dl className="profile-list">
          <div><dt>Nombre</dt><dd>{profile.fullName}</dd></div>
          <div><dt>Base</dt><dd>{profile.location[locale]}</dd></div>
          <div><dt>Rol</dt><dd>{profile.headline[locale]}</dd></div>
          <div><dt>Experiencia</dt><dd>Desde {experienceSince}</dd></div>
          <div><dt>Modo</dt><dd><span className="status-inline">{profile.availability[locale]}</span></dd></div>
        </dl>
        <ContactKit className="about-contact" label="CV y contacto directo"/>
      </Window>
    </section>

    <section className="section-shell section-block" aria-labelledby="experiencia-title">
      <div className="section-heading"><p className="eyebrow">Experiencia</p><h2 id="experiencia-title">Dónde he trabajado.</h2></div>
      <div className="service-detail-list">
        {experience.map((entry) => <article className="service-detail" key={entry.id}>
          <div className="service-detail-head">
            <span>{formatPeriod(entry)}</span>
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
      <div className="section-heading"><p className="eyebrow">Formación</p><h2 id="formacion-title">Lo que he estudiado.</h2></div>
      <dl className="profile-list">
        {education.map((entry) => <div key={entry.id}><dt>{entry.institution}</dt><dd>{entry.title[locale]} · {entry.detail[locale]}</dd></div>)}
      </dl>
    </section>

    <section className="section-shell section-block">
      <SectionHeading eyebrow="Herramientas" title="Tecnologías con las que construyo."/>
      <Window title="stack.sys">
        {skillGroups.map((group) => <div key={group.id}>
          <h3>{group.label[locale]}</h3>
          <div className="skill-cloud" role="list">{skills[group.id].map((skill) => <span role="listitem" key={skill}>{skill}</span>)}</div>
        </div>)}
      </Window>
    </section>

    <section className="section-shell final-cta"><div><p className="eyebrow">Conexión disponible</p><h2>¿Crees que podemos hacer buen equipo?</h2></div><Cta href="/contacto">Conversemos</Cta></section>
  </>;
}
