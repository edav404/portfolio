/**
 * SEO y textos de cabecera de cada página estática, indexados por `RouteKey` (docs/arquitectura-rutas.md §4.3).
 *
 * - `seo.title` va sin sufijo: la plantilla del layout añade " | Emmanuel Dávila" (`titleTemplate`).
 *   Con el sufijo, el título debe quedar en ≤ 60 caracteres; la descripción en ≤ 160.
 * - El contenido (bio, proyectos, servicios, posts) sigue en su módulo; aquí solo el texto propio de la página.
 * - Textos con datos usan marcadores `{nombre}` (ver `format()` en `content/ui.ts`).
 * - Solo para el servidor: los componentes cliente reciben strings ya resueltos por props.
 */
import { profile } from "./profile";
import type { RouteKey } from "./routes";
import type { L, Locale } from "./types";
import { type CopyTree, type Resolved, resolveLocale } from "./ui";

/** Plantilla de título del layout raíz (`title.template` de Next). */
export const titleTemplate = `%s | ${profile.name}`;

export function withTitleSuffix(title: string): string {
  return titleTemplate.replace("%s", title);
}

/** Páginas estáticas con texto propio (las dinámicas —proyecto, post, servicio— salen de su contenido). */
export type StaticPageKey = Extract<RouteKey, "home" | "projects" | "services" | "about" | "blog" | "now" | "contact">;

export type PageSeo = { title: L; description: L };

type PageCopy = CopyTree & { seo: PageSeo };

export const pages = {
  home: {
    seo: {
      title: { es: "Desarrollador Full Stack y automatización", en: "Full-Stack & Automation Developer" },
      description: profile.seoDescription,
    },
    hero: {
      primaryCta: { es: "Hablemos de tu proyecto", en: "Let's talk about your project" },
      cvCta: { es: "Descargar CV", en: "Download CV" },
      sinceLabel: { es: "trabajando con clientes y equipos", en: "working with clients and teams" },
      windowTitle: { es: "edav_desktop_98.exe", en: "edav_desktop_98.exe" },
      desktopNote: {
        es: "Este portafolio también funciona como un escritorio retro con ventanas, terminal y reproductor. Es opcional: el contenido es el mismo.",
        en: "This portfolio also works as a retro desktop with windows, a terminal and a music player. It's optional: the content is the same.",
      },
    },
    summary: {
      eyebrow: { es: "Resumen", en: "Summary" },
      title: { es: "Desarrollo a la medida y automatización de procesos.", en: "Custom development and process automation." },
    },
    featured: {
      eyebrow: { es: "Proyectos destacados", en: "Featured projects" },
      title: { es: "Proyectos que resuelven algo real.", en: "Projects that solve real problems." },
      copy: {
        es: "E-commerce, sitios corporativos y rediseños para clientes en Colombia, México y Estados Unidos.",
        en: "E-commerce, corporate websites and redesigns for clients in Colombia, Mexico and the United States.",
      },
      cta: { es: "Ver los {count} proyectos", en: "View all {count} projects" },
    },
    services: {
      eyebrow: { es: "Servicios", en: "Services" },
      title: { es: "Una web que trabaja para ti, y procesos que se hacen solos.", en: "A website that works for you, and processes that run themselves." },
      copy: {
        es: "Del sitio o la tienda a la automatización del trabajo repetitivo: entiendo el proceso antes de construir y dejo todo documentado.",
        en: "From the website or store to automating repetitive work: I understand the process before building and document everything.",
      },
      cta: { es: "Conocer el servicio", en: "Learn about this service" },
    },
    about: {
      eyebrow: { es: "Sobre mí", en: "About me" },
      title: { es: "Curioso por naturaleza. Práctico por oficio.", en: "Curious by nature. Practical by trade." },
      paragraphs: {
        es: [
          "Me gusta entender cómo funciona un negocio antes de abrir el editor de código. Esa mezcla entre tecnología, procesos y contexto me permite construir soluciones que no se sienten genéricas.",
          "Trabajo con marcas, emprendimientos y equipos que valoran el detalle, la comunicación clara y una solución que puedan sostener en el tiempo.",
        ],
        en: [
          "I like to understand how a business works before I open the code editor. That mix of technology, processes and context lets me build solutions that don't feel generic.",
          "I work with brands, startups and teams that value attention to detail, clear communication and a solution they can maintain over time.",
        ],
      },
      cta: { es: "Conoce mi recorrido", en: "See my background" },
      skillsWindow: { es: "skills.sys", en: "skills.sys" },
      skillsEyebrow: { es: "Stack cargado", en: "Loaded stack" },
    },
    testimonials: {
      eyebrow: { es: "Lo que dicen", en: "What clients say" },
      title: { es: "Buenas relaciones, mejores resultados.", en: "Good relationships, better results." },
    },
    now: {
      eyebrow: { es: "Sonando ahora", en: "Now playing" },
      title: { es: "El soundtrack detrás del código.", en: "The soundtrack behind the code." },
      copy: { es: "Una pequeña ventana a lo que suena mientras programo y resuelvo problemas.", en: "A small window into what's playing while I code and solve problems." },
      cta: { es: "Ver mi página “Ahora”", en: "See my “Now” page" },
    },
    finalCta: {
      eyebrow: { es: "Nuevo proyecto.exe", en: "New project.exe" },
      title: { es: "¿Tienes una idea dando vueltas?", en: "Got an idea on your mind?" },
      copy: {
        es: "Cuéntame qué quieres construir o qué proceso quieres automatizar. Si prefieres revisar mi perfil primero, aquí tienes el CV y mis canales directos.",
        en: "Tell me what you want to build or which process you want to automate. If you'd rather check my profile first, here are my CV and direct channels.",
      },
      cta: { es: "Iniciar una conversación", en: "Start a conversation" },
    },
  },

  projects: {
    seo: {
      title: { es: "Proyectos de desarrollo web y e-commerce", en: "Web development and e-commerce projects" },
      description: {
        es: "Casos de estudio de Emmanuel Dávila, desarrollador Full Stack y de automatización: desarrollo web, WordPress, WooCommerce, Shopify y e-commerce.",
        en: "Case studies by Emmanuel Dávila, full-stack and automation developer: web development, WordPress, WooCommerce, Shopify and e-commerce.",
      },
    },
    hero: {
      eyebrow: { es: "C:\\EDAV\\PROYECTOS", en: "C:\\EDAV\\PROJECTS" },
      title: { es: "Trabajo real, proceso visible.", en: "Real work, visible process." },
      lead: {
        es: "Una colección de proyectos personales, académicos y para clientes en Colombia, México y Estados Unidos.",
        en: "A collection of personal, academic and client projects in Colombia, Mexico and the United States.",
      },
      cta: { es: "Explorar catálogo", en: "Browse the catalog" },
    },
    catalog: {
      title: { es: "Todos los proyectos.", en: "All projects." },
      copy: {
        es: "Cada caso resume el reto, las decisiones de diseño, la solución y las tecnologías utilizadas.",
        en: "Each case study sums up the challenge, the design decisions, the solution and the technologies used.",
      },
    },
  },

  services: {
    seo: {
      title: { es: "Servicios Full Stack y de automatización", en: "Full-stack and automation services" },
      description: {
        es: "Desarrollo web a la medida, automatización de procesos, WordPress, WooCommerce, Shopify y diseño UX/UI para marcas y negocios.",
        en: "Custom web development, process automation, WordPress, WooCommerce, Shopify and UX/UI design for brands and businesses.",
      },
    },
    hero: {
      eyebrow: { es: "C:\\EDAV\\SERVICIOS", en: "C:\\EDAV\\SERVICES" },
      title: { es: "Desarrollo Full Stack y automatización que mueven tu negocio.", en: "Full-stack development and automation that move your business forward." },
      lead: {
        es: "Te ayudo a pasar de una idea dispersa a una experiencia digital coherente, rápida y fácil de administrar.",
        en: "I help you go from a scattered idea to a coherent, fast digital experience that's easy to manage.",
      },
      cta: { es: "Solicitar una propuesta", en: "Request a proposal" },
    },
    howIWork: {
      eyebrow: { es: "TL;DR · Cómo trabajo", en: "TL;DR · How I work" },
      title: { es: "Una sola visión, de la estrategia al código.", en: "One vision, from strategy to code." },
      steps: {
        es: [
          "Definimos objetivos, alcance, usuarios y criterio de éxito.",
          "Diseño la experiencia y valido la dirección visual.",
          "Desarrollo, pruebo, publico y documento la solución.",
        ],
        en: [
          "We define goals, scope, users and success criteria.",
          "I design the experience and validate the visual direction.",
          "I build, test, launch and document the solution.",
        ],
      },
    },
    detail: {
      includes: { es: "Qué puede incluir", en: "What it can include" },
      technologies: { es: "Tecnologías:", en: "Technologies:" },
      cta: { es: "Consultar este servicio", en: "Ask about this service" },
    },
    process: {
      eyebrow: { es: "Proceso", en: "Process" },
      title: { es: "Una ruta clara de principio a fin.", en: "A clear path from start to finish." },
      steps: {
        discovery: {
          title: { es: "Descubrimiento", en: "Discovery" },
          copy: { es: "Objetivos, usuarios, contenido, referencias y alcance.", en: "Goals, users, content, references and scope." },
        },
        direction: {
          title: { es: "Dirección", en: "Direction" },
          copy: { es: "Arquitectura, wireframes y sistema visual.", en: "Architecture, wireframes and visual system." },
        },
        build: {
          title: { es: "Construcción", en: "Build" },
          copy: { es: "Desarrollo responsive, integraciones y contenido.", en: "Responsive development, integrations and content." },
        },
        validation: {
          title: { es: "Validación", en: "Validation" },
          copy: { es: "Accesibilidad, rendimiento, SEO y publicación.", en: "Accessibility, performance, SEO and launch." },
        },
      },
    },
    faq: {
      eyebrow: { es: "FAQ", en: "FAQ" },
      title: { es: "Preguntas antes de empezar", en: "Questions before we start" },
      items: {
        duration: {
          question: { es: "¿Cuánto tarda un proyecto web?", en: "How long does a web project take?" },
          answer: {
            es: "Depende del alcance. Un sitio corporativo suele requerir entre cuatro y ocho semanas; un e-commerce o desarrollo a la medida puede necesitar más tiempo.",
            en: "It depends on the scope. A corporate website usually takes four to eight weeks; an e-commerce store or custom development may need more time.",
          },
        },
        existing: {
          question: { es: "¿Trabajas con sitios que ya existen?", en: "Do you work on existing websites?" },
          answer: {
            es: "Sí. Puedo auditar, rediseñar, optimizar o ampliar proyectos existentes en WordPress, WooCommerce, Shopify y stacks basados en JavaScript.",
            en: "Yes. I can audit, redesign, optimize or extend existing projects built with WordPress, WooCommerce, Shopify and JavaScript-based stacks.",
          },
        },
        mobileSeo: {
          question: { es: "¿La web quedará optimizada para móviles y SEO?", en: "Will the website be optimized for mobile and SEO?" },
          answer: {
            es: "Sí. El responsive, la accesibilidad, el rendimiento y los fundamentos de SEO técnico forman parte del proceso.",
            en: "Yes. Responsive design, accessibility, performance and technical SEO fundamentals are part of the process.",
          },
        },
        editing: {
          question: { es: "¿Podré actualizar el contenido?", en: "Will I be able to update the content?" },
          answer: {
            es: "Sí. La solución se elige considerando quién administrará el sitio. Puedo integrar un CMS, WordPress, Shopify o contenido estructurado según el caso.",
            en: "Yes. The solution is chosen with whoever will manage the site in mind. I can integrate a CMS, WordPress, Shopify or structured content as needed.",
          },
        },
      },
    },
    finalCta: {
      eyebrow: { es: "Brief abierto", en: "Open brief" },
      title: { es: "¿Qué necesitas construir?", en: "What do you need to build?" },
      copy: { es: "Cuéntame el contexto y te propondré una ruta realista.", en: "Tell me the context and I'll propose a realistic plan." },
      cta: { es: "Empezar conversación", en: "Start the conversation" },
    },
  },

  about: {
    seo: {
      title: { es: "Sobre mí: desarrollador Full Stack", en: "About me: full-stack developer" },
      description: {
        es: "Conoce a Emmanuel Dávila, desarrollador Full Stack y de automatización en Medellín: desarrollo web a la medida, WordPress, Shopify y Microsoft 365.",
        en: "Meet Emmanuel Dávila, full-stack and automation developer in Medellín, Colombia: custom web development, WordPress, Shopify and Microsoft 365.",
      },
    },
    // Título, entradilla y bio: `profile.about` y `profile.bio` (content/profile.ts).
    hero: {
      eyebrow: { es: "C:\\EDAV\\SOBRE-MI.EXE", en: "C:\\EDAV\\ABOUT.EXE" },
      intro: { es: "Soy {name}, {role}.", en: "I'm {name}, {role}." },
      cta: { es: "Trabajemos juntos", en: "Let's work together" },
    },
    profile: {
      eyebrow: { es: "TL;DR · Perfil", en: "TL;DR · Profile" },
      windowTitle: { es: "perfil.ini", en: "profile.ini" },
      name: { es: "Nombre", en: "Name" },
      base: { es: "Base", en: "Based in" },
      role: { es: "Rol", en: "Role" },
      experience: { es: "Experiencia", en: "Experience" },
      mode: { es: "Modo", en: "Status" },
    },
    experience: {
      eyebrow: { es: "Experiencia", en: "Experience" },
      title: { es: "Dónde he trabajado.", en: "Where I've worked." },
    },
    education: {
      eyebrow: { es: "Formación", en: "Education" },
      title: { es: "Lo que he estudiado.", en: "What I've studied." },
    },
    skills: {
      eyebrow: { es: "Herramientas", en: "Tools" },
      title: { es: "Tecnologías con las que construyo.", en: "Technologies I build with." },
      windowTitle: { es: "stack.sys", en: "stack.sys" },
    },
    finalCta: {
      eyebrow: { es: "Conexión disponible", en: "Connection available" },
      title: { es: "¿Crees que podemos hacer buen equipo?", en: "Think we could make a good team?" },
      cta: { es: "Conversemos", en: "Let's talk" },
    },
  },

  blog: {
    seo: {
      title: { es: "Blog: desarrollo web, SEO y automatización", en: "Blog: web development, SEO and automation" },
      description: {
        es: "Artículos de Emmanuel Dávila sobre páginas web para negocios, SEO, WordPress, Shopify y automatización de procesos, escritos para dueños de negocio.",
        en: "Articles by Emmanuel Dávila on business websites, SEO, WordPress, Shopify and process automation, written for business owners.",
      },
    },
    hero: {
      eyebrow: { es: "C:\\EDAV\\BLOG", en: "C:\\EDAV\\BLOG" },
      title: { es: "Notas sobre web, SEO y automatización.", en: "Notes on the web, SEO and automation." },
      lead: {
        es: "Lo que suelo explicarles a los negocios antes de empezar un proyecto, escrito sin tecnicismos.",
        en: "What I usually explain to businesses before starting a project, written without jargon.",
      },
    },
    finalCta: {
      title: { es: "¿Tienes un proyecto en mente?", en: "Have a project in mind?" },
      /** "Revisa los <enlace>servicios</enlace> o cuéntame qué necesitas." */
      copyBefore: { es: "Revisa los", en: "Check out the" },
      copyLink: { es: "servicios", en: "services" },
      copyAfter: { es: "o cuéntame qué necesitas.", en: "or tell me what you need." },
    },
  },

  now: {
    seo: {
      title: { es: "Ahora — Música y actividad", en: "Now — Music and activity" },
      description: {
        es: "Qué escucha y en qué trabaja ahora Emmanuel Dávila: su actividad musical reciente en Last.fm y sus focos actuales en desarrollo web y automatización.",
        en: "What Emmanuel Dávila is listening to and working on now: his recent music activity on Last.fm and his current focus on web development and automation.",
      },
    },
    hero: {
      eyebrow: { es: "C:\\EDAV\\NOW.PLAYING", en: "C:\\EDAV\\NOW.PLAYING" },
      title: { es: "Lo que suena mientras construyo.", en: "What's playing while I build." },
      lead: {
        es: "Una página viva con mi actividad musical reciente en Last.fm y algunas cosas que ocupan mi curiosidad ahora mismo.",
        en: "A living page with my recent music activity on Last.fm and a few things on my mind right now.",
      },
      cta: { es: "Seguir en Last.fm", en: "Follow on Last.fm" },
    },
    focus: {
      playerWindow: { es: "lastfm_player.exe", en: "lastfm_player.exe" },
      windowTitle: { es: "current_focus.txt", en: "current_focus.txt" },
      eyebrow: { es: "Foco actual", en: "Current focus" },
      items: {
        es: [
          "Desarrollo de experiencias web con identidad propia.",
          "Arquitecturas modernas con React, Next.js y TypeScript.",
          "Automatización, APIs y productos que conectan sistemas.",
          "Diseño responsive, accesibilidad y SEO técnico.",
        ],
        en: [
          "Building web experiences with their own identity.",
          "Modern architectures with React, Next.js and TypeScript.",
          "Automation, APIs and products that connect systems.",
          "Responsive design, accessibility and technical SEO.",
        ],
      },
    },
    finalCta: {
      eyebrow: { es: "Compartamos ideas", en: "Let's share ideas" },
      title: { es: "¿También creas mejor con música?", en: "Do you also create better with music?" },
      cta: { es: "Hablemos de tu proyecto", en: "Let's talk about your project" },
    },
  },

  contact: {
    seo: {
      title: { es: "Contacto — Inicia un proyecto web", en: "Contact — Start a web project" },
      description: {
        es: "Contacta a Emmanuel Dávila para conversar sobre desarrollo web, WordPress, WooCommerce, Shopify o diseño web.",
        en: "Contact Emmanuel Dávila to talk about web development, WordPress, WooCommerce, Shopify or web design.",
      },
    },
    hero: {
      eyebrow: { es: "C:\\EDAV\\CONTACT.EXE", en: "C:\\EDAV\\CONTACT.EXE" },
      title: { es: "Cuéntame qué quieres construir.", en: "Tell me what you want to build." },
      lead: {
        es: "Describe tu idea, el problema que quieres resolver y cualquier fecha importante. Te responderé con preguntas concretas y el siguiente paso.",
        en: "Describe your idea, the problem you want to solve and any important dates. I'll reply with specific questions and the next step.",
      },
      cta: { es: "Abrir formulario", en: "Open the form" },
    },
    brief: {
      eyebrow: { es: "TL;DR · Para avanzar rápido", en: "TL;DR · To move fast" },
      title: { es: "Un buen brief no tiene que ser largo.", en: "A good brief doesn't have to be long." },
      copy: {
        es: "Con objetivo, público, alcance aproximado y referencias ya podemos tener una primera conversación útil.",
        en: "With a goal, audience, rough scope and references, we can already have a useful first conversation.",
      },
      points: {
        es: ["Respuesta clara y sin compromiso.", "Alcance, tiempos y entregables por escrito.", "Comunicación directa durante el proyecto."],
        en: ["A clear, no-commitment reply.", "Scope, timelines and deliverables in writing.", "Direct communication throughout the project."],
      },
      whatsapp: { es: "¿Prefieres WhatsApp? Abrir conversación →", en: "Prefer WhatsApp? Open a chat →" },
      formWindow: { es: "new_project.msg", en: "new_project.msg" },
    },
  },
} as const satisfies Record<StaticPageKey, PageCopy>;

export type Pages = typeof pages;

/** Textos de una página resueltos para un idioma. */
export function pageFor<K extends StaticPageKey>(locale: Locale, key: K): Resolved<Pages[K]> {
  return resolveLocale(pages[key], locale);
}
