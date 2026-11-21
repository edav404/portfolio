export const site = {
  name: "Emmanuel Dávila",
  role: "Desarrollador Web Full Stack y Diseñador Web",
  domain: (process.env.NEXT_PUBLIC_SITE_URL || "https://edav.com.co").replace(/\/+$/, ""),
  description:
    "Portafolio de Emmanuel Dávila: desarrollo web Full Stack, WordPress, Shopify, WooCommerce, diseño web y experiencias digitales a la medida.",
  lastfm: "edav404",
  whatsapp: "https://wa.me/573053959008",
};

export const services = [
  {
    slug: "desarrollo-web",
    title: "Desarrollo web",
    kicker: "Sitios rápidos, accesibles y hechos a la medida.",
    description:
      "Diseño y desarrollo sitios corporativos, portafolios y productos digitales con una base técnica mantenible, optimizada para buscadores y preparada para crecer.",
    includes: ["Arquitectura y UX", "Frontend responsive", "Integraciones API", "SEO técnico", "Analítica y despliegue"],
    stack: "React, Next.js, TypeScript, Node.js, HTML y CSS",
  },
  {
    slug: "wordpress",
    title: "WordPress y WooCommerce",
    kicker: "Autonomía para editar sin sacrificar calidad.",
    description:
      "Creo y rediseño sitios WordPress y tiendas WooCommerce con una experiencia de compra clara, edición sencilla y atención especial al rendimiento.",
    includes: ["Diseño responsive", "Catálogo y pagos", "Elementor", "Optimización SEO", "Capacitación"],
    stack: "WordPress, Elementor, WooCommerce y PHP",
  },
  {
    slug: "shopify",
    title: "Shopify",
    kicker: "E-commerce flexible con identidad propia.",
    description:
      "Personalizo tiendas Shopify, desarrollo secciones Liquid editables y optimizo recorridos de compra para que la marca destaque y el equipo conserve el control.",
    includes: ["Diseño de tienda", "Secciones Liquid", "UX de conversión", "Responsive", "Integración de aplicaciones"],
    stack: "Shopify, Liquid, JavaScript y CSS",
  },
  {
    slug: "diseno-web",
    title: "Diseño web y UX/UI",
    kicker: "Interfaces útiles con una voz visual memorable.",
    description:
      "Transformo objetivos de negocio en interfaces claras, coherentes y accesibles, desde el brief y los wireframes hasta un sistema visual listo para desarrollo.",
    includes: ["Brief y estrategia", "Wireframes", "Sistema visual", "Prototipo responsive", "Estados e interacciones"],
    stack: "Figma, diseño responsive y WCAG AA",
  },
] as const;

export const testimonials = [
  {
    name: "Pinceladas",
    project: "E-commerce",
    logo: "/images/testimonials/pinceladas.png",
    quote:
      "Trabajamos con Emmanuel para crear nuestra página web y quedamos satisfechos con el resultado. Escuchó nuestras ideas y las plasmó en la página web; queríamos un diseño muy colorido, tal cual es nuestra identidad, y así fue.",
  },
  {
    name: "Vape and Friends",
    project: "E-commerce",
    logo: "/images/testimonials/vape-friends.png",
    quote:
      "Un trabajo muy bueno. Nos ayudó a crear una página web que cumple con nuestras necesidades específicas como mayoristas. La página es fácil de usar y navegar, y está optimizada para Google.",
  },
  {
    name: "Green Holds",
    project: "E-commerce y SEO",
    logo: "/images/testimonials/green-holds.png",
    quote:
      "Quedamos satisfechos con el resultado. Emmanuel hizo exactamente lo que buscábamos: nuestra página web con posicionamiento SEO, y además nos ayudó con email marketing para aumentar los clientes y las ventas.",
  },
] as const;

export const technologies = [
  "TypeScript", "JavaScript", "React", "Next.js", "Node.js", "Python", "PostgreSQL", "Supabase",
  "WordPress", "Elementor", "WooCommerce", "Shopify", "Liquid", "REST APIs", "Git", "Figma",
];
