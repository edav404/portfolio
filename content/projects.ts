import { projectKindLabels, projectOwnershipLabels, projectStatusLabels } from "./project-labels";
import type { PersonId } from "./people";
import type { L, Locale } from "./types";

/** Filtro principal de la galería. */
export type ProjectKind = "client" | "personal" | "automation";

/**
 * Relación de Emmanuel con el proyecto (define el badge de créditos):
 * - own: proyecto propio.
 * - co-created: cocreado; el crédito se comparte por igual.
 * - collaboration: proyecto de otra persona en el que Emmanuel colabora.
 * - client: encargo para un cliente (autoría del trabajo, no propiedad del producto).
 */
export type Ownership = "own" | "co-created" | "collaboration" | "client";

export type ProjectStatus = "delivered" | "live" | "in-development" | "academic";

export type Credit = {
  person: PersonId;
  role: L;
  /** Dueño/autor principal del proyecto. */
  owner?: boolean;
  /** Menor protagonismo visual en el badge. */
  minor?: boolean;
};

export type Project = {
  slug: string;
  /** Nombre propio (string) o título descriptivo traducible (L). */
  title: string | L;
  kind: ProjectKind;
  ownership: Ownership;
  status: ProjectStatus;
  year: string;
  client: L;
  location: L;
  category: L;
  /** Portada en /public. Los proyectos privados aún no tienen captura pública. */
  image?: string;
  alt?: L;
  summary: L;
  challenge: L;
  solution: L;
  /** Qué hizo Emmanuel, en una línea (clave en colaboraciones). */
  myRole?: L;
  services: L<string[]>;
  technologies: string[];
  credits?: Credit[];
  /** Repositorio o demo públicos (ninguno de los personales es público aún). */
  links?: { label: L; href: string }[];
  featured?: boolean;
};

const category = {
  web: { es: "Desarrollo web", en: "Web development" },
  ecommerce: { es: "E-commerce", en: "E-commerce" },
  redesign: { es: "Rediseño web", en: "Website redesign" },
  identity: { es: "Identidad visual", en: "Visual identity" },
  product: { es: "Producto digital", en: "Digital product" },
  mobile: { es: "App móvil", en: "Mobile app" },
  saas: { es: "SaaS", en: "SaaS" },
  automation: { es: "Automatización", en: "Automation" },
} satisfies Record<string, L>;

const colombia: L = { es: "Colombia", en: "Colombia" };
const medellin: L = { es: "Medellín, Colombia", en: "Medellín, Colombia" };

export const projects: Project[] = [
  // ───────────────────────── Personales ─────────────────────────
  {
    slug: "vaulto",
    title: "Vaulto",
    kind: "personal",
    ownership: "co-created",
    status: "in-development",
    year: "2026",
    client: { es: "Proyecto propio", en: "Own product" },
    location: { es: "Colombia / LATAM", en: "Colombia / LATAM" },
    category: category.mobile,
    summary: {
      es: "App de finanzas personales offline-first para Colombia y LATAM: cuentas, movimientos, deudas y pagos en una sola vista que responde «¿con lo que tengo y lo que falta, llego o no llego?».",
      en: "Offline-first personal finance app for Colombia and LATAM: accounts, transactions, debts and payments in one view that answers “with what I have and what's pending, will I make it?”.",
    },
    challenge: {
      es: "La información financiera vive dispersa entre notas, Excel y apps bancarias, y la app debe funcionar sin señal sin perder ni duplicar datos al sincronizar.",
      en: "Financial information is scattered across notes, spreadsheets and banking apps, and the app has to work offline without losing or duplicating data when it syncs.",
    },
    solution: {
      es: "Arquitectura offline-first con almacenamiento local cifrado (SQLite + SQLCipher), sincronización con PowerSync sobre Supabase, políticas RLS obligatorias y deudas bidireccionales (yo debo / me deben).",
      en: "Offline-first architecture with encrypted local storage (SQLite + SQLCipher), PowerSync synchronization over Supabase, mandatory RLS policies and two-way debts (I owe / owed to me).",
    },
    myRole: { es: "Cofundador y desarrollador", en: "Co-founder and developer" },
    services: { es: ["Producto", "Arquitectura offline-first", "Desarrollo móvil"], en: ["Product", "Offline-first architecture", "Mobile development"] },
    technologies: ["Expo", "React Native", "TypeScript", "SQLite", "SQLCipher", "PowerSync", "Supabase", "PostgreSQL"],
    credits: [
      { person: "edav", role: { es: "Cofundador", en: "Co-founder" }, owner: true },
      { person: "lmilo", role: { es: "Cofundador", en: "Co-founder" }, owner: true },
    ],
    featured: true,
  },
  {
    slug: "encorely",
    title: "Encorely",
    kind: "personal",
    ownership: "co-created",
    status: "in-development",
    year: "2026",
    client: { es: "Proyecto propio", en: "Own product" },
    location: colombia,
    category: category.mobile,
    summary: {
      es: "App para encontrar con quién ir al próximo concierto: calificas canciones, marcas a qué concierto vas y ves quién más va con gustos parecidos.",
      en: "An app to find someone to go to the next concert with: rate songs, mark which concert you're attending and see who else is going with similar music taste.",
    },
    challenge: {
      es: "Conectar a personas por afinidad musical real, cuidando la privacidad y la seguridad de las conversaciones.",
      en: "Connect people through real musical affinity while protecting privacy and the security of their conversations.",
    },
    solution: {
      es: "ADN musical a partir de calificaciones, radar de «quién más va», match mutuo solo con un concierto en común y chat cifrado de extremo a extremo.",
      en: "A musical DNA built from ratings, a “who else is going” radar, mutual matches only when sharing a concert, and end-to-end encrypted chat.",
    },
    myRole: { es: "Cocreador y desarrollador", en: "Co-creator and developer" },
    services: { es: ["Producto", "Desarrollo móvil", "Backend"], en: ["Product", "Mobile development", "Backend"] },
    technologies: ["Expo", "React Native", "TypeScript", ".NET", "PostgreSQL", "Kafka", "SignalR", "Docker"],
    credits: [
      { person: "lmilo", role: { es: "Cocreador", en: "Co-creator" }, owner: true },
      { person: "edav", role: { es: "Cocreador", en: "Co-creator" }, owner: true },
      { person: "jdicans", role: { es: "Cocreador", en: "Co-creator" }, owner: true, minor: true },
    ],
    featured: true,
  },
  {
    slug: "motila",
    title: "Motila",
    kind: "personal",
    ownership: "collaboration",
    status: "in-development",
    year: "2026",
    client: { es: "Proyecto de lmilo", en: "Project by lmilo" },
    location: colombia,
    category: category.saas,
    summary: {
      es: "Motila es un SaaS de lmilo para agendar y administrar barberías: reservas, agenda, equipo, fidelización, servicios realizados y liquidaciones. Colaboro en funcionalidades y en su presencia en Facebook y TikTok.",
      en: "Motila is barbershop scheduling and management software created by lmilo: bookings, calendar, team, loyalty, service tracking and payouts. I contribute features and help with its Facebook and TikTok presence.",
    },
    challenge: {
      es: "Conectar la reserva del cliente con la operación diaria de la barbería en un solo flujo, para varias sedes y roles.",
      en: "Connect the customer's booking with the barbershop's daily operations in a single flow, across locations and roles.",
    },
    solution: {
      es: "Paneles para dueño, barbero y plataforma, más reserva pública sin cuenta. Colaboro desarrollando funcionalidades y apoyando la presencia en Facebook y TikTok.",
      en: "Dashboards for owner, barber and platform, plus account-free public booking. I contribute features and support its Facebook and TikTok presence.",
    },
    myRole: { es: "Colaborador: funcionalidades y redes sociales", en: "Contributor: features and social media" },
    services: { es: ["Desarrollo de funcionalidades", "Redes sociales"], en: ["Feature development", "Social media"] },
    technologies: ["FastAPI", "PostgreSQL", "Nuxt", "Tailwind CSS", "Docker"],
    credits: [
      { person: "lmilo", role: { es: "Creador", en: "Creator" }, owner: true },
      { person: "edav", role: { es: "Colaborador", en: "Contributor" } },
    ],
  },

  // ─────────────────────── Automatizaciones ───────────────────────
  {
    slug: "bot-recordatorios-ia",
    title: { es: "Bot de recordatorios con IA", en: "AI Reminder Bot" },
    kind: "automation",
    ownership: "own",
    status: "live",
    year: "2026",
    client: { es: "Uso personal", en: "Personal use" },
    location: colombia,
    category: category.automation,
    summary: {
      es: "Bot de Telegram al que le envío audios o textos; la IA los transcribe y resume, los guarda como recordatorios y me avisa cada día o cuando se lo pido.",
      en: "A Telegram bot I send voice notes or text to; AI transcribes and summarizes them, stores them as reminders and notifies me daily or on request.",
    },
    challenge: {
      es: "Capturar pendientes en segundos, incluso por voz, sin depender de abrir una app de tareas.",
      en: "Capture to-dos in seconds, even by voice, without opening a task app.",
    },
    solution: {
      es: "Flujo en n8n que recibe el mensaje, transcribe y sintetiza con IA mediante Groq (en su nivel gratuito), guarda los recordatorios en PostgreSQL y programa avisos diarios y consultas a demanda.",
      en: "An n8n workflow that receives the message, transcribes and summarizes it with AI through Groq (on its free tier), stores reminders in PostgreSQL and schedules daily and on-demand notifications.",
    },
    myRole: { es: "Diseño y desarrollo completos", en: "End-to-end design and build" },
    services: { es: ["Automatización", "Integración de IA", "Bot conversacional"], en: ["Automation", "AI integration", "Chatbot"] },
    technologies: ["n8n", "Telegram Bot API", "Groq", "PostgreSQL"],
    credits: [{ person: "edav", role: { es: "Autor", en: "Author" }, owner: true }],
  },

  // ───────────────────────── Clientes ─────────────────────────
  {
    slug: "green-holds-shopify",
    title: "Green Holds Shopify",
    kind: "client", ownership: "client", status: "delivered",
    year: "2026",
    client: { es: "Green Holds", en: "Green Holds" },
    location: colombia,
    category: category.redesign,
    image: "/images/projects/green-holds-shopify.png",
    alt: { es: "Rediseño de la tienda Shopify de Green Holds", en: "Green Holds Shopify store redesign" },
    summary: {
      es: "Rediseño de la página de inicio bajo el concepto de «sofisticación orgánica», con una estética botánica, clínica y premium.",
      en: "Homepage redesign under an “Organic Sophistication” concept, with a botanical, clinical and premium look.",
    },
    challenge: {
      es: "Diferenciar una marca de cáñamo premium y darle al equipo autonomía editorial sin comprometer el tema existente.",
      en: "Differentiate a premium hemp brand and give the team editorial autonomy without compromising the existing theme.",
    },
    solution: {
      es: "Construí una suite de secciones Liquid aisladas con BEM y esquemas editables desde el personalizador de Shopify.",
      en: "Built a suite of isolated Liquid sections with BEM and schemas editable from the Shopify customizer.",
    },
    services: { es: ["Dirección visual", "Desarrollo Shopify", "Diseño responsive"], en: ["Visual direction", "Shopify development", "Responsive design"] },
    technologies: ["Shopify", "Liquid", "JavaScript", "CSS BEM"],
    featured: true,
  },
  {
    slug: "biogenesis-peptides",
    title: "BioGenesis Peptides",
    kind: "client", ownership: "client", status: "delivered",
    year: "2026",
    client: { es: "BioGenesis Peptides", en: "BioGenesis Peptides" },
    location: { es: "Estados Unidos", en: "United States" },
    category: category.redesign,
    image: "/images/projects/biogenesis-peptides.png",
    alt: { es: "Página web científica de BioGenesis Peptides", en: "BioGenesis Peptides scientific website" },
    summary: {
      es: "Plataforma digital de alta gama para un laboratorio de péptidos de investigación, inspirada en publicaciones científicas.",
      en: "High-end digital platform for a research peptide lab, inspired by scientific publications.",
    },
    challenge: {
      es: "Alejar la marca de la apariencia de una tienda de suplementos y transmitir rigor, precisión y confianza.",
      en: "Move the brand away from a supplement-store look and convey rigor, precision and trust.",
    },
    solution: {
      es: "Diseñé una experiencia editorial inspirada en publicaciones científicas, con transparencia técnica y navegación orientada a investigadores.",
      en: "Designed an editorial experience inspired by scientific publications, with technical transparency and researcher-oriented navigation.",
    },
    services: { es: ["Investigación", "Rediseño UX/UI", "Desarrollo web"], en: ["Research", "UX/UI redesign", "Web development"] },
    technologies: ["WordPress", "WooCommerce", "Elementor", "CSS"],
    featured: true,
  },
  {
    slug: "civicoin",
    title: "CiviCoin",
    kind: "personal", ownership: "own", status: "academic",
    year: "2025",
    client: { es: "Proyecto académico sobre movilidad en el Metro de Medellín", en: "Academic project exploring mobility on the Medellín Metro" },
    location: medellin,
    category: category.identity,
    image: "/images/projects/civicoin.jpg",
    alt: { es: "Manual de identidad visual de CiviCoin", en: "CiviCoin visual identity manual" },
    summary: {
      es: "Identidad para una propuesta que conecta tecnología blockchain y movilidad sostenible en el Metro de Medellín.",
      en: "Identity for a proposal connecting blockchain technology and sustainable mobility on the Medellín Metro.",
    },
    challenge: {
      es: "Explicar una idea tecnológica compleja con una marca cercana, ecológica y confiable.",
      en: "Explain a complex technology idea through an approachable, eco-friendly and trustworthy brand.",
    },
    solution: {
      es: "Desarrollé propósito, naming, logotipo, paleta, tipografía y un manual de marca integral con tono educativo.",
      en: "Developed purpose, naming, logo, palette, typography and a complete brand manual with an educational tone.",
    },
    services: { es: ["Estrategia de marca", "Identidad visual", "Manual de marca"], en: ["Brand strategy", "Visual identity", "Brand manual"] },
    technologies: ["Figma", "Illustrator", "Diseño editorial"],
  },
  {
    slug: "green-holds-mexico",
    title: "Green Holds México",
    kind: "client", ownership: "client", status: "delivered",
    year: "2025",
    client: { es: "Green Holds", en: "Green Holds" },
    location: { es: "México", en: "Mexico" },
    category: category.redesign,
    image: "/images/projects/green-holds-mexico.png",
    alt: { es: "Rediseño web de Green Holds México", en: "Green Holds Mexico website redesign" },
    summary: {
      es: "Rediseño de una tienda en línea de productos derivados del cáñamo, orientado a facilitar la compra y comunicar confianza.",
      en: "Redesigned an online store for hemp-derived products to simplify shopping and communicate trust.",
    },
    challenge: {
      es: "Modernizar una experiencia de compra que no comunicaba la solidez de la marca ni facilitaba descubrir productos.",
      en: "Modernize a shopping experience that didn't convey the brand's strength or make products easy to discover.",
    },
    solution: {
      es: "Reorganicé estructura, contenido y navegación, reforzando señales de confianza y consistencia visual en todo el recorrido.",
      en: "Reorganized structure, content and navigation, reinforcing trust signals and visual consistency across the journey.",
    },
    services: { es: ["Auditoría UX", "Rediseño e-commerce", "Optimización responsive"], en: ["UX audit", "E-commerce redesign", "Responsive optimization"] },
    technologies: ["WordPress", "WooCommerce", "Elementor", "CSS"],
    featured: true,
  },
  {
    slug: "cia-sur",
    title: "CIA SUR",
    kind: "client", ownership: "client", status: "delivered",
    year: "2025",
    client: { es: "Centro Integral de Aprendizaje del Sur", en: "Centro Integral de Aprendizaje del Sur" },
    location: { es: "Itagüí, Colombia", en: "Itagüí, Colombia" },
    category: category.web,
    image: "/images/projects/cia-sur.png",
    alt: { es: "Sitio web institucional de CIA SUR", en: "CIA SUR institutional website" },
    summary: {
      es: "Presencia digital institucional con canales de comunicación y una experiencia clara para estudiantes y familias.",
      en: "Institutional web presence with communication channels and a clear experience for students and families.",
    },
    challenge: {
      es: "Crear desde cero una presencia digital coherente y fácil de administrar para una institución educativa.",
      en: "Build a coherent, easy-to-manage digital presence from scratch for an educational institution.",
    },
    solution: {
      es: "Configuré WordPress, correo institucional y un sitio responsive sobre Astra alineado con su identidad visual.",
      en: "Set up WordPress, institutional email and a responsive Astra-based site aligned with their visual identity.",
    },
    services: { es: ["Arquitectura", "Diseño web", "Configuración WordPress"], en: ["Architecture", "Web design", "WordPress setup"] },
    technologies: ["WordPress", "Astra", "Elementor", "SEO"],
  },
  {
    slug: "zona-work",
    title: "Zona Work",
    kind: "client", ownership: "client", status: "delivered",
    year: "2025",
    client: { es: "Zona Work", en: "Zona Work" },
    location: medellin,
    category: category.redesign,
    image: "/images/projects/zona-work.png",
    alt: { es: "Rediseño responsive del sitio de Zona Work", en: "Zona Work responsive website redesign" },
    summary: {
      es: "Rediseño de un coworking para reflejar mejor sus espacios, servicios y propuesta para profesionales y empresas.",
      en: "Coworking website redesign to better reflect its spaces, services and offer for professionals and companies.",
    },
    challenge: {
      es: "Actualizar el sitio para representar mejor los espacios del coworking y facilitar las consultas.",
      en: "Update the website to better showcase the coworking spaces and make inquiries easier.",
    },
    solution: {
      es: "Redefiní la jerarquía, el lenguaje visual y los llamados a la acción alrededor de espacios, planes y reservas.",
      en: "Redefined hierarchy, visual language and calls to action around spaces, plans and bookings.",
    },
    services: { es: ["Investigación", "Rediseño UX/UI", "Desarrollo WordPress"], en: ["Research", "UX/UI redesign", "WordPress development"] },
    technologies: ["WordPress", "Elementor", "CSS", "SEO"],
  },
  {
    slug: "anomaly-studio",
    title: "Anomaly Studio",
    kind: "client", ownership: "client", status: "delivered",
    year: "2025",
    client: { es: "Anomaly Studio", en: "Anomaly Studio" },
    location: medellin,
    category: category.web,
    image: "/images/projects/anomaly-studio.png",
    alt: { es: "Sitio web de la agencia Anomaly Studio", en: "Anomaly Studio agency website" },
    summary: {
      es: "Sitio oficial para una agencia creativa de SEO, diseño, marketing y desarrollo de productos digitales.",
      en: "Official website for a creative agency offering SEO, design, marketing and digital product development.",
    },
    challenge: {
      es: "Comunicar una oferta amplia de servicios sin perder claridad ni la personalidad creativa de la agencia.",
      en: "Communicate a broad service offering without losing clarity or the agency's creative personality.",
    },
    solution: {
      es: "Organicé la propuesta por necesidades del cliente y diseñé una interfaz modular que equilibra estrategia y expresión visual.",
      en: "Organized the offer around client needs and designed a modular interface that balances strategy and visual expression.",
    },
    services: { es: ["Arquitectura de información", "Diseño web", "Desarrollo"], en: ["Information architecture", "Web design", "Development"] },
    technologies: ["WordPress", "Elementor", "JavaScript", "CSS"],
  },
  {
    slug: "erth-wellness",
    title: "Erth Wellness",
    kind: "client", ownership: "client", status: "delivered",
    year: "2025",
    client: { es: "Erth Wellness", en: "Erth Wellness" },
    location: colombia,
    category: category.ecommerce,
    image: "/images/projects/erth-wellness.png",
    alt: { es: "Tienda online colombiana de Erth Wellness", en: "Erth Wellness Colombian online store" },
    summary: {
      es: "Adaptación colombiana de una marca estadounidense de bienestar y productos naturales.",
      en: "Colombian adaptation of a US wellness and natural products brand.",
    },
    challenge: {
      es: "Conservar el ADN del sitio estadounidense adaptando contenido, comercio y experiencia al público latinoamericano.",
      en: "Keep the US site's DNA while adapting content, commerce and experience for a Latin American audience.",
    },
    solution: {
      es: "Repliqué los patrones esenciales de marca y localicé navegación, información y compra para el mercado colombiano.",
      en: "Replicated the core brand patterns and localized navigation, information and checkout for the Colombian market.",
    },
    services: { es: ["Adaptación de marca", "E-commerce", "Diseño responsive"], en: ["Brand adaptation", "E-commerce", "Responsive design"] },
    technologies: ["WordPress", "WooCommerce", "Elementor", "CSS"],
  },
  {
    slug: "the-brant",
    title: "The Brant",
    kind: "client", ownership: "client", status: "delivered",
    year: "2025",
    client: { es: "The Brant", en: "The Brant" },
    location: colombia,
    category: category.web,
    image: "/images/projects/the-brant.png",
    alt: { es: "Sitio corporativo internacional de The Brant", en: "The Brant international corporate website" },
    summary: {
      es: "Apoyo de diseño y desarrollo para una empresa que conecta talento, marcas y negocios a nivel global.",
      en: "Design and development support for a company connecting talent, brands and business globally.",
    },
    challenge: {
      es: "Proyectar una visión internacional con una presencia digital sobria, moderna y confiable.",
      en: "Project an international vision through a clean, modern and professional website.",
    },
    solution: {
      es: "Implementé una interfaz minimalista, jerarquías editoriales y componentes adaptables para comunicar sus alianzas y servicios.",
      en: "Implemented a minimalist interface, editorial hierarchy and adaptable components to present their partnerships and services.",
    },
    myRole: { es: "Apoyo en diseño y desarrollo web", en: "Web design and development support" },
    services: { es: ["Diseño web", "Desarrollo como tercero", "Diseño adaptable"], en: ["Web design", "Subcontracted development", "Responsive design"] },
    technologies: ["WordPress", "Elementor", "CSS"],
  },
  {
    slug: "vape-friends",
    title: "Vape & Friends",
    kind: "client", ownership: "client", status: "delivered",
    year: "2024",
    client: { es: "Vape and Friends", en: "Vape and Friends" },
    location: medellin,
    category: category.ecommerce,
    image: "/images/projects/vape-friends.png",
    alt: { es: "Tienda WooCommerce de Vape and Friends", en: "Vape and Friends WooCommerce store" },
    summary: {
      es: "Tienda mayorista y minorista con navegación clara, catálogo administrable y una identidad visual reconocible.",
      en: "Wholesale and retail store with clear navigation, an easy-to-manage product catalog and a recognizable visual identity.",
    },
    challenge: {
      es: "Atender en una sola experiencia las necesidades de compradores finales y clientes mayoristas.",
      en: "Serve both end customers and wholesale buyers in a single experience.",
    },
    solution: {
      es: "Diseñé el catálogo con recorridos simples y construí la tienda en WooCommerce para facilitar inventario, ventas y edición.",
      en: "Designed the catalog with simple journeys and built the store on WooCommerce to simplify product management, sales and content updates.",
    },
    services: { es: ["Diseño e-commerce", "Desarrollo", "SEO básico"], en: ["E-commerce design", "Development", "Basic SEO"] },
    technologies: ["WordPress", "WooCommerce", "Elementor"],
  },
  {
    slug: "tech-byte",
    title: "Tech Byte Co",
    kind: "client", ownership: "client", status: "delivered",
    year: "2024",
    client: { es: "Tech Byte Co", en: "Tech Byte Co" },
    location: medellin,
    category: category.ecommerce,
    image: "/images/projects/tech-byte.png",
    alt: { es: "E-commerce tecnológico de Tech Byte Co", en: "Tech Byte Co tech e-commerce" },
    summary: {
      es: "Tienda virtual de tecnología orientada a una experiencia intuitiva, moderna y consistente con la marca.",
      en: "Online tech store focused on an intuitive, modern and on-brand experience.",
    },
    challenge: {
      es: "Presentar un catálogo tecnológico amplio sin sobrecargar la interfaz ni complicar la gestión de inventario.",
      en: "Present a large tech catalog without overloading the interface or complicating inventory management.",
    },
    solution: {
      es: "Construí una tienda WooCommerce con categorías claras, navegación directa y herramientas de administración para ventas.",
      en: "Built a WooCommerce store with clear categories, direct navigation and sales management tools.",
    },
    services: { es: ["Análisis competitivo", "Diseño web", "Desarrollo e-commerce"], en: ["Competitive analysis", "Web design", "E-commerce development"] },
    technologies: ["WordPress", "WooCommerce", "Elementor"],
  },
  {
    slug: "big-vapers-company",
    title: "Big Vapers Company",
    kind: "client", ownership: "client", status: "delivered",
    year: "2024",
    client: { es: "Big Vapers Company", en: "Big Vapers Company" },
    location: { es: "Envigado, Colombia", en: "Envigado, Colombia" },
    category: category.ecommerce,
    image: "/images/projects/big-vapers-company.png",
    alt: { es: "Página e-commerce de Big Vapers Company", en: "Big Vapers Company e-commerce site" },
    summary: {
      es: "Tienda web que equilibra identidad visual, navegación sencilla y administración de productos.",
      en: "Online store balancing visual identity, simple navigation and product management.",
    },
    challenge: {
      es: "Crear una experiencia funcional para compradores y fácil de operar para el propietario.",
      en: "Create an experience that works for shoppers and is easy for the owner to run.",
    },
    solution: {
      es: "Desarrollé una estructura WooCommerce administrable, responsive y alineada con los objetivos comerciales de la marca.",
      en: "Developed a manageable, responsive WooCommerce structure aligned with the brand's business goals.",
    },
    services: { es: ["Investigación", "Diseño e-commerce", "Implementación"], en: ["Research", "E-commerce design", "Implementation"] },
    technologies: ["WordPress", "WooCommerce", "Elementor"],
  },
  {
    slug: "green-holds",
    title: "Green Holds",
    kind: "client", ownership: "client", status: "delivered",
    year: "2024",
    client: { es: "Green Holds", en: "Green Holds" },
    location: medellin,
    category: category.ecommerce,
    image: "/images/projects/green-holds.png",
    alt: { es: "Tienda en línea original de Green Holds", en: "Original Green Holds online store" },
    summary: {
      es: "Tienda en línea para una marca de productos derivados del cáñamo, enfocada en educación y confianza.",
      en: "Online store for a hemp-derived products brand, focused on education and trust.",
    },
    challenge: {
      es: "Presentar productos especializados con claridad y construir credibilidad en una categoría sensible.",
      en: "Present specialized products clearly and build credibility in a sensitive category.",
    },
    solution: {
      es: "Diseñé una tienda alineada con la identidad de marca, información educativa y un proceso de compra sencillo.",
      en: "Designed a store aligned with the brand identity, with educational content and a simple checkout.",
    },
    services: { es: ["Investigación", "Diseño web", "E-commerce"], en: ["Research", "Web design", "E-commerce"] },
    technologies: ["WordPress", "WooCommerce", "Elementor", "SEO"],
  },
];

export const projectKinds: { id: ProjectKind; label: L }[] = (Object.keys(projectKindLabels) as ProjectKind[]).map((id) => ({ id, label: projectKindLabels[id] }));

// Etiquetas: fuente única en content/project-labels.ts (también las usa content/ui.ts).
export const statusLabels: Record<ProjectStatus, L> = projectStatusLabels;

export const ownershipLabels: Record<Ownership, L> = projectOwnershipLabels;

export function projectTitle(project: Pick<Project, "title">, locale: Locale): string {
  return typeof project.title === "string" ? project.title : project.title[locale];
}

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}

/** Proyecto con portada: el único que hoy tiene página de caso de estudio (`/proyectos/<slug>/`). */
export type CaseStudy = Project & { image: string };

function hasCover(project: Project): project is CaseStudy {
  return Boolean(project.image);
}

/**
 * Casos de estudio publicados. Los personales y las automatizaciones sin portada
 * se mostrarán cuando la galería con filtros esté lista (Fase 4).
 */
export const caseStudies: CaseStudy[] = projects.filter(hasCover);

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return caseStudies.find((project) => project.slug === slug);
}

/**
 * Casos para la portada (COD-03): primero los marcados con `featured` y, si no llegan
 * a `limit`, se completa con el resto en el orden de `projects`.
 */
export function featuredCaseStudies(limit = 6): CaseStudy[] {
  const featured = caseStudies.filter((project) => project.featured);
  const rest = caseStudies.filter((project) => !project.featured);
  return [...featured, ...rest].slice(0, limit);
}

/**
 * Catálogo de proyectos autorizados para el SO (docs/arquitectura-os.md §1.4, DS10): ÚNICA fuente de
 * `generateStaticParams`, `knownSlugs`, selector de idioma, galería y detalle de `/os/`.
 * DECISIÓN DEL USUARIO (Q6): por defecto, los casos de estudio con portada. Publicar un proyecto sin
 * portada en el SO es añadirlo aquí, a propósito (su ventana omite "Ver página pública").
 */
export const osProjectSlugs: readonly string[] = caseStudies.map(({ slug }) => slug);

/** Proyectos del catálogo del SO, en el orden de `osProjectSlugs`. */
export function osProjects(): CaseStudy[] {
  return osProjectSlugs.flatMap((slug) => {
    const project = getCaseStudy(slug);
    return project ? [project] : [];
  });
}

export function getOsProject(slug: string): CaseStudy | undefined {
  return osProjectSlugs.includes(slug) ? getCaseStudy(slug) : undefined;
}
