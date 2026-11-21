import type { L, YearMonth } from "./types";

export type ExperienceEntry = {
  id: string;
  organization: string;
  role: L;
  location: L;
  start: YearMonth;
  /** `null` = actualidad. */
  end: YearMonth | null;
  summary: L;
  highlights: L<string[]>;
  stack: string[];
  /** Si se muestra en el CV en PDF (la web siempre la muestra). */
  inCv: boolean;
};

export const experience: ExperienceEntry[] = [
  {
    id: "servicios-nutresa",
    organization: "Servicios Nutresa",
    role: { es: "Acelerador Digital (práctica profesional)", en: "Digital Accelerator Intern" },
    location: { es: "Medellín, Colombia", en: "Medellín, Colombia" },
    // Pendiente confirmar mes de inicio y de fin.
    start: "2026",
    end: "2026",
    summary: {
      es: "Participé en el programa One Leap to Microsoft 365 del centro de servicios compartidos de Grupo Nutresa, apoyando la transición de soluciones de Google Workspace a Microsoft 365 junto a TI, equipos de datos y dueños de proceso.",
      en: "Took part in the One Leap to Microsoft 365 program at Grupo Nutresa's shared services center, supporting the move of internal solutions from Google Workspace to Microsoft 365 alongside IT, data teams and process owners.",
    },
    // Versión pública prudente: sin cifras internas ni nombres. La versión detallada
    // vive solo en local, en private/nutresa-detallado.md (ignorado por git).
    highlights: {
      es: [
        "Levanté y documenté requisitos para migrar soluciones internas, incluso con ingeniería inversa cuando no había documentación.",
        "Construí tableros en Power BI para anticipar vencimientos y hacer seguimiento a obligaciones.",
        "Rediseñé la experiencia de un portal interno con menos opciones por pantalla y menos clics; el rediseño fue aprobado para producción.",
        "Reconstruí una app de presupuestos de AppSheet y Google Sheets en Power Apps (Canvas) y SharePoint, con cálculos automáticos y exportación a Excel.",
        "Habilité un entorno de desarrollo con roles y acompañé sesiones semanales de construcción guiada para que los usuarios ganaran autonomía.",
        "Propuse incorporar agentes de IA y MCP al flujo de desarrollo y migración de soluciones.",
      ],
      en: [
        "Gathered and documented requirements to migrate internal solutions, reverse-engineering them when no documentation existed.",
        "Built Power BI dashboards to anticipate deadlines and track obligations.",
        "Redesigned an internal portal's UX with fewer options per screen and fewer clicks; the redesign was approved for production.",
        "Rebuilt a budgeting app from AppSheet and Google Sheets into Power Apps (Canvas) and SharePoint, with automatic calculations and Excel export.",
        "Set up a role-based development environment and led weekly guided build sessions so users could work more independently.",
        "Proposed bringing AI agents and MCP into the solution development and migration workflow.",
      ],
    },
    stack: ["Power Apps", "Power BI", "SharePoint", "Microsoft 365", "UiPath", "BotCity", "Claude"],
    inCv: true,
  },
  {
    id: "freelance",
    organization: "EDAV · Freelance",
    role: { es: "Desarrollador web y diseñador", en: "Web developer & designer" },
    location: { es: "Remoto · Colombia, México y EE. UU.", en: "Remote · Colombia, Mexico & USA" },
    // Pendiente confirmar año de inicio.
    start: "2023",
    end: null,
    summary: {
      es: "Diseño y desarrollo de sitios corporativos, tiendas en línea y rediseños para marcas de Colombia, México y Estados Unidos.",
      en: "Design and development of corporate websites, online stores and redesigns for brands in Colombia, Mexico and the United States.",
    },
    highlights: {
      es: [
        "Diseño y desarrollo de sitios y tiendas en WordPress, WooCommerce, Elementor y Shopify, desde la definición inicial hasta la publicación.",
        "Secciones Liquid editables para Shopify, para que el equipo del cliente conserve autonomía sin romper el tema.",
        "Trabajo en SEO técnico, rendimiento y diseño adaptable en los proyectos web.",
      ],
      en: [
        "Designed and built WordPress, WooCommerce, Elementor and Shopify sites and stores, from initial requirements to launch.",
        "Editable Shopify Liquid sections so client teams keep control without breaking the theme.",
        "Worked on technical SEO, performance and responsive design across web projects.",
      ],
    },
    stack: ["WordPress", "WooCommerce", "Elementor", "Shopify", "Liquid", "Next.js", "Figma"],
    inCv: true,
  },
  {
    id: "nora-data",
    organization: "Nora Data (Green Holds)",
    role: { es: "Gestión web, logística y servicio al cliente", en: "Website management, logistics & customer service" },
    location: { es: "Medellín, Colombia", en: "Medellín, Colombia" },
    start: "2022-08",
    end: "2023-11",
    summary: {
      es: "Administración del sitio WordPress de la marca, mejoras de SEO y contenido, servicio al cliente en canales digitales y logística de envíos nacionales.",
      en: "Managed the brand's WordPress site, SEO and content improvements, customer service on digital channels and domestic shipping logistics.",
    },
    highlights: {
      es: [
        "Implementé mejoras de SEO y contenido en el sitio WordPress.",
        "Coordiné envíos nacionales y el seguimiento de entregas.",
        "Apoyé campañas de email marketing orientadas a captar clientes y ventas.",
      ],
      en: [
        "Implemented SEO and content improvements on the WordPress site.",
        "Coordinated domestic shipments and delivery tracking.",
        "Supported email marketing campaigns aimed at customer acquisition and sales.",
      ],
    },
    stack: ["WordPress", "WooCommerce", "SEO", "Email marketing"],
    inCv: true,
  },
  {
    id: "davila-trujillo",
    organization: "Dávila & Trujillo Abogados",
    role: { es: "Asistente virtual", en: "Virtual assistant" },
    location: { es: "Itagüí, Colombia", en: "Itagüí, Colombia" },
    start: "2020-01",
    end: "2024-12",
    summary: {
      es: "Gestión de agenda, apoyo en la preparación de documentos legales y comunicación con clientes.",
      en: "Calendar management, support preparing legal documents and client communication.",
    },
    highlights: {
      es: [
        "Organicé la agenda de los abogados y optimicé la coordinación de reuniones.",
        "Apoyé la preparación de documentos legales y mantuve la comunicación con los clientes.",
      ],
      en: [
        "Managed the lawyers' calendars and streamlined meeting coordination.",
        "Supported legal document preparation and maintained communication with clients.",
      ],
    },
    stack: ["Google Workspace"],
    inCv: true,
  },
];

export type EducationEntry = {
  id: string;
  institution: string;
  title: L;
  status: "completed" | "in-progress";
  /** Año de finalización o, si está en curso, texto de avance. */
  detail: L;
  year?: string;
};

export const education: EducationEntry[] = [
  {
    id: "tdea-tecnologia",
    institution: "Tecnológico de Antioquia",
    title: { es: "Tecnología en Sistemas", en: "Tecnología en Sistemas (Systems Technology program)" },
    status: "in-progress",
    detail: { es: "6.º semestre (último)", en: "Final (6th) semester" },
    year: "2026",
  },
  {
    id: "tdea-tecnico",
    institution: "Tecnológico de Antioquia",
    title: { es: "Técnico Profesional en Sistemas", en: "Técnico Profesional en Sistemas (Systems Technician program)" },
    status: "completed",
    // Pendiente confirmar año de grado.
    detail: { es: "Graduado", en: "Completed" },
  },
  {
    id: "talento-tech",
    institution: "Talento Tech (MinTIC)",
    title: { es: "Curso de Ciberseguridad", en: "Cybersecurity course" },
    status: "completed",
    detail: { es: "2024", en: "2024" },
    year: "2024",
  },
];
