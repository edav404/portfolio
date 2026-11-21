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
import { projectKindLabels, projectOwnershipLabels, projectStatusLabels } from "./project-labels";
import type { ContactErrorCode } from "./contact-errors";
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

/** `format` vive en content/format.ts (sin dependencias, usable en cliente). */
export { format } from "./format";

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
    /** Fuente única en content/project-labels.ts (la comparten projects.ts y el escritorio). */
    statusLabels: projectStatusLabels,
    ownershipLabels: projectOwnershipLabels,
    kindLabels: projectKindLabels,
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
    } satisfies Record<ContactErrorCode, L>,
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
    /** Botón de la portada que abre el escritorio. */
    open: { es: "Abrir EDAV Desktop 98", en: "Open EDAV Desktop 98" },
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
      /** Carpetas decorativas del árbol lateral. */
      folderWeb: { es: "Desarrollo web", en: "Web development" },
      folderCommerce: { es: "E-commerce", en: "E-commerce" },
      folderBrand: { es: "Identidad visual", en: "Visual identity" },
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
      since: { es: "Desde {year}", en: "Since {year}" },
      contactLinks: { es: "CV y contacto directo", en: "CV and direct contact" },
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

  /**
   * EDAV OS, el escritorio con ventanas de `/os/` (docs/arquitectura-os.md, Fase 4; la fuente es O3).
   * Sección aparte de `os` (el overlay `PortfolioExperience`, vivo hasta O9) para no engordar con
   * estas cadenas el HTML de la portada, que resuelve `os` entera. En O9 se retira `os` y esta
   * sección pasa a llamarse `os`.
   */
  osShell: {
    productName: { es: "EDAV OS", en: "EDAV OS" },
    /** `h1` permanente del escritorio (visualmente oculto). */
    heading: { es: "EDAV OS: escritorio de Emmanuel Dávila", en: "EDAV OS: Emmanuel Dávila's desktop" },
    meta: {
      title: { es: "EDAV OS, el escritorio de Emmanuel", en: "EDAV OS, Emmanuel's desktop" },
      description: {
        es: "Una versión interactiva del portafolio de Emmanuel Dávila como escritorio con ventanas: proyectos, servicios, contacto y más.",
        en: "An interactive version of Emmanuel Dávila's portfolio as a windowed desktop: projects, services, contact and more.",
      },
      /** `{title}` = nombre del proyecto. */
      projectTitle: { es: "{title} en EDAV OS", en: "{title} in EDAV OS" },
    },
    /** Vista de servidor sin JS y mientras el escritorio se construye (se reemplaza en O4). */
    fallback: {
      title: { es: "EDAV OS", en: "EDAV OS" },
      lead: {
        es: "El escritorio interactivo está en construcción. Mientras tanto puedes ver los proyectos como páginas normales.",
        en: "The interactive desktop is under construction. Meanwhile you can browse the projects as regular pages.",
      },
      projectsTitle: { es: "Proyectos", en: "Projects" },
      projectsCount: { es: "{count} proyectos", en: "{count} projects" },
      openPublic: { es: "Ver en la web", en: "View on the website" },
      backToOs: { es: "Volver al escritorio", en: "Back to the desktop" },
    },
    /** Visible, localizado y enfocable (§1.5): el escritorio sin JS no tiene función. */
    noscript: {
      message: {
        es: "EDAV OS necesita JavaScript para funcionar como escritorio.",
        en: "EDAV OS needs JavaScript to work as a desktop.",
      },
      link: { es: "Ir a la vista web", en: "Go to the website view" },
    },
    /** Nombre y "archivo" de cada app, estilo Windows XP. */
    apps: {
      welcome: { title: { es: "Bienvenido", en: "Welcome" }, file: { es: "Bienvenido.exe", en: "Welcome.exe" } },
      projects: { title: { es: "Mi trabajo", en: "My Work" }, file: { es: "Explorador de proyectos", en: "Project Explorer" } },
      services: { title: { es: "Asistente de servicios", en: "Services Wizard" }, file: { es: "Servicios.exe", en: "Services.exe" } },
      about: { title: { es: "Acerca de Emmanuel", en: "About Emmanuel" }, file: { es: "Acerca de.txt", en: "About.txt" } },
      contact: { title: { es: "Nuevo mensaje", en: "New Message" }, file: { es: "Correo EDAV", en: "EDAV Mail" } },
      media: { title: { es: "Reproductor EDAV", en: "EDAV Media Player" }, file: { es: "Reproductor.exe", en: "Player.exe" } },
      terminal: { title: { es: "Símbolo del sistema", en: "Command Prompt" }, file: { es: "C:\\EDAV", en: "C:\\EDAV" } },
      settings: { title: { es: "Propiedades", en: "Properties" }, file: { es: "Propiedades del sistema", en: "System Properties" } },
      cv: { title: { es: "CV.pdf", en: "CV.pdf" }, file: { es: "Descargar CV", en: "Download CV" } },
    },
    /** Iconos del escritorio (lista de aplicaciones). */
    desktop: {
      iconsGroup: { es: "Aplicaciones del escritorio", en: "Desktop applications" },
      skipToWindow: { es: "Ir a la ventana activa", en: "Skip to the active window" },
      /** Globo de bandeja de primer arranque (UX-11). */
      balloonTitle: { es: "Bienvenido a EDAV OS", en: "Welcome to EDAV OS" },
      balloonText: { es: "Haz clic en un icono para abrirlo", en: "Click an icon to open it" },
      balloonClose: { es: "Cerrar globo de ayuda", en: "Close help balloon" },
      /** Pocket: el escritorio es un lanzador. */
      launcher: { es: "Lanzador de aplicaciones", en: "App launcher" },
    },
    /** Ventana: cromo, menú de sistema y panel de pasos. */
    window: {
      minimize: { es: "Minimizar", en: "Minimize" },
      maximize: { es: "Maximizar", en: "Maximize" },
      restore: { es: "Restaurar", en: "Restore" },
      close: { es: "Cerrar", en: "Close" },
      /** aria-label de los botones de la barra de título. */
      actionOn: { es: "{action} {title}", en: "{action} {title}" },
      systemMenu: { es: "Menú de ventana de {title}", en: "Window menu for {title}" },
      menuRestore: { es: "Restaurar", en: "Restore" },
      menuMove: { es: "Mover", en: "Move" },
      menuSize: { es: "Tamaño", en: "Size" },
      menuMinimize: { es: "Minimizar", en: "Minimize" },
      menuMaximize: { es: "Maximizar", en: "Maximize" },
      menuSnapLeft: { es: "Ajustar a la izquierda", en: "Snap to the left" },
      menuSnapRight: { es: "Ajustar a la derecha", en: "Snap to the right" },
      menuCenter: { es: "Centrar", en: "Center" },
      menuResetPosition: { es: "Restablecer posición", en: "Reset position" },
      menuClose: { es: "Cerrar", en: "Close" },
      menuMoveAndResize: { es: "Mover y cambiar tamaño…", en: "Move and resize…" },
      /** Contenido cargando de una ventana de proyecto sin detalle todavía. */
      loading: { es: "Cargando…", en: "Loading…" },
    },
    /** Panel de pasos de un solo puntero (WCAG 2.5.7). */
    steps: {
      title: { es: "Mover y cambiar tamaño: {title}", en: "Move and resize: {title}" },
      moveGroup: { es: "Mover", en: "Move" },
      sizeGroup: { es: "Tamaño", en: "Size" },
      left: { es: "Mover a la izquierda", en: "Move left" },
      right: { es: "Mover a la derecha", en: "Move right" },
      up: { es: "Mover hacia arriba", en: "Move up" },
      down: { es: "Mover hacia abajo", en: "Move down" },
      widen: { es: "Más ancha", en: "Wider" },
      narrow: { es: "Más estrecha", en: "Narrower" },
      taller: { es: "Más alta", en: "Taller" },
      shorter: { es: "Más baja", en: "Shorter" },
      bigStep: { es: "Paso grande (x4)", en: "Large step (x4)" },
      done: { es: "Hecho", en: "Done" },
      cancel: { es: "Cancelar", en: "Cancel" },
      /** Anuncio al entrar en el modo Mover por teclado. */
      keyboardMove: {
        es: "Moviendo la ventana {title}. Flechas para mover, Intro para confirmar, Esc para cancelar.",
        en: "Moving window {title}. Arrow keys to move, Enter to confirm, Esc to cancel.",
      },
      keyboardSize: {
        es: "Cambiando el tamaño de la ventana {title}. Flechas para cambiar, Intro para confirmar, Esc para cancelar.",
        en: "Resizing window {title}. Arrow keys to resize, Enter to confirm, Esc to cancel.",
      },
      /** Anuncio agrupado tras pulsar pasos. */
      position: { es: "Posición {x}, {y}. Tamaño {w} por {h}.", en: "Position {x}, {y}. Size {w} by {h}." },
    },
    /** Menú Inicio (Disclosure: grupos de botones y enlaces, no `menu`). */
    start: {
      button: { es: "Inicio", en: "Start" },
      panel: { es: "Menú Inicio", en: "Start menu" },
      programsGroup: { es: "Programas", en: "Programs" },
      systemGroup: { es: "Sistema", en: "System" },
      allPrograms: { es: "Todos los programas", en: "All programs" },
      tagline: { es: "Full Stack y automatización", en: "Full Stack & automation" },
      openCv: { es: "Descargar CV", en: "Download CV" },
      webView: { es: "Vista web", en: "Website view" },
      logOff: { es: "Cerrar sesión", en: "Log off" },
      logOffNotice: { es: "Gracias por visitar mi computador personal.", en: "Thanks for visiting my personal computer." },
      language: { es: "English", en: "Español" },
    },
    /** Barra de tareas y bandeja. */
    taskbar: {
      label: { es: "Barra de tareas", en: "Taskbar" },
      minimized: { es: "minimizada", en: "minimized" },
      active: { es: "activa", en: "active" },
      tray: { es: "Área de notificación", en: "Notification area" },
      language: { es: "Cambiar idioma", en: "Change language" },
      sound: { es: "Sonido", en: "Sound" },
      screenEffect: { es: "Efecto de pantalla antigua", en: "Old screen effect" },
      assistant: { es: "Asistente ED", en: "ED assistant" },
      /** aria-label de `<time>`; `{date}` y `{time}` ya formateados. */
      clock: { es: "{date}, {time}", en: "{date}, {time}" },
      clockPlaceholder: { es: "--:--", en: "--:--" },
    },
    /** Menú contextual del escritorio (solo sobre el fondo). */
    contextMenu: {
      label: { es: "Menú del escritorio", en: "Desktop menu" },
      resetWindows: { es: "Restablecer ventanas", en: "Reset windows" },
      showDesktop: { es: "Mostrar escritorio", en: "Show desktop" },
      screenEffect: { es: "Efecto de pantalla antigua", en: "Old screen effect" },
      properties: { es: "Propiedades", en: "Properties" },
      /** Menú contextual de un icono. */
      open: { es: "Abrir", en: "Open" },
    },
    /** Ayuda de atajos (opt-in, Propiedades) y Propiedades. */
    shortcuts: {
      title: { es: "Atajos de teclado", en: "Keyboard shortcuts" },
      optIn: { es: "Activar atajos de teclado", en: "Turn on keyboard shortcuts" },
      optInHelp: {
        es: "Desactivados por defecto. Usan Alt+Shift y la posición física de la tecla.",
        en: "Off by default. They use Alt+Shift and the physical key position.",
      },
      /** `{key}` = tecla física, `{layoutKey}` = lo que imprime en la distribución actual. */
      physicalKey: { es: "tecla {key}", en: "{key} key" },
      openStart: { es: "Abrir el menú Inicio", en: "Open the Start menu" },
      focusTaskbar: { es: "Ir a la barra de tareas", en: "Go to the taskbar" },
      focusDesktop: { es: "Ir al escritorio", en: "Go to the desktop" },
      cycleWindows: { es: "Cambiar entre ventanas", en: "Cycle through windows" },
      closeWindow: { es: "Cerrar la ventana activa", en: "Close the active window" },
      help: { es: "Mostrar esta ayuda", en: "Show this help" },
      keyStart: { es: "Alt+Shift+I", en: "Alt+Shift+I" },
      keyTaskbar: { es: "Alt+Shift+T", en: "Alt+Shift+T" },
      keyDesktop: { es: "Alt+Shift+D", en: "Alt+Shift+D" },
      keyCycle: { es: "Alt+Shift+↑ / ↓", en: "Alt+Shift+↑ / ↓" },
      keyClose: { es: "Alt+Shift+W", en: "Alt+Shift+W" },
      keyHelp: { es: "Alt+Shift+H", en: "Alt+Shift+H" },
    },
    settings: {
      title: { es: "Propiedades", en: "Properties" },
      appearance: { es: "Apariencia", en: "Appearance" },
      resetWindows: { es: "Restablecer ventanas", en: "Reset windows" },
      screenEffect: { es: "Efecto de pantalla antigua", en: "Old screen effect" },
      sound: { es: "Sonido del sistema", en: "System sound" },
      assistant: { es: "Mostrar al asistente ED", en: "Show the ED assistant" },
      windowsGroup: { es: "Ventanas", en: "Windows" },
      soundGroup: { es: "Sonido y pantalla", en: "Sound and screen" },
      assistantGroup: { es: "Asistente", en: "Assistant" },
      keyboardGroup: { es: "Teclado", en: "Keyboard" },
      shortcutsList: { es: "Atajos disponibles", en: "Available shortcuts" },
      resetDone: { es: "Ventanas restablecidas", en: "Windows reset" },
      assistantCorner: { es: "Cambiar de esquina", en: "Change corner" },
      corners: { es: "Esquinas del asistente", en: "Assistant corners" },
      cornerTopLeft: { es: "Arriba a la izquierda", en: "Top left" },
      cornerTopRight: { es: "Arriba a la derecha", en: "Top right" },
      cornerBottomLeft: { es: "Abajo a la izquierda", en: "Bottom left" },
      cornerBottomRight: { es: "Abajo a la derecha", en: "Bottom right" },
    },
    /** Anuncios sobrios (un único `role="status"`): solo acciones del usuario. */
    announce: {
      minimized: { es: "Ventana {title} minimizada", en: "Window {title} minimized" },
      maximized: { es: "Ventana {title} maximizada", en: "Window {title} maximized" },
      restored: { es: "Ventana {title} restaurada", en: "Window {title} restored" },
      closed: { es: "Ventana {title} cerrada", en: "Window {title} closed" },
      moveStart: { es: "Moviendo la ventana {title}", en: "Moving window {title}" },
      moveEnd: { es: "Ventana {title} movida", en: "Window {title} moved" },
      moveCancel: { es: "Movimiento cancelado", en: "Move cancelled" },
      windowsReset: { es: "Ventanas restablecidas", en: "Windows reset" },
      desktopShown: { es: "Escritorio visible", en: "Desktop shown" },
      soundOn: { es: "Sonido activado", en: "Sound on" },
      soundOff: { es: "Sonido desactivado", en: "Sound off" },
      effectOn: { es: "Efecto de pantalla antigua activado", en: "Old screen effect on" },
      effectOff: { es: "Efecto de pantalla antigua desactivado", en: "Old screen effect off" },
      shortcutsOn: { es: "Atajos de teclado activados", en: "Keyboard shortcuts on" },
      shortcutsOff: { es: "Atajos de teclado desactivados", en: "Keyboard shortcuts off" },
      started: { es: "EDAV OS listo", en: "EDAV OS ready" },
      /** Foco/selección al llegar por Atrás/Adelante o enlace. */
      projectSelected: { es: "Proyecto {title} abierto", en: "Project {title} opened" },
    },
    /** Boot decorativo (aria-hidden). */
    boot: {
      starting: { es: "Iniciando EDAV OS", en: "Starting EDAV OS" },
      skipHint: { es: "Cualquier clic o tecla omite el inicio", en: "Any click or key skips the startup" },
    },
    /** XP Pocket (≤ 768 px). */
    pocket: {
      back: { es: "Atrás", en: "Back" },
      backTo: { es: "Atrás, a {title}", en: "Back to {title}" },
      backToLauncher: { es: "Atrás, al lanzador", en: "Back to the launcher" },
      close: { es: "Cerrar", en: "Close" },
      launcher: { es: "Lanzador", en: "Launcher" },
      startSheet: { es: "Menú Inicio a pantalla completa", en: "Full-screen Start menu" },
      activeScreen: { es: "Pantalla activa: {title}", en: "Active screen: {title}" },
    },
    /** Galería de proyectos (app `projects`). */
    gallery: {
      title: { es: "Mi trabajo", en: "My Work" },
      filtersLabel: { es: "Filtros", en: "Filters" },
      kindGroup: { es: "Tipo", en: "Type" },
      ownershipGroup: { es: "Autoría", en: "Authorship" },
      all: { es: "Todos", en: "All" },
      /** Recuento visible junto a cada filtro. */
      filterCount: { es: "{label}, {count}", en: "{label}, {count}" },
      results: { es: "{count} proyectos", en: "{count} projects" },
      resultsOne: { es: "{count} proyecto", en: "{count} project" },
      noResults: { es: "Ningún proyecto con estos filtros.", en: "No projects match these filters." },
      clearFilters: { es: "Quitar filtros", en: "Clear filters" },
      list: { es: "Proyectos", en: "Projects" },
      select: { es: "Seleccionar {title}", en: "Select {title}" },
      open: { es: "Abrir", en: "Open" },
      openProject: { es: "Abrir el proyecto {title}", en: "Open project {title}" },
      selectedDetail: { es: "{category}, {year}, {status}", en: "{category}, {year}, {status}" },
      noCover: { es: "Sin portada", en: "No cover" },
      /** Etiquetas de los filtros de tipo (fuente única en project-labels.ts). */
      kinds: projectKindLabels,
      status: { es: "{count} proyectos. {selected}", en: "{count} projects. {selected}" },
      nothingSelected: { es: "Selecciona un proyecto para ver su resumen.", en: "Select a project to see its summary." },
      coverAlt: { es: "Portada del proyecto {title}", en: "{title} project cover" },
      /** Filtros de autoría (los de tipo salen de `projectKinds`). */
      ownership: {
        own: { es: "Propios", en: "Own" },
        "co-created": { es: "Cocreados", en: "Co-created" },
        collaboration: { es: "Colaboración", en: "Collaboration" },
        client: { es: "Cliente", en: "Client" },
      },
    },
    /** Ventana de proyecto y badge de crédito. */
    project: {
      credit: { es: "Créditos", en: "Credits" },
      myRole: { es: "Mi rol", en: "My role" },
      challenge: { es: "El reto", en: "The challenge" },
      solution: { es: "La solución", en: "The solution" },
      services: { es: "Servicios", en: "Services" },
      technologies: { es: "Tecnologías", en: "Technologies" },
      links: { es: "Enlaces del proyecto", en: "Project links" },
      client: { es: "Cliente", en: "Client" },
      location: { es: "Ubicación", en: "Location" },
      year: { es: "Año", en: "Year" },
      status: { es: "Estado", en: "Status" },
      viewPublic: { es: "Ver página pública", en: "View public page" },
      startProject: { es: "Iniciar un proyecto", en: "Start a project" },
      badgeOwn: { es: "Proyecto propio", en: "Own project" },
      badgeCoCreated: { es: "Cocreado con {name}", en: "Co-created with {name}" },
      badgeCollaboration: { es: "Colaboración · {name}", en: "Collaboration · {name}" },
      badgeClient: { es: "Proyecto para cliente", en: "Client project" },
      /** Nombre accesible del enlace a GitHub de un coautor. */
      captures: { es: "Capturas", en: "Screenshots" },
      captureAlt: { es: "Captura del proyecto {title}", en: "Screenshot of the {title} project" },
      creditsList: { es: "Créditos del proyecto", en: "Project credits" },
      githubLink: { es: "{name} en GitHub, se abre en una pestaña nueva", en: "{name} on GitHub, opens in a new tab" },
      externalLink: { es: "{label}, se abre en una pestaña nueva", en: "{label}, opens in a new tab" },
    },
    /** Errores y estados vacíos. */
    errors: {
      projectNotFound: { es: "No se encontró este proyecto.", en: "This project could not be found." },
      loadFailed: { es: "No se pudo cargar el contenido. Inténtalo de nuevo.", en: "The content could not be loaded. Please try again." },
      retry: { es: "Reintentar", en: "Retry" },
      appCrashed: { es: "Esta aplicación tuvo un problema.", en: "This app ran into a problem." },
      closeApp: { es: "Cerrar aplicación", en: "Close app" },
      unsavedTitle: { es: "Hay cambios sin enviar", en: "You have unsent changes" },
      unsavedBody: { es: "Si cierras esta ventana, perderás lo que escribiste.", en: "If you close this window, you will lose what you wrote." },
      unsavedKeep: { es: "Seguir editando", en: "Keep editing" },
      unsavedDiscard: { es: "Cerrar y descartar", en: "Close and discard" },
    },
    /** Acerca de (app `about`). Perfil y experiencia salen de content/profile.ts y experience.ts. */
    aboutApp: {
      available: { es: "Disponible para proyectos", en: "Available for projects" },
      experience: { es: "Experiencia", en: "Experience" },
      education: { es: "Formación", en: "Education" },
      skills: { es: "Habilidades", en: "Skills" },
      cvTitle: { es: "CV y contacto directo", en: "CV and direct contact" },
      cvEs: { es: "CV en español (PDF)", en: "CV in Spanish (PDF)" },
      cvEn: { es: "CV in English (PDF)", en: "CV in English (PDF)" },
      fullProfile: { es: "Abrir perfil completo", en: "Open full profile" },
      /** `{from}` y `{to}` ya formateados; `{to}` puede ser «actualidad». */
      period: { es: "{from} – {to}", en: "{from} – {to}" },
      present: { es: "actualidad", en: "present" },
      since: { es: "Desde {year}", en: "Since {year}" },
      stack: { es: "Tecnologías", en: "Stack" },
    },
    /** Servicios (app `services`). */
    servicesApp: {
      intro: { es: "Elige un servicio para ver qué incluye.", en: "Pick a service to see what it includes." },
      list: { es: "Servicios", en: "Services" },
      includes: { es: "Qué incluye", en: "What's included" },
      stack: { es: "Stack recomendado", en: "Recommended stack" },
      request: { es: "Pedir este servicio", en: "Request this service" },
      requestAria: { es: "Pedir este servicio, {service}: abre Contacto con el servicio elegido", en: "Request this service, {service}: opens Contact with the service selected" },
    },
    /** Contacto (app `contact`). El formulario usa `contactForm` (mismos textos y códigos de error). */
    contactApp: {
      kicker: { es: "NUEVO MENSAJE", en: "NEW MESSAGE" },
      title: { es: "Cuéntame qué quieres construir.", en: "Tell me what you want to build." },
      lead: {
        es: "Objetivo, alcance, público y referencias: con eso podemos comenzar una conversación útil.",
        en: "Goal, scope, audience and references: that's enough to start a useful conversation.",
      },
      draftKept: { es: "Tu borrador se conserva si minimizas esta ventana.", en: "Your draft is kept if you minimize this window." },
      another: { es: "Escribir otro mensaje", en: "Write another message" },
    },
    /** Terminal (app `terminal`): comandos del escritorio actual, adaptados. */
    terminal: {
      banner: { es: "EDAV Símbolo del sistema [Versión 98.04.04]", en: "EDAV Command Prompt [Version 98.04.04]" },
      hint: { es: "Escribe HELP para listar los comandos disponibles.", en: "Type HELP to list the available commands." },
      opening: { es: "Abriendo {app}.exe...", en: "Opening {app}.exe..." },
      requested: { es: "Solicitud enviada: {app}.exe", en: "Request sent: {app}.exe" },
      unknown: { es: "'{input}' no se reconoce como comando. Escribe HELP.", en: "'{input}' is not recognized as a command. Type HELP." },
      unknownApp: { es: "No existe la aplicación '{app}'. Prueba con: {list}.", en: "There is no app '{app}'. Try one of: {list}." },
      inputLabel: { es: "Comando de terminal", en: "Terminal command" },
      history: { es: "Salida de la terminal", en: "Terminal output" },
      whoami: { es: "{name}: {headline}, {location}.", en: "{name}: {headline}, {location}." },
    },
  },
} as const satisfies CopyTree;

export type Ui = typeof ui;
export type UiSection = keyof Ui;

/** Códigos de `/api/contact` (listado único en content/contact-errors.ts). */
export { contactErrorCodes, type ContactErrorCode } from "./contact-errors";

/** Sección de microcopy resuelta para un idioma (para pasarla por props a componentes cliente). */
export function uiFor<S extends UiSection>(locale: Locale, section: S): Resolved<Ui[S]> {
  return resolveLocale(ui[section], locale);
}
