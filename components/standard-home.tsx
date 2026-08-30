import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { MusicWidget } from "@/components/music-widget";
import { Cta, ProjectCard, SectionHeading, Window } from "@/components/ui";
import { featuredProjects } from "@/data/projects";
import { services, technologies, testimonials } from "@/data/site";

export function StandardHome({ onReturnToRetro }: { onReturnToRetro: () => void }) {
  return <div className="standard-home">
    <button className="experience-switch experience-switch-retro" type="button" onClick={onReturnToRetro}><span aria-hidden="true">▦</span> Abrir EDAV Desktop 98</button>
    <section className="hero section-shell">
      <div className="hero-grid">
        <div className="hero-copy">
          <p className="status-pill"><span/> Disponible para nuevos proyectos</p>
          <h1>Diseño y desarrollo experiencias web <em>con personalidad.</em></h1>
          <p className="hero-lead">Soy Emmanuel Dávila, desarrollador web Full Stack y diseñador web en Medellín. Creo sitios, tiendas y productos digitales que se sienten propios y funcionan de verdad.</p>
          <div className="button-row"><Cta href="/contacto">Hablemos de tu proyecto</Cta><Cta href="/proyectos" secondary>Explorar mi trabajo</Cta></div>
          <ul className="hero-facts"><li><strong>13+</strong> proyectos documentados</li><li><strong>5+</strong> años creando para la web</li><li><strong>100%</strong> hecho a la medida</li></ul>
        </div>
        <div className="hero-visual" aria-label="Ventana decorativa de EDAV OS">
          <div className="orb orb-one"/><div className="orb orb-two"/>
          <Window title="about_emmanuel.exe" className="hero-window">
            <div className="terminal-line"><span>C:\EDAV&gt;</span> whoami</div>
            <div className="profile-chip"><div className="avatar">ED</div><div><strong>Emmanuel Dávila</strong><p>Full Stack · Diseño web</p></div></div>
            <div className="terminal-line"><span>C:\EDAV&gt;</span> mission</div>
            <p className="terminal-output">Convertir ideas en experiencias claras, rápidas y memorables.</p>
            <div className="desktop-icons"><span><Icon name="code"/>Código</span><span><Icon name="spark"/>Diseño</span><span><Icon name="folder"/>Proyectos</span></div>
          </Window>
          <div className="floating-tag tag-code">&lt;creative /&gt;</div><div className="floating-tag tag-online">● online</div>
        </div>
      </div>
    </section>

    <section className="ticker" aria-label="Tecnologías principales"><div>{[...technologies, ...technologies].map((tech, index) => <span key={`${tech}-${index}`}>{tech}<i>✦</i></span>)}</div></section>

    <section className="section-shell takeaways" aria-labelledby="resumen-title">
      <Window title="quick_read.txt"><div className="takeaway-grid"><div><p className="eyebrow">TL;DR · Lo esencial</p><h2 id="resumen-title">Código, diseño y estrategia en un mismo proceso.</h2></div><ul><li>Desarrollo soluciones web responsive y optimizadas para SEO.</li><li>Trabajo con código, WordPress, WooCommerce y Shopify.</li><li>Acompaño desde la idea hasta la publicación y mejora continua.</li></ul></div></Window>
    </section>

    <section className="section-shell section-block" id="proyectos">
      <SectionHeading eyebrow="Trabajo seleccionado · 01" title="Proyectos que resuelven algo real." copy="E-commerce, sitios corporativos, rediseños e identidad visual construidos para clientes y proyectos personales."/>
      <div className="project-grid">{featuredProjects.map((project, index) => <ProjectCard key={project.slug} project={project} priority={index < 2}/>)}</div>
      <div className="center-action"><Cta href="/proyectos">Ver los 13 proyectos</Cta></div>
    </section>

    <section className="services-section section-block"><div className="section-shell">
      <SectionHeading eyebrow="Servicios · 02" title="Una web bonita debe trabajar para ti." copy="Combino pensamiento de producto, diseño de interfaz y desarrollo para entregar soluciones coherentes de principio a fin."/>
      <div className="services-grid">{services.map((service, index) => <article className="service-card" key={service.slug}><span className="service-number">0{index + 1}</span><Icon name={index === 1 ? "folder" : index === 3 ? "spark" : "code"}/><h3>{service.title}</h3><p>{service.description}</p><Link className="text-link" href={`/servicios#${service.slug}`}>Conocer el servicio <Icon name="arrow"/></Link></article>)}</div>
    </div></section>

    <section className="section-shell section-block split-section">
      <div><SectionHeading eyebrow="Sobre mí · 03" title="Curioso por naturaleza. Práctico por oficio."/><p>Me gusta entender cómo funciona un negocio antes de abrir el editor de código. Esa mezcla entre tecnología, diseño y contexto me permite crear experiencias que no se sienten genéricas.</p><p>Trabajo con marcas, emprendimientos y equipos que valoran el detalle, la comunicación clara y una web que puedan sostener en el tiempo.</p><Cta href="/sobre-mi" secondary>Conoce mi recorrido</Cta></div>
      <Window title="skills.sys" className="skills-window"><p className="eyebrow">Stack cargado</p><div className="skill-cloud">{technologies.map((tech) => <span key={tech}>{tech}</span>)}</div></Window>
    </section>

    <section className="section-shell section-block"><SectionHeading eyebrow="Lo que dicen · 04" title="Buenas relaciones, mejores resultados."/><div className="testimonials-grid">{testimonials.map((item) => <blockquote className="testimonial" key={item.name}><div className="quote-mark">“</div><p>{item.quote}</p><footer><Image src={item.logo} alt={`Logo de ${item.name}`} width={52} height={52}/><div><cite>{item.name}</cite><span>{item.project}</span></div></footer></blockquote>)}</div></section>

    <section className="section-shell section-block now-section"><div><SectionHeading eyebrow="Now playing · 05" title="El soundtrack detrás del código."/><p>Una pequeña ventana a lo que suena mientras diseño, programo y resuelvo problemas.</p><Link className="text-link" href="/ahora">Ver mi página “Ahora” <Icon name="arrow"/></Link></div><MusicWidget/></section>

    <section className="section-shell final-cta"><div><p className="eyebrow">Nuevo proyecto.exe</p><h2>¿Tienes una idea dando vueltas?</h2><p>Cuéntame qué quieres construir. Podemos convertirla en una experiencia web clara, distintiva y preparada para crecer.</p></div><Cta href="/contacto">Iniciar una conversación</Cta></section>
  </div>;
}
