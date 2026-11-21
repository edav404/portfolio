import type { L } from "./types";

export const profile = {
  name: "Emmanuel Dávila",
  fullName: "Emmanuel Dávila Giraldo",
  alias: "edav",
  location: { es: "Medellín, Colombia", en: "Medellín, Colombia" } satisfies L,
  headline: {
    es: "Desarrollador Full Stack y de automatización",
    en: "Full-Stack & Automation Developer",
  } satisfies L,
  tagline: {
    es: "Soy desarrollador web en Medellín. Creo sitios y productos a la medida y automatizo procesos para reducir el trabajo repetitivo.",
    en: "I'm a web developer based in Medellín, Colombia. I build custom websites and digital products and automate repetitive business processes.",
  } satisfies L,
  /** Meta description por defecto (140–160 caracteres). */
  seoDescription: {
    es: "Emmanuel Dávila, desarrollador Full Stack y de automatización en Medellín: sitios a la medida, WordPress, Shopify y automatización de procesos.",
    en: "Emmanuel Dávila, Full-Stack & Automation Developer in Medellín, Colombia: custom websites, WordPress, Shopify and business process automation.",
  } satisfies L,
  /** Versión corta del titular (tarjetas, cabecera). */
  shortHeadline: { es: "Full Stack · Automatización", en: "Full Stack · Automation" } satisfies L,
  /** Encabezado de la página "Sobre mí" (`/sobre-mi/`). */
  about: {
    title: { es: "Desarrollador, automatizador y aprendiz constante.", en: "Developer, automator and lifelong learner." } satisfies L,
    lead: {
      es: "Conecto tecnología, procesos y comunicación para crear soluciones que la gente entienda y quiera usar.",
      en: "I connect technology, processes and communication to build solutions people understand and want to use.",
    } satisfies L,
    bioTitle: { es: "Me interesa tanto el “por qué” como el “cómo”.", en: "I care about the “why” as much as the “how”." } satisfies L,
  },
  /** Párrafos de "Sobre mí". */
  bio: {
    es: [
      "Soy Emmanuel Dávila, técnico profesional en Sistemas y estudiante del sexto y último semestre de Tecnología en Sistemas en el Tecnológico de Antioquia. Vivo en el área metropolitana de Medellín.",
      "Empecé construyendo sitios y tiendas en WordPress, WooCommerce y Shopify para marcas de Colombia, México y Estados Unidos. Con el tiempo pasé al desarrollo a la medida con React, Next.js y TypeScript, y a la automatización de procesos.",
      "Durante mi práctica como Acelerador Digital en Servicios Nutresa participé en la migración y modernización de soluciones internas con Microsoft 365: apps en Power Apps, tableros en Power BI y portales en SharePoint. Esa experiencia reforzó mi enfoque: entender el proceso antes de construir, documentar y dejar a los equipos con autonomía.",
      "Aprendo de forma autodidacta y me gusta proponer mejoras más allá de lo que me asignan: en Servicios Nutresa, una propuesta mía para usar agentes de IA terminó convertida en un encargo del equipo de Automatización. En paralelo construyo productos propios con otros desarrolladores. Fuera del código, la música es parte de mi proceso: por eso este portafolio muestra lo que estoy escuchando.",
    ],
    en: [
      "I'm Emmanuel Dávila. I'm completing the final semester of the Tecnología en Sistemas (Systems Technology) program at Tecnológico de Antioquia, where I also completed the Técnico Profesional en Sistemas program. I live in the Medellín metropolitan area, Colombia.",
      "I started out building WordPress, WooCommerce and Shopify sites and stores for brands in Colombia, Mexico and the United States. Over time I moved into custom development with React, Next.js and TypeScript, and into process automation.",
      "During my Digital Accelerator internship at Servicios Nutresa, I contributed to migrating and modernizing internal solutions with Microsoft 365: Power Apps, Power BI dashboards and SharePoint portals. That experience reinforced my approach: understand the process before building, document the work and leave teams able to work independently.",
      "I'm self-taught at heart and like to propose improvements beyond what I'm assigned: at Servicios Nutresa, my proposal to use AI agents turned into a request from the Automation team. On the side I build my own products with other developers. Outside of code, music is part of my process, which is why this portfolio shows what I'm listening to.",
    ],
  } satisfies L<string[]>,
  /** Qué ofrezco, en una lista corta (hero / CV). */
  focus: {
    es: [
      "Desarrollo web a la medida (Next.js, React, TypeScript)",
      "WordPress, WooCommerce y Shopify",
      "Automatización de procesos (Power Platform, n8n, RPA)",
      "Soluciones en Microsoft 365 (Power Apps, Power BI, SharePoint)",
    ],
    en: [
      "Custom web development (Next.js, React, TypeScript)",
      "WordPress, WooCommerce and Shopify",
      "Process automation (Power Platform, n8n, RPA)",
      "Microsoft 365 solutions (Power Apps, Power BI, SharePoint)",
    ],
  } satisfies L<string[]>,
  availability: {
    es: "Disponible para proyectos freelance y nuevas oportunidades",
    en: "Open to freelance projects and new opportunities",
  } satisfies L,
  contact: {
    whatsapp: "https://wa.me/573053959008",
    whatsappDisplay: "+57 305 395 9008",
    linkedin: "https://www.linkedin.com/in/edav404",
    github: "https://github.com/edav404",
    lastfm: "edav404",
    email: "contacto@edav.com.co",
  },
  // Las cifras ("12 proyectos para clientes"…) se derivan en `content/stats.ts` (decisión 10).
} as const;

export const skills = {
  web: ["TypeScript", "JavaScript", "React", "Next.js", "Node.js", "HTML", "CSS", "REST APIs"],
  cms: ["WordPress", "WooCommerce", "Elementor", "Shopify", "Liquid"],
  automation: ["Power Apps", "Power Automate", "Power BI", "SharePoint", "n8n", "UiPath", "BotCity", "Groq"],
  data: ["PostgreSQL", "Supabase", "SQLite"],
  tools: ["Git", "GitHub", "Docker", "Coolify", "Figma", "Claude Code", "Codex"],
} as const;

/** Temas para `knowsAbout` del JSON-LD `Person`. */
export const knowsAbout = {
  es: ["Desarrollo web Full Stack", "Automatización de procesos", "Power Platform", "Microsoft 365", "WordPress", "WooCommerce", "Shopify", "React", "Next.js"],
  en: ["Full-stack web development", "Business process automation", "Power Platform", "Microsoft 365", "WordPress", "WooCommerce", "Shopify", "React", "Next.js"],
} satisfies L<string[]>;

/**
 * Selección de tecnologías que se muestra en portada, "Sobre mí", el escritorio y la terminal
 * (una sola lista para que /os y /classic no diverjan, COD-06).
 */
export const technologies: readonly string[] = [
  ...skills.web,
  ...skills.cms,
  ...skills.automation.slice(0, 4),
  ...skills.data.slice(0, 2),
  "Git",
  "Figma",
];

export const skillGroups: { id: keyof typeof skills; label: L }[] = [
  { id: "web", label: { es: "Desarrollo web", en: "Web development" } },
  { id: "cms", label: { es: "CMS y e-commerce", en: "CMS & e-commerce" } },
  { id: "automation", label: { es: "Automatización y Microsoft 365", en: "Automation & Microsoft 365" } },
  { id: "data", label: { es: "Datos", en: "Data" } },
  { id: "tools", label: { es: "Herramientas", en: "Tools" } },
];
