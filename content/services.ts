import { href } from "./routes";
import type { L, Locale } from "./types";

export type Service = {
  slug: string;
  title: L;
  kicker: L;
  description: L;
  includes: L<string[]>;
  stack: L;
};

export const services: Service[] = [
  {
    slug: "desarrollo-web",
    title: { es: "Desarrollo web", en: "Web development" },
    kicker: { es: "Sitios rápidos, accesibles y hechos a la medida.", en: "Fast, accessible, custom-built websites." },
    description: {
      es: "Diseño y desarrollo sitios corporativos, portafolios y productos digitales con una base técnica mantenible, optimizada para buscadores y preparada para crecer.",
      en: "I design and build corporate sites, portfolios and digital products on a maintainable technical foundation, optimized for search and ready to grow.",
    },
    includes: {
      es: ["Arquitectura y UX", "Frontend responsive", "Integraciones API", "SEO técnico", "Analítica y despliegue"],
      en: ["Architecture & UX", "Responsive frontend", "API integrations", "Technical SEO", "Analytics & deployment"],
    },
    stack: { es: "React, Next.js, TypeScript, Node.js, HTML y CSS", en: "React, Next.js, TypeScript, Node.js, HTML and CSS" },
  },
  {
    slug: "automatizacion",
    title: { es: "Automatización de procesos", en: "Process automation" },
    kicker: { es: "Menos trabajo manual, menos errores.", en: "Less manual work, fewer errors." },
    description: {
      es: "Identifico tareas repetitivas y las convierto en flujos automáticos: formularios que alimentan listas, reportes que se actualizan solos, bots que avisan y apps internas que reemplazan hojas de cálculo.",
      en: "I find repetitive tasks and turn them into automated flows: forms that feed lists, reports that update themselves, bots that notify you and internal apps that replace spreadsheets.",
    },
    includes: {
      es: ["Levantamiento del proceso", "Apps internas (Power Apps)", "Tableros (Power BI)", "Bots e integraciones (n8n)", "Documentación y traspaso"],
      en: ["Process discovery", "Internal apps (Power Apps)", "Dashboards (Power BI)", "Bots & integrations (n8n)", "Documentation & handover"],
    },
    stack: { es: "Microsoft 365, Power Platform, n8n, Telegram, PostgreSQL e IA", en: "Microsoft 365, Power Platform, n8n, Telegram, PostgreSQL and AI" },
  },
  {
    slug: "wordpress",
    title: { es: "WordPress y WooCommerce", en: "WordPress & WooCommerce" },
    kicker: { es: "Autonomía para editar sin sacrificar calidad.", en: "Edit freely without sacrificing quality." },
    description: {
      es: "Creo y rediseño sitios WordPress y tiendas WooCommerce con una experiencia de compra clara, edición sencilla y atención especial al rendimiento.",
      en: "I build and redesign WordPress sites and WooCommerce stores with a clear shopping experience, simple editing and close attention to performance.",
    },
    includes: {
      es: ["Diseño responsive", "Catálogo y pagos", "Elementor", "Optimización SEO", "Capacitación"],
      en: ["Responsive design", "Catalog & payments", "Elementor", "SEO optimization", "Training"],
    },
    stack: { es: "WordPress, Elementor, WooCommerce y PHP", en: "WordPress, Elementor, WooCommerce and PHP" },
  },
  {
    slug: "shopify",
    title: { es: "Shopify", en: "Shopify" },
    kicker: { es: "E-commerce flexible con identidad propia.", en: "Flexible e-commerce with its own identity." },
    description: {
      es: "Personalizo tiendas Shopify, desarrollo secciones Liquid editables y optimizo recorridos de compra para que la marca destaque y el equipo conserve el control.",
      en: "I customize Shopify stores, build editable Liquid sections and optimize shopping journeys so the brand stands out and the team stays in control.",
    },
    includes: {
      es: ["Diseño de tienda", "Secciones Liquid", "UX de conversión", "Responsive", "Integración de aplicaciones"],
      en: ["Store design", "Liquid sections", "Conversion UX", "Responsive", "App integrations"],
    },
    stack: { es: "Shopify, Liquid, JavaScript y CSS", en: "Shopify, Liquid, JavaScript and CSS" },
  },
  {
    slug: "diseno-web",
    title: { es: "Diseño web y UX/UI", en: "Web design & UX/UI" },
    kicker: { es: "Interfaces útiles con una voz visual memorable.", en: "Useful interfaces with a memorable visual voice." },
    description: {
      es: "Transformo objetivos de negocio en interfaces claras, coherentes y accesibles, desde el brief y los wireframes hasta un sistema visual listo para desarrollo.",
      en: "I turn business goals into clear, consistent and accessible interfaces, from brief and wireframes to a visual system ready for development.",
    },
    includes: {
      es: ["Brief y estrategia", "Wireframes", "Sistema visual", "Prototipo responsive", "Estados e interacciones"],
      en: ["Brief & strategy", "Wireframes", "Visual system", "Responsive prototype", "States & interactions"],
    },
    stack: { es: "Figma, diseño adaptable y criterios de accesibilidad (WCAG)", en: "Figma, responsive design and accessibility guidelines (WCAG)" },
  },
];

/** Valor del formulario para un proyecto que no encaja en ningún servicio. */
export const OTHER_SERVICE = "otro" as const;
export const otherServiceLabel: L = { es: "Otro", en: "Other" };

/** Slugs válidos del campo `service` del formulario (servicios + "otro"). */
export const serviceSlugs: readonly string[] = [...services.map((service) => service.slug), OTHER_SERVICE];

export function getService(slug: string): Service | undefined {
  return services.find((service) => service.slug === slug);
}

/** Minúsculas, sin tildes ni espacios sobrantes: para comparar títulos antiguos. */
function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Etiquetas que usaba el formulario antes de identificar los servicios por slug. */
const legacyLabels: Record<string, string> = {
  "wordpress o woocommerce": "wordpress",
  "diseno web": "diseno-web",
  automatizacion: "automatizacion",
};

/**
 * Convierte lo que llegue por URL (`?servicio=`) o por el formulario en un slug válido.
 * Acepta el slug, el título ES/EN y las etiquetas antiguas; devuelve `null` si no lo reconoce.
 */
export function resolveServiceSlug(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = normalize(value);
  if (!key) return null;
  if (serviceSlugs.includes(key)) return key;
  if (key === normalize(otherServiceLabel.es) || key === normalize(otherServiceLabel.en)) return OTHER_SERVICE;
  const byTitle = services.find((service) => normalize(service.title.es) === key || normalize(service.title.en) === key);
  return byTitle?.slug ?? legacyLabels[key] ?? null;
}

/** Título legible de un slug del formulario (para el asunto del correo, por ejemplo). */
export function serviceLabel(slug: string, locale: Locale = "es"): string | null {
  if (slug === OTHER_SERVICE) return otherServiceLabel[locale];
  return getService(slug)?.title[locale] ?? null;
}

/** Enlace al formulario (de cada idioma) con el servicio preseleccionado. */
export function contactHrefForService(slug: string, locale: Locale = "es"): string {
  return `${href("contact", locale)}?servicio=${encodeURIComponent(slug)}`;
}

/** Las citas son de los clientes en español; la versión en inglés es una traducción. */
export type Testimonial = { name: string; project: L; logo: string; quote: L; translatedFrom?: "es" };

export const testimonials: Testimonial[] = [
  {
    name: "Pinceladas",
    project: { es: "E-commerce", en: "E-commerce" },
    logo: "/images/testimonials/pinceladas.png",
    translatedFrom: "es",
    quote: {
      es: "Trabajamos con Emmanuel para crear nuestra página web y quedamos satisfechos con el resultado. Escuchó nuestras ideas y las plasmó en la página web; queríamos un diseño muy colorido, tal cual es nuestra identidad, y así fue.",
      en: "We worked with Emmanuel to build our website and were very happy with the result. He listened to our ideas and brought them to the site; we wanted a very colorful design, true to our identity, and that's what we got.",
    },
  },
  {
    name: "Vape and Friends",
    project: { es: "E-commerce", en: "E-commerce" },
    logo: "/images/testimonials/vape-friends.png",
    translatedFrom: "es",
    quote: {
      es: "Un trabajo muy bueno. Nos ayudó a crear una página web que cumple con nuestras necesidades específicas como mayoristas. La página es fácil de usar y navegar, y está optimizada para Google.",
      en: "Great work. He helped us build a website that meets our specific needs as wholesalers. It's easy to use and navigate, and it's optimized for Google.",
    },
  },
  {
    name: "Green Holds",
    project: { es: "E-commerce y SEO", en: "E-commerce & SEO" },
    logo: "/images/testimonials/green-holds.png",
    translatedFrom: "es",
    quote: {
      es: "Quedamos satisfechos con el resultado. Emmanuel hizo exactamente lo que buscábamos: nuestra página web con posicionamiento SEO, y además nos ayudó con email marketing para aumentar los clientes y las ventas.",
      en: "We're happy with the result. Emmanuel did exactly what we were looking for: our website with SEO, and he also helped with email marketing to grow customers and sales.",
    },
  },
];
