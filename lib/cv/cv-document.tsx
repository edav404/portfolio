import "server-only";
import { Document, Font, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { education, experience } from "@/content/experience";
import { people } from "@/content/people";
import { profile, skillGroups, skills } from "@/content/profile";
import { projects, projectTitle } from "@/content/projects";
import type { Locale, YearMonth } from "@/content/types";

// Sin división silábica: evita cortes como "Dávi-la".
Font.registerHyphenationCallback((word) => [word]);

const ACCENT = "#1F4FC1"; // Azul XP sobrio
const INK = "#1B1F27";
const MUTED = "#5B6372";
const LINE = "#D9DEE7";

const styles = StyleSheet.create({
  page: { flexDirection: "row", fontFamily: "Helvetica", fontSize: 9, color: INK, lineHeight: 1.4 },
  sidebar: { width: "32%", backgroundColor: "#F2F5FB", paddingVertical: 32, paddingHorizontal: 18, borderRight: `1pt solid ${LINE}` },
  main: { width: "68%", paddingVertical: 32, paddingHorizontal: 24 },
  name: { fontFamily: "Helvetica-Bold", fontSize: 20, color: INK, lineHeight: 1.15 },
  headline: { fontSize: 10.5, color: ACCENT, marginTop: 4, fontFamily: "Helvetica-Bold" },
  tagline: { fontSize: 9, color: MUTED, marginTop: 6 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: ACCENT, letterSpacing: 1.2, textTransform: "uppercase", marginTop: 16, marginBottom: 6, paddingBottom: 3, borderBottom: `1pt solid ${LINE}` },
  sideTitle: { fontFamily: "Helvetica-Bold", fontSize: 8, color: ACCENT, letterSpacing: 1.2, textTransform: "uppercase", marginTop: 12, marginBottom: 4 },
  small: { fontSize: 8.5, color: MUTED },
  link: { fontSize: 8.5, color: INK, textDecoration: "none" },
  label: { fontSize: 7.5, color: MUTED, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 4 },
  job: { marginBottom: 9 },
  jobHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  jobRole: { fontFamily: "Helvetica-Bold", fontSize: 9.5 },
  jobOrg: { fontSize: 9, color: ACCENT, fontFamily: "Helvetica-Bold" },
  jobDates: { fontSize: 8, color: MUTED },
  bullet: { flexDirection: "row", marginTop: 2 },
  bulletDot: { width: 8, color: ACCENT },
  bulletText: { flex: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 3 },
  chip: { fontSize: 7.5, color: INK, backgroundColor: "#FFFFFF", border: `0.75pt solid ${LINE}`, borderRadius: 3, paddingVertical: 1, paddingHorizontal: 4, marginRight: 3, marginBottom: 2.5 },
  project: { marginBottom: 6 },
  projectTitle: { fontFamily: "Helvetica-Bold", fontSize: 9 },
});

const copy = {
  es: {
    contact: "Contacto", skills: "Habilidades", education: "Formación", languages: "Idiomas",
    profile: "Perfil", experience: "Experiencia", projects: "Proyectos seleccionados",
    present: "Actualidad", inProgress: "En curso",
    langs: ["Español: nativo", "Inglés: lectura técnica y comunicación escrita"],
    credits: "Con", by: "Proyecto de", contributor: "colaborador", footer: "CV generado desde edav.com.co",
  },
  en: {
    contact: "Contact", skills: "Skills", education: "Education", languages: "Languages",
    profile: "Profile", experience: "Experience", projects: "Selected projects",
    present: "Present", inProgress: "In progress",
    langs: ["Spanish: native", "English: technical reading and written communication"],
    credits: "With", by: "Project by", contributor: "contributor", footer: "CV generated from edav.com.co",
  },
} as const;

const months = {
  es: ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sep.", "oct.", "nov.", "dic."],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

function formatDate(value: YearMonth, locale: Locale) {
  const [year, month] = String(value).split("-");
  return month ? `${months[locale][Number(month) - 1]} ${year}` : year;
}

function range(start: YearMonth, end: YearMonth | null, locale: Locale) {
  const from = formatDate(start, locale);
  const to = end ? formatDate(end, locale) : copy[locale].present;
  return from === to ? from : `${from} – ${to}`;
}

function Bullet({ children }: { children: string }) {
  return <View style={styles.bullet}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>{children}</Text></View>;
}

export function CvDocument({ locale, siteUrl }: { locale: Locale; siteUrl: string }) {
  const c = copy[locale];
  const selected = projects.filter((project) => project.kind !== "client" || project.featured).slice(0, 6);
  const contact = profile.contact;

  return (
    <Document title={`${profile.fullName} — CV (${locale.toUpperCase()})`} author={profile.fullName} subject={profile.headline[locale]} language={locale} creator="edav.com.co">
      <Page size="A4" style={styles.page}>
        <View style={styles.sidebar}>
          <Text style={styles.name}>{profile.fullName}</Text>
          <Text style={styles.headline}>{profile.headline[locale]}</Text>
          <Text style={[styles.small, { marginTop: 4 }]}>{profile.location[locale]}</Text>

          <Text style={styles.sideTitle}>{c.contact}</Text>
          {contact.email ? <><Text style={styles.label}>Email</Text><Link style={styles.link} src={`mailto:${contact.email}`}>{contact.email}</Link></> : null}
          <Text style={styles.label}>WhatsApp</Text>
          <Link style={styles.link} src={contact.whatsapp}>{contact.whatsappDisplay}</Link>
          <Text style={styles.label}>LinkedIn</Text>
          <Link style={styles.link} src={contact.linkedin}>linkedin.com/in/edav404</Link>
          <Text style={styles.label}>GitHub</Text>
          <Link style={styles.link} src={contact.github}>github.com/edav404</Link>
          <Text style={styles.label}>Web</Text>
          <Link style={styles.link} src={siteUrl}>{siteUrl.replace(/^https?:\/\//, "")}</Link>

          <Text style={styles.sideTitle}>{c.skills}</Text>
          {skillGroups.map((group) => (
            <View key={group.id} style={{ marginBottom: 4 }}>
              <Text style={styles.label}>{group.label[locale]}</Text>
              <View style={styles.chipRow}>{skills[group.id].map((skill) => <Text key={skill} style={styles.chip}>{skill}</Text>)}</View>
            </View>
          ))}

          <Text style={styles.sideTitle}>{c.education}</Text>
          {education.map((entry) => (
            <View key={entry.id} style={{ marginBottom: 6 }}>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8.5 }}>{entry.title[locale]}</Text>
              <Text style={styles.small}>{entry.institution}</Text>
              <Text style={styles.small}>{entry.status === "in-progress" ? `${c.inProgress} · ${entry.detail[locale]}` : entry.detail[locale]}</Text>
            </View>
          ))}

          <Text style={styles.sideTitle}>{c.languages}</Text>
          {c.langs.map((lang) => <Text key={lang} style={styles.small}>{lang}</Text>)}
        </View>

        <View style={styles.main}>
          <Text style={[styles.sectionTitle, { marginTop: 0 }]}>{c.profile}</Text>
          <Text>{profile.tagline[locale]} {profile.bio[locale][2]}</Text>

          <Text style={styles.sectionTitle}>{c.experience}</Text>
          {experience.filter((job) => job.inCv).map((job) => (
            <View key={job.id} style={styles.job} wrap={false}>
              <View style={styles.jobHead}>
                <Text style={styles.jobRole}>{job.role[locale]}</Text>
                <Text style={styles.jobDates}>{range(job.start, job.end, locale)}</Text>
              </View>
              <Text style={styles.jobOrg}>{job.organization} <Text style={{ color: MUTED, fontFamily: "Helvetica" }}>· {job.location[locale]}</Text></Text>
              {job.highlights[locale].slice(0, job.id === "servicios-nutresa" ? 6 : 3).map((item) => <Bullet key={item}>{item}</Bullet>)}
            </View>
          ))}

          <Text style={styles.sectionTitle}>{c.projects}</Text>
          {selected.map((project) => {
            const others = (project.credits ?? []).filter((credit) => credit.person !== "edav" && !credit.minor).map((credit) => people[credit.person].name);
            const credit = project.ownership === "collaboration"
              ? ` · ${c.by} ${others.join(", ")} (${c.contributor})`
              : others.length ? ` · ${c.credits} ${others.join(", ")}` : "";
            return (
              <View key={project.slug} style={styles.project} wrap={false}>
                <Text style={styles.projectTitle}>
                  {projectTitle(project, locale)}
                  <Text style={{ fontFamily: "Helvetica", color: MUTED }}> · {project.category[locale]}{credit}</Text>
                </Text>
                <Text>{project.summary[locale]}</Text>
                <Text style={styles.small}>{project.technologies.slice(0, 6).join(" · ")}</Text>
              </View>
            );
          })}

          <Text style={[styles.small, { marginTop: 10, fontSize: 7 }]}>{c.footer}</Text>
        </View>
      </Page>
    </Document>
  );
}
