import Image from "next/image";
import Link from "next/link";
import { DesktopLaunchButton } from "@/components/portfolio-experience";
import { Icon } from "@/components/icons";
import { MusicWidget } from "@/components/music-widget";
import { ContactKit, Cta, ProjectCard, SectionHeading, Window } from "@/components/ui";
import { experienceSince } from "@/content/experience";
import { profile, technologies } from "@/content/profile";
import { caseStudies, featuredCaseStudies } from "@/content/projects";
import { services, testimonials } from "@/content/services";
import { cvHref } from "@/content/site";
import { stats } from "@/content/stats";

/**
 * Portada (Server Component): todo su contenido sale en el HTML inicial (SEO-01 / PERF-01).
 * La única isla relacionada con el escritorio es `DesktopLaunchButton`, que carga el SO bajo demanda.
 * Cifras y posicionamiento salen de `content/` (CNT-01 / CNT-02 / COD-02).
 */
export function StandardHome() {
  const facts = [
    { value: `Desde ${experienceSince}`, label: "trabajando con clientes y equipos" },
    ...stats.map((stat) => ({ value: stat.value, label: stat.label.es })),
  ];

  return <div className="standard-home">
    <section className="hero section-shell" aria-labelledby="hero-title">
      <div className="hero-grid">
        <div className="hero-copy">
          <p className="status-pill"><span/> {profile.availability.es}</p>
          <h1 id="hero-title"><span className="hero-name">{profile.name}</span> {profile.headline.es}</h1>
          <p className="hero-lead">{profile.tagline.es}</p>
          <div className="button-row">
            <Cta href="/contacto">Hablemos de tu proyecto</Cta>
            <a className="button button-secondary" href={cvHref.es} type="application/pdf">Descargar CV<Icon name="download"/></a>
          </div>
          <ContactKit className="hero-contact"/>
          <ul className="hero-facts">{facts.map((fact) => <li key={fact.label}><strong>{fact.value}</strong> {fact.label}</li>)}</ul>
        </div>
        <div className="hero-visual">
          <div className="orb orb-one" aria-hidden="true"/><div className="orb orb-two" aria-hidden="true"/>
          <Window title="edav_desktop_98.exe" className="hero-window">
            <div className="terminal-line"><span>C:\EDAV&gt;</span> whoami</div>
            <div className="profile-chip"><div className="avatar" aria-hidden="true">ED</div><div><strong>{profile.name}</strong><p>{profile.shortHeadline.es} · {profile.location.es}</p></div></div>
            <div className="terminal-line"><span>C:\EDAV&gt;</span> start desktop98</div>
            <p className="terminal-output">Este portafolio también funciona como un escritorio retro con ventanas, terminal y reproductor. Es opcional: el contenido es el mismo.</p>
            <DesktopLaunchButton/>
          </Window>
          <div className="floating-tag tag-code" aria-hidden="true">&lt;automate /&gt;</div><div className="floating-tag tag-online" aria-hidden="true">● online</div>
        </div>
      </div>
    </section>

    <section className="ticker" aria-label="Tecnologías principales"><div>{[...technologies, ...technologies].map((tech, index) => <span key={`${tech}-${index}`} aria-hidden={index >= technologies.length || undefined}>{tech}<i aria-hidden="true">✦</i></span>)}</div></section>

    <section className="section-shell takeaways" aria-labelledby="resumen-title">
      <Window title="quick_read.txt"><div className="takeaway-grid"><div><p className="eyebrow">Resumen</p><h2 id="resumen-title">Desarrollo a la medida y automatización de procesos.</h2></div><ul>{profile.focus.es.map((item) => <li key={item}>{item}</li>)}</ul></div></Window>
    </section>

    <section className="section-shell section-block" id="proyectos" aria-labelledby="proyectos-title">
      <div className="section-heading"><p className="eyebrow">Proyectos destacados</p><h2 id="proyectos-title">Proyectos que resuelven algo real.</h2><p>E-commerce, sitios corporativos y rediseños para clientes en Colombia, México y Estados Unidos.</p></div>
      <div className="project-grid">{featuredCaseStudies().map((project) => <ProjectCard key={project.slug} project={project}/>)}</div>
      <div className="center-action"><Cta href="/proyectos">Ver los {caseStudies.length} proyectos</Cta></div>
    </section>

    <section className="services-section section-block" aria-labelledby="servicios-title"><div className="section-shell">
      <div className="section-heading"><p className="eyebrow">Servicios</p><h2 id="servicios-title">Una web que trabaja para ti, y procesos que se hacen solos.</h2><p>Del sitio o la tienda a la automatización del trabajo repetitivo: entiendo el proceso antes de construir y dejo todo documentado.</p></div>
      <div className="services-grid">{services.map((service, index) => <article className="service-card" key={service.slug}><Icon name={index === 1 ? "folder" : index === 3 ? "spark" : "code"}/><h3>{service.title.es}</h3><p>{service.description.es}</p><Link className="text-link" href={`/servicios#${service.slug}`}>Conocer el servicio <Icon name="arrow"/></Link></article>)}</div>
    </div></section>

    <section className="section-shell section-block split-section">
      <div><SectionHeading eyebrow="Sobre mí" title="Curioso por naturaleza. Práctico por oficio."/><p>Me gusta entender cómo funciona un negocio antes de abrir el editor de código. Esa mezcla entre tecnología, procesos y contexto me permite construir soluciones que no se sienten genéricas.</p><p>Trabajo con marcas, emprendimientos y equipos que valoran el detalle, la comunicación clara y una solución que puedan sostener en el tiempo.</p><Cta href="/sobre-mi" secondary>Conoce mi recorrido</Cta></div>
      <Window title="skills.sys" className="skills-window"><p className="eyebrow">Stack cargado</p><div className="skill-cloud">{technologies.map((tech) => <span key={tech}>{tech}</span>)}</div></Window>
    </section>

    <section className="section-shell section-block"><SectionHeading eyebrow="Lo que dicen" title="Buenas relaciones, mejores resultados."/><div className="testimonials-grid">{testimonials.map((item) => <blockquote className="testimonial" key={item.name}><div className="quote-mark" aria-hidden="true">“</div><p>{item.quote.es}</p><footer><Image src={item.logo} alt={`Logo de ${item.name}`} width={52} height={52}/><div><cite>{item.name}</cite><span>{item.project.es}</span></div></footer></blockquote>)}</div></section>

    <section className="section-shell section-block now-section"><div><SectionHeading eyebrow="Sonando ahora" title="El soundtrack detrás del código."/><p>Una pequeña ventana a lo que suena mientras programo y resuelvo problemas.</p><Link className="text-link" href="/ahora">Ver mi página “Ahora” <Icon name="arrow"/></Link></div><MusicWidget/></section>

    <section className="section-shell final-cta" aria-labelledby="cta-title"><div><p className="eyebrow">Nuevo proyecto.exe</p><h2 id="cta-title">¿Tienes una idea dando vueltas?</h2><p>Cuéntame qué quieres construir o qué proceso quieres automatizar. Si prefieres revisar mi perfil primero, aquí tienes el CV y mis canales directos.</p><ContactKit className="contact-kit-dark"/></div><Cta href="/contacto">Iniciar una conversación</Cta></section>
  </div>;
}
