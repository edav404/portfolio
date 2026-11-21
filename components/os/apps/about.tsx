"use client";

import { experience, education, experienceSince } from "@/content/experience";
import { format } from "@/content/format";
import { profile, skillGroups, skills } from "@/content/profile";
import { href } from "@/content/routes";
import { cvHref } from "@/content/site";
import { formatYearMonth } from "@/lib/os/period";
import { useOsStatic } from "../os-context";
import styles from "./app-ui.module.css";

const LINKS = [
  { id: "linkedin", label: "LinkedIn", href: profile.contact.linkedin },
  { id: "github", label: "GitHub", href: profile.contact.github },
] as const;

/** Acerca de: perfil, experiencia, formación y habilidades, todo desde `content/` (un solo idioma por render). */
export default function About() {
  const { locale, copy } = useOsStatic();
  const t = copy.aboutApp;
  const period = (start: string, end: string | null) =>
    format(t.period, { from: formatYearMonth(start, locale), to: end ? formatYearMonth(end, locale) : t.present });
  return (
    <article className={styles.page}>
      <header className={styles.section}>
        <h3 className={styles.title}>{profile.fullName}</h3>
        <p className={styles.text}>{profile.headline[locale]} · {profile.location[locale]}</p>
        <p className={styles.available}>{t.available}</p>
      </header>
      <section className={styles.section}>
        {profile.bio[locale].map((paragraph) => <p key={paragraph} className={styles.text}>{paragraph}</p>)}
      </section>
      <section className={styles.section} aria-labelledby="about-experience">
        <h3 id="about-experience" className={styles.heading}>{t.experience} <span className={styles.dates}>{format(t.since, { year: experienceSince })}</span></h3>
        <ul className={styles.plain}>
          {experience.map((job) => (
            <li key={job.id} className={styles.job}>
              <h4 className={styles.jobhead}>{job.role[locale]} · {job.organization}</h4>
              <p className={styles.dates}>{period(job.start, job.end)} · {job.location[locale]}</p>
              <p className={styles.text}>{job.summary[locale]}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className={styles.section} aria-labelledby="about-education">
        <h3 id="about-education" className={styles.heading}>{t.education}</h3>
        <ul className={styles.plain}>
          {education.map((item) => (
            <li key={item.id} className={styles.job}>
              <h4 className={styles.jobhead}>{item.title[locale]}</h4>
              <p className={styles.dates}>{item.institution} · {item.detail[locale]}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className={styles.section} aria-labelledby="about-skills">
        <h3 id="about-skills" className={styles.heading}>{t.skills}</h3>
        {skillGroups.map((group) => (
          <div key={group.id} className={styles.section}>
            <p className={styles.muted}>{group.label[locale]}</p>
            <ul className={styles.chips}>{skills[group.id].map((skill) => <li key={skill} className={styles.chip}>{skill}</li>)}</ul>
          </div>
        ))}
      </section>
      <section className={styles.section} aria-labelledby="about-cv">
        <h3 id="about-cv" className={styles.heading}>{t.cvTitle}</h3>
        <div className={styles.actions}>
          <a className={`xp-button ${styles.linkbutton}`} href={cvHref.es}>{t.cvEs}</a>
          <a className={`xp-button ${styles.linkbutton}`} href={cvHref.en}>{t.cvEn}</a>
          <a className={`xp-button ${styles.linkbutton}`} href={`mailto:${profile.contact.email}`}>{profile.contact.email}</a>
          {LINKS.map((link) => <a key={link.id} className={`xp-button ${styles.linkbutton}`} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={format(copy.project.externalLink, { label: link.label })}>{link.label}</a>)}
          <a className={`xp-button ${styles.linkbutton}`} href={href("about", locale)}>{t.fullProfile}</a>
        </div>
      </section>
    </article>
  );
}
