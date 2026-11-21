/**
 * Microcopy de interfaz ES/EN (docs/arquitectura-rutas.md §4.3).
 *
 * Solo etiquetas, estados y mensajes; el contenido (perfil, proyectos, servicios, posts) vive en
 * su propio módulo y los textos de cabecera/SEO de cada página en `content/pages.ts`.
 *
 * Reglas:
 * - Cada hoja es un `L<string>` (o `L<string[]>`). `uiFor(locale, section)` devuelve la sección resuelta.
 * - Los textos con datos usan marcadores `{nombre}`; se rellenan con `format()`. Así todo sigue siendo
 *   serializable y el servidor puede pasar strings ya resueltos a los componentes cliente.
 * - Los componentes cliente NO importan este módulo: el servidor resuelve la sección y la pasa por props.
 * - Las líneas de la BIOS del escritorio van en inglés en ambos idiomas a propósito (estética retro).
 */
import type { L, Locale } from "./types";

// --- Resolución --------------------------------------------------------------------------------

/** Árbol de textos: cada hoja es un `L` de texto o de lista de textos. */
export type CopyTree = { readonly [key: string]: L<string> | L<readonly string[]> | CopyTree };

/** Literales `as const` → `string` / `string[]`. */
type Widen<T> = T extends string ? string : T extends readonly string[] ? string[] : T;

/** `L<T>` resuelto en profundidad: cada `{ es, en }` pasa a ser su valor. */
export type Resolved<T> = T extends { readonly es: infer A; readonly en: unknown }
  ? Widen<A>
  : T extends readonly unknown[]
    ? Resolved<T[number]>[]
    : T extends object
      ? { -readonly [K in keyof T]: Resolved<T[K]> }
      : T;

/** Un objeto es un `L` si sus claves son exactamente `es` y `en`. */
export function isLocalized(value: unknown): value is L<unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === 2 && "es" in value && "en" in value;
}

/** Resuelve en profundidad todos los `L` de un árbol para un idioma. */
export function resolveLocale<T>(tree: T, locale: Locale): Resolved<T> {
  if (isLocalized(tree)) return tree[locale] as Resolved<T>;
  if (Array.isArray(tree)) return tree.map((item) => resolveLocale(item, locale)) as Resolved<T>;
  if (typeof tree === "object" && tree !== null) {
    return Object.fromEntries(Object.entries(tree).map(([key, value]) => [key, resolveLocale(value, locale)])) as Resolved<T>;
  }
  return tree as Resolved<T>;
}

/** Rellena marcadores `{nombre}`. Un marcador sin valor se deja tal cual (se ve en la revisión). */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}

// --- Microcopy ---------------------------------------------------------------------------------

export const ui = {
  /** Textos solo para tecnologías de asistencia (aria-label, sr-only). */
  a11y: {
    skipToContent: { es: "Saltar al contenido", en: "Skip to content" },
    homeLink: { es: "EDAV OS, inicio", en: "EDAV OS, home" },
    openMenu: { es: "Abrir menú", en: "Open menu" },
    closeMenu: { es: "Cerrar menú", en: "Close menu" },
    mainNav: { es: "Navegación principal", en: "Main navigation" },
    footerNav: { es: "Enlaces del pie", en: "Footer links" },
    breadcrumbs: { es: "Migas de pan", en: "Breadcrumbs" },
    downloadCvPdf: { es: "Descargar CV (PDF)", en: "Download CV (PDF)" },
    techTicker: { es: "Tecnologías principales", en: "Main technologies" },
    logoOf: { es: "Logo de {name}", en: "{name} logo" },
  },

  nav: {
    home: { es: "Inicio", en: "Home" },
    projects: { es: "Proyectos", en: "Projects" },
    services: { es: "Servicios", en: "Services" },
    about: { es: "Sobre mí", en: "About" },
    blog: { es: "Blog", en: "Blog" },
    now: { es: "Ahora", en: "Now" },
    contact: { es: "Contacto", en: "Contact" },
    cv: { es: "CV", en: "CV" },
    startProject: { es: "Iniciar proyecto", en: "Start a project" },
    brandName: { es: "EDAV OS", en: "EDAV OS" },
    brandTagline: { es: "Full Stack · automatización", en: "Full Stack · automation" },
  },

  /** Selector de idioma y aviso de versión en otro idioma (F5). */
  language: {
    label: { es: "Idioma", en: "Language" },
    current: { es: "Español", en: "English" },
    /** Enlace a la otra versión, escrito en el idioma de destino. */
    switchTo: { es: "English version", en: "Versión en español" },
    switchToLang: { es: "en", en: "es" },
    dismiss: { es: "Cerrar aviso", en: "Dismiss" },
  },

  footer: {
    eyebrow: { es: "EDAV OS · ONLINE", en: "EDAV OS · ONLINE" },
    contactKit: { es: "Contacto directo y CV", en: "Direct contact and CV" },
    desktopMode: { es: "Modo escritorio (EDAV Desktop 98)", en: "Desktop mode (EDAV Desktop 98)" },
    lastfm: { es: "Last.fm", en: "Last.fm" },
    madeWith: { es: "Hecho con código y curiosidad.", en: "Made with code and curiosity." },
  },

  /** Kit de contacto directo (CV ES/EN, correo, LinkedIn, GitHub). */
  contactKit: {
    label: { es: "Contacto directo", en: "Direct contact" },
    labelWithCv: { es: "CV y contacto directo", en: "CV and direct contact" },
    cvEs: { es: "CV en español", en: "CV in Spanish" },
    cvEn: { es: "CV in English", en: "CV in English" },
    pdf: { es: "PDF", en: "PDF" },
    linkedin: { es: "LinkedIn", en: "LinkedIn" },
    github: { es: "GitHub", en: "GitHub" },
    downloadCv: { es: "Descargar CV", en: "Download CV" },
  },

  /** Etiquetas comunes de llamadas a la acción y secciones repetidas. */
  common: {
    nextStep: { es: "Siguiente paso", en: "Next step" },
    writeMe: { es: "Escríbeme", en: "Write to me" },
    tldr: { es: "TL;DR", en: "TL;DR" },
    faq: { es: "Preguntas frecuentes", en: "Frequently asked questions" },
    since: { es: "Desde {year}", en: "Since {year}" },
    present: { es: "actualidad", en: "present" },
  },

  project: {
    openCaseStudy: { es: "Abrir caso de estudio", en: "Open case study" },
    viewCaseStudy: { es: "Ver caso de estudio {title}", en: "View the {title} case study" },
    /** Título SEO de un caso: "{title} — Caso de estudio". */
    caseStudyTitle: { es: "{title} — Caso de estudio", en: "{title} — Case study" },
    documentedCount: { es: "{count} casos documentados", en: "{count} documented case studies" },
    client: { es: "Cliente", en: "Client" },
    location: { es: "Ubicación", en: "Location" },
    year: { es: "Año", en: "Year" },
    status: { es: "Estado", en: "Status" },
    solutionTitle: { es: "La solución en breve", en: "The solution in brief" },
    challengeTitle: { es: "El reto", en: "The challenge" },
    builtTitle: { es: "Qué construí", en: "What I built" },
    technologiesTitle: { es: "Tecnologías", en: "Technologies" },
    areaHeader: { es: "Área", en: "Area" },
    toolsHeader: { es: "Herramientas", en: "Tools" },
    implementation: { es: "Implementación", en: "Implementation" },
    approach: { es: "Enfoque", en: "Approach" },
    approachValue: {
      es: "Responsive, accesibilidad, rendimiento y facilidad de edición",
      en: "Responsive design, accessibility, performance and ease of editing",
    },
    faqTitle: { es: "Sobre este proyecto", en: "About this project" },
    faqWhat: { es: "¿Qué se hizo en el proyecto {title}?", en: "What was done in the {title} project?" },
    faqTech: { es: "¿Qué tecnologías se utilizaron en {title}?", en: "Which technologies were used in {title}?" },
    faqSimilar: { es: "¿Emmanuel desarrolla proyectos similares?", en: "Does Emmanuel build similar projects?" },
    faqSimilarAnswer: {
      es: "Sí. Cada solución se adapta al negocio, la identidad, el contenido y los objetivos concretos del proyecto.",
      en: "Yes. Each solution is tailored to the business, its identity, its content and the project's specific goals.",
    },
    similarCta: { es: "Quiero un proyecto similar", en: "I want a similar project" },
    nextTitle: { es: "Tu proyecto podría ser el próximo caso.", en: "Your project could be the next case study." },
    nextCta: { es: "Cuéntame tu idea", en: "Tell me your idea" },
    /** Mismos valores que `statusLabels` de `content/projects.ts` (aquí para no cargar proyectos en cliente). */
    statusLabels: {
      delivered: { es: "Entregado", en: "Delivered" },
      live: { es: "En uso", en: "In use" },
      "in-development": { es: "En desarrollo", en: "In development" },
      academic: { es: "Académico", en: "Academic" },
    },
    /** Mismos valores que `ownershipLabels` de `content/projects.ts`. */
    ownershipLabels: {
      own: { es: "Proyecto propio", en: "Own project" },
      "co-created": { es: "Cocreado", en: "Co-created" },
      collaboration: { es: "Colaboración", en: "Collaboration" },
      client: { es: "Proyecto para cliente", en: "Client project" },
    },
    /** Mismos valores que `projectKinds` de `content/projects.ts`. */
    kindLabels: {
      client: { es: "Clientes", en: "Clients" },
      personal: { es: "Personales", en: "Personal" },
      automation: { es: "Automatizaciones", en: "Automation" },
    },
  },

  post: {
    by: { es: "Por", en: "By" },
    updatedOn: { es: "Actualizado el", en: "Updated on" },
    author: { es: "Autor", en: "Author" },
    published: { es: "Publicado", en: "Published" },
    updated: { es: "Actualizado", en: "Updated" },
    topics: { es: "Temas", en: "Topics" },
    read: { es: "Leer «{title}»", en: "Read “{title}”" },
    articleCount: { es: "{count} artículos", en: "{count} articles" },
    allArticles: { es: "Todos los artículos.", en: "All articles." },
    nextTitle: { es: "¿Hablamos de tu proyecto?", en: "Shall we talk about your project?" },
    nextCopy: {
      es: "Sitios a la medida, WordPress, Shopify y automatización de procesos.",
      en: "Custom websites, WordPress, Shopify and process automation.",
    },
  },

  /** Formulario de contacto. La API responde `{ ok: false, code }` y el cliente traduce el código. */
  contactForm: {
    name: { es: "Nombre", en: "Name" },
    namePlaceholder: { es: "¿Cómo te llamas?", en: "What's your name?" },
    email: { es: "Correo", en: "Email" },
    emailPlaceholder: { es: "tu@correo.com", en: "you@email.com" },
    service: { es: "Tipo de proyecto", en: "Project type" },
    servicePlaceholder: { es: "Selecciona una opción", en: "Select an option" },
    message: { es: "Cuéntame sobre la idea", en: "Tell me about the idea" },
    messagePlaceholder: { es: "Objetivo, alcance, fechas y cualquier contexto útil…", en: "Goal, scope, dates and any useful context…" },
    honeypot: { es: "Sitio web", en: "Website" },
    submit: { es: "Enviar mensaje", en: "Send message" },
    sending: { es: "Enviando…", en: "Sending…" },
    success: { es: "Mensaje enviado. Te responderé tan pronto como sea posible.", en: "Message sent. I'll get back to you as soon as possible." },
    /** Sin red: `fetch` lanza TypeError. */
    network: { es: "No hay conexión con el servidor. Revisa tu red e intenta de nuevo.", en: "Can't reach the server. Check your connection and try again." },
    /** Respuesta inesperada sin código conocido. */
    generic: { es: "Ocurrió un error. Intenta de nuevo.", en: "Something went wrong. Please try again." },
    /** 429 con `Retry-After` legible. */
    rateLimitedWait: {
      es: "Has enviado varios mensajes seguidos. Podrás intentarlo de nuevo en {wait}. Si es urgente, escríbeme por WhatsApp.",
      en: "You've sent several messages in a row. You can try again in {wait}. If it's urgent, message me on WhatsApp.",
    },
    waitUnits: {
      second: { es: "1 segundo", en: "1 second" },
      seconds: { es: "{n} segundos", en: "{n} seconds" },
      minute: { es: "1 minuto", en: "1 minute" },
      minutes: { es: "{n} minutos", en: "{n} minutes" },
    },
    errors: {
      invalid: { es: "Revisa el nombre, correo y mensaje antes de enviar.", en: "Please check your name, email and message before sending." },
      rate_limited: {
        es: "Se alcanzó el límite de envíos. Intenta de nuevo más tarde o escríbeme por WhatsApp.",
        en: "The sending limit has been reached. Try again later or message me on WhatsApp.",
      },
      origin: { es: "Origen no permitido.", en: "Origin not allowed." },
      server: { es: "No fue posible enviar el mensaje. Intenta por WhatsApp.", en: "The message couldn't be sent. Please try WhatsApp." },
      not_configured: { es: "El formulario aún no está conectado. Escríbeme por WhatsApp.", en: "The form isn't connected yet. Please message me on WhatsApp." },
      too_large: { es: "El mensaje es demasiado largo.", en: "The message is too long." },
      timeout: { es: "La solicitud tardó demasiado.", en: "The request took too long." },
    },
  },

  notFound: {
    windowTitle: { es: "EDAV OS — Error del sistema", en: "EDAV OS — System error" },
    title: { es: "Esta ruta se perdió en el ciberespacio.", en: "This route got lost in cyberspace." },
    body: {
      es: "El archivo que buscas no existe, cambió de nombre o decidió tomarse el día libre. Prueba con alguna de estas rutas:",
      en: "The file you're looking for doesn't exist, was renamed or decided to take the day off. Try one of these routes:",
    },
    home: { es: "Volver al inicio", en: "Back to home" },
    projects: { es: "Ver proyectos", en: "View projects" },
    contact: { es: "Contactar", en: "Get in touch" },
    otherLanguage: { es: "English version", en: "Versión en español" },
  },

  /** Reproductor de Last.fm (portada, /ahora y escritorio). */
  music: {
    region: { es: "Reproductor de música Last.fm", en: "Last.fm music player" },
    coverLink: { es: "Abrir perfil o canción en Last.fm", en: "Open profile or track on Last.fm" },
    coverAlt: { es: "Portada de {track}", en: "{track} cover art" },
    titlebar: { es: "EDAV.FM // WINAMP", en: "EDAV.FM // WINAMP" },
    quality: { es: "STEREO · 192 KBPS", en: "STEREO · 192 KBPS" },
    loadingStatus: { es: "CARGANDO LASTFM.DRV", en: "LOADING LASTFM.DRV" },
    nowPlaying: { es: "● ESCUCHANDO AHORA", en: "● NOW PLAYING" },
    offline: { es: "○ MODO OFFLINE", en: "○ OFFLINE MODE" },
    lastPlayed: { es: "○ ÚLTIMA REPRODUCCIÓN", en: "○ LAST PLAYED" },
    loadingTitle: { es: "Buscando tu soundtrack…", en: "Looking for your soundtrack…" },
    waitingTitle: { es: "Last.fm espera conexión", en: "Last.fm is waiting for a connection" },
    loadingDetail: { es: "Consultando a {user}", en: "Checking {user}" },
    unavailable: { es: "Last.fm no está disponible en este momento.", en: "Last.fm isn't available right now." },
    noResponse: { es: "LAST.FM SIN RESPUESTA", en: "NO RESPONSE FROM LAST.FM" },
    poweredBy: { es: "Datos de Last.fm", en: "Data from Last.fm" },
    openLastfm: { es: "ABRIR LAST.FM ↗", en: "OPEN LAST.FM ↗" },
    volume: { es: "VOL", en: "VOL" },
  },

  /** Escritorio EDAV Desktop 98 (componentes de `components/desktop/`). */
  os: {
    loading: { es: "Cargando EDAV Desktop 98…", en: "Loading EDAV Desktop 98…" },
    productName: { es: "EDAV Desktop 98", en: "EDAV Desktop 98" },
    /** Título de ventana/icono y nombre de "archivo" de cada aplicación. */
    apps: {
      welcome: { title: { es: "Bienvenido", en: "Welcome" }, file: { es: "Bienvenido.exe", en: "Welcome.exe" } },
      projects: { title: { es: "Mi trabajo", en: "My work" }, file: { es: "Explorador de proyectos", en: "Project Explorer" } },
      services: { title: { es: "Mis servicios", en: "My services" }, file: { es: "Asistente de servicios", en: "Services Wizard" } },
      about: { title: { es: "Sobre Emmanuel", en: "About Emmanuel" }, file: { es: "About.txt", en: "About.txt" } },
      contact: { title: { es: "Contacto", en: "Contact" }, file: { es: "Nuevo mensaje", en: "New Message" } },
      media: { title: { es: "Reproductor", en: "Player" }, file: { es: "Reproductor multimedia EDAV", en: "EDAV Media Player" } },
      terminal: { title: { es: "Símbolo del sistema", en: "Command Prompt" }, file: { es: "C:\\EDAV", en: "C:\\EDAV" } },
    },
    boot: {
      region: { es: "Inicio de EDAV Desktop 98", en: "EDAV Desktop 98 startup" },
      announce: { es: "Iniciando EDAV Desktop 98…", en: "Starting EDAV Desktop 98…" },
      // BIOS: inglés en ambos idiomas (decorativo, aria-hidden).
      biosLines: {
        es: [
          "Copyright (C) 2026 Emmanuel Dávila. All systems reserved.",
          "CPU: Creative Engine @ 404 MHz",
          "Detecting primary master ........ PORTFOLIO.EXE",
          "Detecting design system ......... EDAV DESKTOP 98",
          "Mouse interface ................. ONLINE",
          "Loading LASTFM.DRV .............. READY",
          "Starting graphical interface .... OK",
        ],
        en: [
          "Copyright (C) 2026 Emmanuel Dávila. All systems reserved.",
          "CPU: Creative Engine @ 404 MHz",
          "Detecting primary master ........ PORTFOLIO.EXE",
          "Detecting design system ......... EDAV DESKTOP 98",
          "Mouse interface ................. ONLINE",
          "Loading LASTFM.DRV .............. READY",
          "Starting graphical interface .... OK",
        ],
      },
      mountProjects: { es: "Mounting C:\\PROJECTS ............ {count} ITEMS", en: "Mounting C:\\PROJECTS ............ {count} ITEMS" },
      pressToStart: { es: "Presiona Enter o haz clic para iniciar", en: "Press Enter or click to start" },
      gestureNote: { es: "El gesto activa la secuencia de audio del sistema.", en: "The gesture enables the system audio sequence." },
      startWithSound: { es: "Iniciar con sonido", en: "Start with sound" },
      subtitle: { es: "Sistema de portafolio personal", en: "Personal portfolio system" },
      preparing: { es: "Preparando tu escritorio...", en: "Preparing your desktop..." },
      keysHint: { es: "ENTER: iniciar · ESC: omitir", en: "ENTER: start · ESC: skip" },
      accessibleView: { es: "Vista web accesible", en: "Accessible web view" },
      skip: { es: "Omitir inicio", en: "Skip startup" },
      audioUnavailable: { es: "Web Audio no disponible", en: "Web Audio unavailable" },
    },
    explorer: {
      address: { es: "Dirección", en: "Address" },
      path: { es: "C:\\Mi trabajo\\Todos", en: "C:\\My work\\All" },
      folders: { es: "Carpetas", en: "Folders" },
      desktop: { es: "Escritorio", en: "Desktop" },
      selected: { es: "SELECCIONADO", en: "SELECTED" },
      selectItem: { es: "Seleccionar {title}. Doble clic para abrir el caso.", en: "Select {title}. Double-click to open the case study." },
      previewAlt: { es: "Vista previa del proyecto {title}", en: "Preview of the {title} project" },
      openCase: { es: "Abrir caso", en: "Open case" },
    },
    welcome: {
      kicker: { es: "BIENVENIDO A MI PC", en: "WELCOME TO MY PC" },
      title: { es: "Sitios, productos y automatizaciones hechos a la medida.", en: "Custom-built websites, products and automations." },
      intro: {
        es: "Soy {name}, {role}. Construyo sitios, tiendas y productos digitales, y automatizo procesos para reducir el trabajo repetitivo.",
        en: "I'm {name}, {role}. I build websites, online stores and digital products, and automate processes to cut repetitive work.",
      },
      exploreWork: { es: "Explorar mi trabajo", en: "Explore my work" },
      startProject: { es: "Iniciar proyecto", en: "Start a project" },
      projectsCount: { es: "{count} proyectos", en: "{count} projects" },
      services: { es: "Servicios", en: "Services" },
      developerMode: { es: "Modo desarrollador", en: "Developer mode" },
    },
    about: {
      available: { es: "Disponible para proyectos", en: "Available for projects" },
      kicker: { es: "ABOUT_EMMANUEL.TXT", en: "ABOUT_EMMANUEL.TXT" },
      titleLine1: { es: "Curioso por naturaleza.", en: "Curious by nature." },
      titleLine2: { es: "Práctico por oficio.", en: "Practical by trade." },
      role: { es: "Rol", en: "Role" },
      experience: { es: "Experiencia", en: "Experience" },
      projects: { es: "Proyectos", en: "Projects" },
      projectsValue: { es: "{count} documentados", en: "{count} documented" },
      cvEs: { es: "CV (ES, PDF)", en: "CV (ES, PDF)" },
      cvEn: { es: "CV (EN, PDF)", en: "CV (EN, PDF)" },
      openProfile: { es: "Abrir perfil completo", en: "Open full profile" },
    },
    contact: {
      kicker: { es: "NUEVO MENSAJE", en: "NEW MESSAGE" },
      title: { es: "Cuéntame qué quieres construir.", en: "Tell me what you want to build." },
      copy: {
        es: "Objetivo, alcance, público y referencias: con eso podemos comenzar una conversación útil.",
        en: "Goal, scope, audience and references: that's enough to start a useful conversation.",
      },
    },
    wizard: {
      sidebar: { es: "Asistente de configuración de proyecto", en: "Project Setup Wizard" },
      step: { es: "Paso {n} de {total}", en: "Step {n} of {total}" },
      chooseTitle: { es: "¿Qué quieres construir?", en: "What do you want to build?" },
      chooseCopy: { es: "Selecciona el tipo de proyecto que más se acerca a tu idea.", en: "Choose the project type closest to your idea." },
      includes: { es: "Este paquete puede incluir:", en: "This package can include:" },
      stack: { es: "Stack recomendado:", en: "Recommended stack:" },
      doneKicker: { es: "Configuración completa", en: "Setup complete" },
      doneTitle: { es: "Tu idea está lista para conversar.", en: "Your idea is ready to discuss." },
      doneCopy: {
        es: "Cuéntame el contexto, los objetivos y las fechas. Prepararé una ruta clara para tu proyecto de {service}.",
        en: "Tell me the context, goals and dates. I'll prepare a clear plan for your {service} project.",
      },
      openForm: { es: "Abrir formulario de contacto", en: "Open contact form" },
      back: { es: "Atrás", en: "Back" },
      next: { es: "Siguiente", en: "Next" },
    },
    terminal: {
      banner: { es: "EDAV Símbolo del sistema [Versión 98.04.04]", en: "EDAV Command Prompt [Version 98.04.04]" },
      hint: { es: "Escribe HELP para listar los comandos disponibles.", en: "Type HELP to list the available commands." },
      opening: { es: "Abriendo {app}.exe...", en: "Opening {app}.exe..." },
      requested: { es: "Solicitud enviada: {app}.exe", en: "Request sent: {app}.exe" },
      unknown: { es: "'{input}' no se reconoce como comando. Escribe HELP.", en: "'{input}' is not recognized as a command. Type HELP." },
      inputLabel: { es: "Comando de terminal", en: "Terminal command" },
    },
    window: {
      minimize: { es: "Minimizar", en: "Minimize" },
      maximize: { es: "Maximizar", en: "Maximize" },
      restore: { es: "Restaurar", en: "Restore" },
      close: { es: "Cerrar", en: "Close" },
      /** aria-label de los botones: "{action} {title}". */
      actionOn: { es: "{action} {title}", en: "{action} {title}" },
      resize: { es: "Redimensionar {title}", en: "Resize {title}" },
      resizeHint: { es: "Arrastra para redimensionar", en: "Drag to resize" },
      menuFile: { es: "Archivo", en: "File" },
      menuEdit: { es: "Editar", en: "Edit" },
      menuView: { es: "Ver", en: "View" },
      menuHelp: { es: "Ayuda", en: "Help" },
    },
    desktop: {
      skipLink: { es: "Ir al contenido principal", en: "Skip to main content" },
      iconsGroup: { es: "Aplicaciones del escritorio", en: "Desktop applications" },
      accessibleView: { es: "Vista web accesible", en: "Accessible web view" },
      quickLaunch: { es: "Accesos rápidos", en: "Quick launch" },
      readyNotice: { es: "Sistema listo — doble clic o Enter para explorar.", en: "System ready — double-click or press Enter to explore." },
      welcomeNotice: { es: "Bienvenido a EDAV Desktop 98", en: "Welcome to EDAV Desktop 98" },
      refreshedNotice: { es: "Escritorio actualizado.", en: "Desktop refreshed." },
      closeNotification: { es: "Cerrar notificación", en: "Close notification" },
      openTerminal: { es: "Abrir terminal", en: "Open terminal" },
      refresh: { es: "Actualizar", en: "Refresh" },
      enableCrt: { es: "Activar efecto CRT", en: "Turn on CRT effect" },
      disableCrt: { es: "Desactivar efecto CRT", en: "Turn off CRT effect" },
      sound: { es: "Sonido: {state}", en: "Sound: {state}" },
      properties: { es: "Propiedades", en: "Properties" },
      signOut: { es: "Cerrar sesión", en: "Log off" },
      signOutNotice: { es: "Gracias por visitar mi computador personal.", en: "Thanks for visiting my personal computer." },
      taskbar: { es: "Barra de tareas", en: "Taskbar" },
      start: { es: "Inicio", en: "Start" },
      switchToWeb: { es: "Cambiar a vista web convencional", en: "Switch to the standard web view" },
      toggleCrt: { es: "Alternar efecto CRT", en: "Toggle CRT effect" },
      toggleSound: { es: "Alternar sonido", en: "Toggle sound" },
      startTagline: { es: "Full Stack y automatización", en: "Full Stack & automation" },
    },
    clippy: {
      appearing: { es: "Iniciando ED Assistant...", en: "Starting ED Assistant..." },
      idle: { es: "Parece que estás explorando el portafolio de Emmanuel. ¿Quieres que te ayude?", en: "It looks like you're exploring Emmanuel's portfolio. Would you like some help?" },
      writing: {
        es: "Parece que estás escribiendo un mensaje. Incluye objetivo, alcance y fecha para recibir una respuesta más útil.",
        en: "It looks like you're writing a message. Include your goal, scope and date to get a more useful reply.",
      },
      searchingBefore: { es: "Estoy buscando comandos disponibles. Escribe", en: "I'm looking for available commands. Type" },
      searchingAfter: { es: "para verlos todos.", en: "to see them all." },
      confused: {
        es: "Hmm... no encuentro ese archivo. Podemos volver al escritorio o abrir los proyectos.",
        en: "Hmm... I can't find that file. We can go back to the desktop or open the projects.",
      },
      viewProjects: { es: "Ver proyectos", en: "View projects" },
      contact: { es: "Contactar", en: "Get in touch" },
      show: { es: "Mostrar asistente ED", en: "Show ED assistant" },
      name: { es: "Asistente ED", en: "ED assistant" },
      closeMessage: { es: "Cerrar mensaje del asistente", en: "Close assistant message" },
      dragHint: {
        es: "Asistente ED: clic para mostrar ayuda; arrástralo o usa las flechas para moverlo.",
        en: "ED assistant: click to show help; drag it or use the arrow keys to move it.",
      },
      hideLabel: { es: "Ocultar asistente ED", en: "Hide ED assistant" },
      hide: { es: "Ocultar", en: "Hide" },
    },
  },
} as const satisfies CopyTree;

export type Ui = typeof ui;
export type UiSection = keyof Ui;

/** Código de error que devuelve `/api/contact` (`{ ok: false, code }`). */
export type ContactErrorCode = keyof Ui["contactForm"]["errors"];
export const contactErrorCodes = Object.keys(ui.contactForm.errors) as ContactErrorCode[];

/** Sección de microcopy resuelta para un idioma (para pasarla por props a componentes cliente). */
export function uiFor<S extends UiSection>(locale: Locale, section: S): Resolved<Ui[S]> {
  return resolveLocale(ui[section], locale);
}
