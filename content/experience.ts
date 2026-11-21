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
  /** Índices de `highlights` que van al CV (por defecto, los 3 primeros). */
  cvHighlights?: number[];
};

export const experience: ExperienceEntry[] = [
  {
    id: "servicios-nutresa",
    organization: "Servicios Nutresa",
    role: { es: "Acelerador Digital (práctica profesional)", en: "Digital Accelerator Intern" },
    location: { es: "Medellín, Colombia", en: "Medellín, Colombia" },
    // Práctica de 6 meses: 1 jul. – 31 dic. 2026.
    start: "2026-07",
    end: "2026-12",
    summary: {
      es: "Práctica de seis meses en el programa One Leap to Microsoft 365, que migra las soluciones de Servicios Nutresa de Google Workspace a Microsoft 365. Con base en el área de Impuestos, trabajé con TI (automatizaciones), Analítica y Datos y dueños de proceso de otras gerencias.",
      en: "Six-month internship in the One Leap to Microsoft 365 program, which moves Servicios Nutresa's solutions from Google Workspace to Microsoft 365. Based in the Tax department, I worked with IT (automation), Analytics & Data and process owners across other departments.",
    },
    // Redactado como un CV: logros y alcance, sin nombres de personas, IDs internos ni datos
    // del negocio. La versión con todo el detalle vive solo en local (private/, ignorado por git).
    highlights: {
      es: [
        "Levanté y documenté 8 requisitos funcionales y 3 no funcionales para migrar una solución tributaria de más de 3.000 registros, con ingeniería inversa donde no había documentación.",
        "Construí un tablero en Power BI que reemplazó un reporte de Looker Studio, para anticipar vencimientos y hacer seguimiento a responsables, pagos y revisiones.",
        "Rediseñé la experiencia de un portal interno usado por 30 a 60 personas de varias gerencias, aplicando la Ley de Hick (menos opciones por pantalla, menos clics). El rediseño fue aprobado para producción.",
        "Reconstruí en Power Apps (Canvas) y SharePoint una app de presupuestación hecha en AppSheet y Google Sheets, con cálculo automático de AIU e IVA y exportación a Excel, sin licencias Premium.",
        "Apoyé a otras áreas con apps Canvas que reemplazan soluciones heredadas en Apps Script y AppSheet.",
        "Habilité un entorno de desarrollo con roles y separación de ambientes, y guié sesiones semanales de construcción para que los usuarios ganaran autonomía.",
        "Consolidé 10 iniciativas activas en un portafolio central en SharePoint, con vistas de tablero y calendario.",
        "Por iniciativa propia, propuse evaluar agentes de IA (Claude Code, GitHub Copilot, Kiro) con MCP para acelerar las migraciones. La propuesta derivó en un encargo del equipo de Automatización: diseñar un agente de Claude para el desarrollo de bots en BotCity.",
        "Mi aprendizaje autodidacta y mi iniciativa fueron reconocidos por el liderazgo de TI en automatizaciones.",
      ],
      en: [
        "Gathered and documented 8 functional and 3 non-functional requirements to migrate a tax solution with 3,000+ records, reverse-engineering it where no documentation existed.",
        "Built a Power BI dashboard that replaced a Looker Studio report, helping teams anticipate deadlines and track owners, payments and reviews.",
        "Redesigned the UX of an internal portal used by 30–60 people across departments, applying Hick's law (fewer options per screen, fewer clicks). The redesign was approved for production.",
        "Rebuilt an AppSheet and Google Sheets budgeting app in Power Apps (Canvas) and SharePoint, with automatic AIU and VAT calculation and Excel export, without Premium licenses.",
        "Supported other departments with Canvas apps replacing legacy Apps Script and AppSheet solutions.",
        "Set up a role-based development environment with separate stages, and led weekly guided build sessions to help users work more independently.",
        "Consolidated 10 active initiatives into a central SharePoint portfolio with board and calendar views.",
        "On my own initiative, proposed evaluating AI agents (Claude Code, GitHub Copilot, Kiro) with MCP to speed up migrations. It led to a request from the Automation team to design a Claude agent for BotCity bot development.",
        "IT automation leadership recognized my initiative and ability to learn independently.",
      ],
    },
    stack: ["Power Apps", "Power Automate", "Power BI", "SharePoint", "Microsoft 365", "UiPath", "BotCity", "Claude", "Gemini"],
    inCv: true,
    // Requisitos, Power BI, portal, Power Apps, propuesta de IA y reconocimiento autodidacta.
    cvHighlights: [0, 1, 2, 3, 7, 8],
  },
  {
    id: "freelance",
    organization: "EDAV · Freelance",
    role: { es: "Desarrollador web y diseñador", en: "Web developer & designer" },
    location: { es: "Remoto · Colombia, México y EE. UU.", en: "Remote · Colombia, Mexico & USA" },
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
