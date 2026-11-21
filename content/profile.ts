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
  /** Párrafos de "Sobre mí". */
  bio: {
    es: [
      "Soy Emmanuel Dávila, técnico profesional en Sistemas y estudiante del sexto y último semestre de Tecnología en Sistemas en el Tecnológico de Antioquia. Vivo en el área metropolitana de Medellín.",
      "Empecé construyendo sitios y tiendas en WordPress, WooCommerce y Shopify para marcas de Colombia, México y Estados Unidos. Con el tiempo pasé al desarrollo a la medida con React, Next.js y TypeScript, y a la automatización de procesos.",
      "Durante mi práctica como Acelerador Digital en Servicios Nutresa participé en la migración y modernización de soluciones internas con Microsoft 365: apps en Power Apps, tableros en Power BI y portales en SharePoint. Esa experiencia reforzó mi enfoque: entender el proceso antes de construir, documentar y dejar a los equipos con autonomía.",
      "En paralelo construyo productos propios con otros desarrolladores y uso agentes de IA en mi flujo de trabajo. Fuera del código, la música es parte de mi proceso: por eso este portafolio muestra lo que estoy escuchando.",
    ],
    en: [
      "I'm Emmanuel Dávila. I'm completing the final semester of the Tecnología en Sistemas (Systems Technology) program at Tecnológico de Antioquia, where I also completed the Técnico Profesional en Sistemas program. I live in the Medellín metropolitan area, Colombia.",
      "I started out building WordPress, WooCommerce and Shopify sites and stores for brands in Colombia, Mexico and the United States. Over time I moved into custom development with React, Next.js and TypeScript, and into process automation.",
      "During my Digital Accelerator internship at Servicios Nutresa, I contributed to migrating and modernizing internal solutions with Microsoft 365: Power Apps, Power BI dashboards and SharePoint portals. That experience reinforced my approach: understand the process before building, document the work and leave teams able to work independently.",
      "On the side I build my own products with other developers and use AI agents in my day-to-day workflow. Outside of code, music is part of my process, which is why this portfolio shows what I'm listening to.",
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
    /** Correo público para el CV. Pendiente de confirmar cuál usar. */
    email: "",
  },
  stats: [
    { value: "12", label: { es: "Proyectos web para clientes", en: "Client web projects" } satisfies L },
    { value: "3", label: { es: "Países: Colombia, México y EE. UU.", en: "Countries: Colombia, Mexico & USA" } satisfies L },
    { value: "3", label: { es: "Productos en equipo", en: "Team products" } satisfies L },
  ],
} as const;

export const skills = {
  web: ["TypeScript", "JavaScript", "React", "Next.js", "Node.js", "HTML", "CSS", "REST APIs"],
  cms: ["WordPress", "WooCommerce", "Elementor", "Shopify", "Liquid"],
  automation: ["Power Apps", "Power BI", "SharePoint", "Microsoft 365", "n8n", "UiPath", "BotCity", "Telegram Bot API"],
  data: ["PostgreSQL", "Supabase", "SQLite"],
  tools: ["Git", "GitHub", "Docker", "Coolify", "Figma", "Claude Code", "Codex"],
} as const;

export const skillGroups: { id: keyof typeof skills; label: L }[] = [
  { id: "web", label: { es: "Desarrollo web", en: "Web development" } },
  { id: "cms", label: { es: "CMS y e-commerce", en: "CMS & e-commerce" } },
  { id: "automation", label: { es: "Automatización y Microsoft 365", en: "Automation & Microsoft 365" } },
  { id: "data", label: { es: "Datos", en: "Data" } },
  { id: "tools", label: { es: "Herramientas", en: "Tools" } },
];
