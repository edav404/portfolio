import type { L, Locale } from "./types";

/**
 * Bloques del cuerpo de un post.
 *
 * Enlaces en línea: `[texto](/ruta/)` dentro de `text` o de cada `item`.
 * Las rutas se escriben SIEMPRE con la ruta ES y barra final (p. ej. `/servicios/#wordpress`),
 * también en el cuerpo EN: en la Fase 3 el renderizador EN las traduce con `content/routes.ts`.
 * Así el mismo texto sirve para la página, `llms-full.txt` (Markdown) y ambos idiomas.
 */
export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] };

export type Post = {
  /** Slug por idioma (URLs localizadas). El ES conserva el slug de WordPress. */
  slug: L;
  /** Título visible (H1). */
  title: L;
  /** Título para buscadores (≤ 53 caracteres; la página añade " | edav"). */
  seoTitle: L;
  /** Meta description (140–160 caracteres). */
  description: L;
  /** Publicación original (WordPress) y última revisión del contenido (YYYY-MM-DD). */
  published: string;
  updated: string;
  tags: L<string[]>;
  body: L<Block[]>;
};

export const posts: Post[] = [
  {
    slug: { es: "para-que-una-pagina-web-para-mi-negocio", en: "why-your-business-needs-a-website" },
    title: { es: "¿Para qué necesita tu negocio una página web?", en: "Why does your business need a website?" },
    seoTitle: {
      es: "Página web para tu negocio: beneficios y cómo elegir",
      en: "Why your business needs a website and how to choose",
    },
    description: {
      es: "Para qué sirve una página web en tu negocio, qué necesita para funcionar y cómo elegir entre WordPress, Shopify o un desarrollo a la medida con automatización.",
      en: "What a website does for your business, what it needs in order to work, and how to choose between WordPress, Shopify or a custom build with automation.",
    },
    published: "2024-05-24",
    updated: "2026-11-21",
    tags: { es: ["Negocios", "Desarrollo web"], en: ["Business", "Web development"] },
    body: {
      es: [
        { type: "p", text: "Muchos negocios venden por Instagram, WhatsApp o un marketplace, y funciona. El problema es que en todos esos canales el terreno es prestado: cambian las reglas, baja el alcance o te cierran la cuenta, y tu negocio queda sin vitrina. Una página web propia no reemplaza esos canales, pero te da un lugar que controlas: tu contenido, tu dominio y tus datos." },
        { type: "p", text: "He construido sitios y tiendas en WordPress, WooCommerce y Shopify para marcas de Colombia, México y Estados Unidos, y hoy también hago desarrollo a la medida y automatización de procesos. Esto es lo que suelo responder cuando un negocio me pregunta si de verdad necesita una página web." },
        { type: "h2", text: "Para qué sirve una página web en tu negocio" },
        { type: "ul", items: [
          "Visibilidad las 24 horas: puede ayudarte a aparecer cuando alguien busca en Google o le pregunta a un asistente de IA por un servicio como el tuyo. Lo explico en [cómo puede ayudar el SEO a tu negocio](/blog/como-el-seo-puede-ayudar-a-tu-negocio-a-crecer/).",
          "Credibilidad: un sitio claro, rápido y con información completa genera más confianza que un perfil en redes.",
          "Ventas sin intermediarios: con una tienda en línea, el cliente compra a cualquier hora sin que tengas que atender cada mensaje.",
          "Datos propios: con analítica configurada, conoces de dónde llegan tus visitas y cómo navegan, sin depender de las métricas de otra plataforma.",
          "Procesos que se hacen solos: un formulario puede llevar cada solicitud a tu correo o a una hoja de cálculo, y un bot puede enviar recordatorios, sin copiar y pegar datos a mano.",
        ] },
        { type: "h2", text: "Qué debe tener para que funcione" },
        { type: "ul", items: [
          "Un mensaje claro en los primeros segundos: qué haces, para quién y cómo contactarte.",
          "Diseño adaptable: debe funcionar bien en celulares y computadores; buena parte de las visitas llega desde el celular.",
          "Velocidad: si el sitio tarda en cargar, muchas personas se van antes de ver lo que ofreces, y la experiencia de la página también cuenta para los buscadores.",
          "Un llamado a la acción visible: WhatsApp, formulario, reserva o carrito, según tu negocio.",
          "SEO desde el inicio: títulos, descripciones y contenido pensados en cómo te buscan tus clientes.",
          "Que puedas editarlo: textos, precios y productos sin depender de un desarrollador para cada cambio. En el [rediseño de la tienda Shopify de Green Holds](/proyectos/green-holds-shopify/), por ejemplo, el equipo edita las secciones desde el personalizador de Shopify.",
        ] },
        { type: "h2", text: "¿WordPress, Shopify o desarrollo a la medida?" },
        { type: "p", text: "Depende de lo que necesites y de quién va a mantener el sitio:" },
        { type: "ul", items: [
          "[WordPress](/servicios/#wordpress): flexible y fácil de administrar para sitios corporativos y blogs. Con WooCommerce también sirve para tiendas, como la de [Vape & Friends](/proyectos/vape-friends/), que atiende en una sola experiencia a compradores finales y mayoristas.",
          "[Shopify](/servicios/#shopify): una plataforma pensada para vender en línea, con pagos, inventario y envíos integrados. Pagas una suscripción mensual a cambio de menos mantenimiento técnico.",
          "[Desarrollo a la medida](/servicios/#desarrollo-web) (por ejemplo, con Next.js): conviene cuando necesitas una experiencia única, integraciones con otros sistemas o [automatizaciones](/servicios/#automatizacion) que una plantilla no resuelve.",
        ] },
        { type: "p", text: "Si estás pensando en tu página web, [escríbeme](/contacto/) y revisamos juntos qué opción tiene más sentido para tu negocio y tu presupuesto." },
      ],
      en: [
        { type: "p", text: "Many businesses sell through Instagram, WhatsApp or a marketplace, and it works. The catch is that all of those channels are rented ground: rules change, reach drops or an account gets closed, and your business loses its storefront. Your own website doesn't replace those channels, but it gives you a place you control: your content, your domain and your data." },
        { type: "p", text: "I've built websites and online stores on WordPress, WooCommerce and Shopify for brands in Colombia, Mexico and the United States, and today I also do custom development and process automation. This is what I usually tell businesses that ask me whether they really need a website." },
        { type: "h2", text: "What a website does for your business" },
        { type: "ul", items: [
          "24/7 visibility: it can help you show up when someone searches Google or asks an AI assistant for a service like yours. I explain how in [how SEO can help your business](/blog/como-el-seo-puede-ayudar-a-tu-negocio-a-crecer/).",
          "Credibility: a clear, fast site with complete information builds more trust than a social profile.",
          "Sales without middlemen: with an online store, customers buy at any time without you answering every message.",
          "Your own data: with analytics set up, you can see where visitors come from and how they browse, without relying on another platform's metrics.",
          "Processes that run themselves: a form can send every request to your inbox or a spreadsheet, and a bot can send reminders, with no copying and pasting by hand.",
        ] },
        { type: "h2", text: "What it needs in order to work" },
        { type: "ul", items: [
          "A clear message in the first few seconds: what you do, who it's for and how to reach you.",
          "Responsive design: it should work well on phones and computers; a large share of visits comes from phones.",
          "Speed: if the site is slow to load, many people leave before they see what you offer, and page experience also matters to search engines.",
          "A visible call to action: WhatsApp, a form, a booking or a cart, depending on your business.",
          "SEO from day one: titles, descriptions and content built around how customers search for you.",
          "Easy editing: change copy, prices and products without needing a developer every time. In the [Green Holds Shopify store redesign](/proyectos/green-holds-shopify/), for example, the team edits each section from the Shopify customizer.",
        ] },
        { type: "h2", text: "WordPress, Shopify or a custom build?" },
        { type: "p", text: "It depends on what you need and who will maintain the site:" },
        { type: "ul", items: [
          "[WordPress](/servicios/#wordpress): flexible and easy to manage for corporate sites and blogs. With WooCommerce it also works for online stores, like [Vape & Friends](/proyectos/vape-friends/), which serves both end customers and wholesale buyers in a single experience.",
          "[Shopify](/servicios/#shopify): a platform built for selling online, with payments, inventory and shipping built in. You pay a monthly subscription in exchange for less technical maintenance.",
          "[Custom development](/servicios/#desarrollo-web) (for example, with Next.js): makes sense when you need a unique experience, integrations with other systems or [automation](/servicios/#automatizacion) that a template can't handle.",
        ] },
        { type: "p", text: "If you're thinking about your website, [get in touch](/contacto/) and we'll work out which option makes the most sense for your business and budget." },
      ],
    },
  },
  {
    slug: { es: "como-el-seo-puede-ayudar-a-tu-negocio-a-crecer", en: "how-seo-helps-your-business-grow" },
    title: { es: "Cómo puede ayudar el SEO a tu negocio en la era de la IA", en: "How SEO can help your business in the AI era" },
    seoTitle: {
      es: "SEO para tu negocio en la era de la IA: cómo empezar",
      en: "SEO for your business in the AI era: where to start",
    },
    description: {
      es: "Qué es el SEO, cómo ayuda a que te encuentren en Google y en asistentes de IA, y qué revisar primero en tu sitio: contenido, velocidad y datos estructurados.",
      en: "What SEO is, how it helps people find you on Google and in AI assistants, and what to check first on your site: content, speed and structured data.",
    },
    published: "2024-05-24",
    updated: "2026-11-21",
    tags: { es: ["SEO", "IA", "Marketing"], en: ["SEO", "AI", "Marketing"] },
    body: {
      es: [
        { type: "p", text: "El SEO (optimización para motores de búsqueda) es el trabajo de hacer que tu sitio aparezca cuando alguien busca lo que ofreces, sin pagar por cada clic. Hoy esa búsqueda ya no ocurre solo en la lista de resultados de Google: también en los resúmenes con IA de los buscadores y en asistentes como ChatGPT, Claude o Perplexity, que pueden consultar la web para responder." },
        { type: "p", text: "Entre 2022 y 2023 administré el sitio WordPress de [Green Holds](/proyectos/green-holds/), una marca de productos derivados del cáñamo, y trabajé en mejoras de SEO y contenido. Hoy el SEO técnico forma parte de los sitios que desarrollo. Esto es lo que considero básico." },
        { type: "h2", text: "Por qué sigue importando el SEO" },
        { type: "ul", items: [
          "Tráfico que llega con intención: quien busca «diseño de tienda en línea en Medellín» ya está buscando una solución.",
          "Visibilidad sostenida: a diferencia de la publicidad, el contenido bien posicionado puede seguir trayendo visitas cuando dejas de pagar.",
          "Más oportunidades: si las visitas llegan con intención y el sitio facilita el contacto, se traducen en más solicitudes y ventas.",
        ] },
        { type: "h2", text: "Qué cambia con la inteligencia artificial" },
        { type: "p", text: "Los asistentes y los resúmenes con IA se apoyan en contenido claro, estructurado y accesible. Un buen SEO no garantiza aparecer en sus respuestas, pero sí facilita que tu sitio se entienda: quién eres, qué ofreces y para quién." },
        { type: "p", text: "Un extra opcional: un archivo llms.txt, una propuesta de 2024 que resume tu sitio en texto plano para que los modelos de lenguaje lo lean con facilidad. No es un estándar oficial, no hay garantía de que buscadores o asistentes lo usen y no reemplaza lo básico, pero cuesta poco tenerlo." },
        { type: "h2", text: "Lo básico que debe tener tu sitio" },
        { type: "ul", items: [
          "Un título y una descripción únicos por página, escritos para personas.",
          "Contenido que responda preguntas reales de tus clientes, con encabezados claros.",
          "Velocidad y buena experiencia en celular; Google las mide con las Core Web Vitals.",
          "Un sitemap.xml y un robots.txt bien configurados para que los buscadores encuentren todo.",
          "Datos estructurados (Schema.org) para que buscadores e IA entiendan quién eres, qué vendes y dónde estás.",
        ] },
        { type: "h2", text: "Por dónde empezar" },
        { type: "p", text: "Empieza por entender cómo te buscan tus clientes, revisa que tu sitio cargue rápido y que cada página tenga un propósito claro. Después, publica contenido útil de forma constante. El SEO no es inmediato y requiere continuidad; su retorno depende de tu mercado, tu competencia y de qué tan bien tu sitio convierte las visitas. Si todavía no tienes sitio, empieza por [qué necesita una página web para funcionar](/blog/para-que-una-pagina-web-para-mi-negocio/)." },
        { type: "p", text: "¿Quieres saber cómo está tu sitio hoy? [Escríbeme](/contacto/) y lo revisamos. El SEO técnico está incluido en mi servicio de [desarrollo web](/servicios/#desarrollo-web)." },
      ],
      en: [
        { type: "p", text: "SEO (search engine optimization) is the work of getting your site to show up when someone searches for what you offer, without paying per click. Today that search doesn't only happen in Google's list of results: it also happens in search engines' AI summaries and in assistants like ChatGPT, Claude or Perplexity, which can look things up on the web to answer." },
        { type: "p", text: "Between 2022 and 2023 I managed the WordPress site of [Green Holds](/proyectos/green-holds/), a hemp-derived products brand, and worked on SEO and content improvements. Today technical SEO is part of the sites I build. This is what I consider essential." },
        { type: "h2", text: "Why SEO still matters" },
        { type: "ul", items: [
          "Traffic with intent: someone searching for “online store design in Medellín” is already looking for a solution.",
          "Lasting visibility: unlike ads, well-ranked content can keep bringing visitors after you stop paying.",
          "More opportunities: when visitors arrive with intent and the site makes it easy to get in touch, they turn into more inquiries and sales.",
        ] },
        { type: "h2", text: "What changes with AI" },
        { type: "p", text: "AI assistants and AI summaries rely on clear, structured and accessible content. Good SEO doesn't guarantee a mention in their answers, but it makes your site easier to understand: who you are, what you offer and who it's for." },
        { type: "p", text: "An optional extra: an llms.txt file, a 2024 proposal that summarizes your site in plain text so language models can read it easily. It isn't an official standard, there's no guarantee that search engines or assistants use it, and it doesn't replace the essentials, but it's cheap to add." },
        { type: "h2", text: "The essentials every site needs" },
        { type: "ul", items: [
          "A unique title and description on every page, written for people.",
          "Content that answers your customers' real questions, with clear headings.",
          "Speed and a good mobile experience; Google measures them with Core Web Vitals.",
          "A properly configured sitemap.xml and robots.txt so search engines can find everything.",
          "Structured data (Schema.org) so search engines and AI understand who you are, what you sell and where you are.",
        ] },
        { type: "h2", text: "Where to start" },
        { type: "p", text: "Start by understanding how your customers search for you, make sure your site loads fast and that every page has a clear purpose. Then publish useful content consistently. SEO isn't instant and takes ongoing work; its return depends on your market, your competition and how well your site turns visits into customers. If you don't have a site yet, start with [what a website needs in order to work](/blog/para-que-una-pagina-web-para-mi-negocio/)." },
        { type: "p", text: "Want to know how your site is doing today? [Get in touch](/contacto/) and we'll review it. Technical SEO is included in my [web development](/servicios/#desarrollo-web) service." },
      ],
    },
  },
];

/** Posts del más reciente al más antiguo (por fecha de publicación). */
export const sortedPosts = [...posts].sort((a, b) => b.published.localeCompare(a.published));

export function getPostBySlug(slug: string, locale: Locale) {
  return posts.find((post) => post.slug[locale] === slug);
}
