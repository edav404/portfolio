import type { L } from "./types";

export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] };

export type Post = {
  /** Slug por idioma (URLs localizadas). */
  slug: L;
  title: L;
  description: L;
  /** Publicación original (WordPress) y última actualización. */
  published: string;
  updated: string;
  tags: L<string[]>;
  body: L<Block[]>;
};

export const posts: Post[] = [
  {
    slug: { es: "para-que-una-pagina-web-para-mi-negocio", en: "why-your-business-needs-a-website" },
    title: { es: "¿Para qué necesita tu negocio una página web?", en: "Why does your business need a website?" },
    description: {
      es: "Qué puede aportar una página web a tu negocio en 2026, qué elementos necesita para funcionar y cómo elegir entre WordPress, Shopify o un desarrollo a la medida.",
      en: "How a website can support your business in 2026, which features it needs to work, and how to choose between WordPress, Shopify or a custom build.",
    },
    published: "2024-05-24",
    updated: "2026-11-20",
    tags: { es: ["Negocios", "Desarrollo web"], en: ["Business", "Web development"] },
    body: {
      es: [
        { type: "p", text: "Muchos negocios venden por Instagram, WhatsApp o un marketplace, y funciona. El problema es que en todos esos canales el terreno es prestado: cambian las reglas, baja el alcance o te cierran la cuenta, y tu negocio queda sin vitrina. Un sitio propio te da mucho más control sobre tu contenido y tu presencia digital." },
        { type: "h2", text: "Qué gana tu negocio con un sitio propio" },
        { type: "ul", items: [
          "Visibilidad 24/7: puede ayudarte a aparecer cuando alguien busca en Google o pregunta a un asistente de IA por un servicio como el tuyo.",
          "Credibilidad: un sitio claro, rápido y con información completa genera más confianza que un perfil en redes.",
          "Ventas sin intermediarios: con un e-commerce, el cliente compra a cualquier hora sin que tengas que atender cada mensaje.",
          "Datos propios: con analítica configurada, conoces de dónde llegan tus visitas y cómo navegan, sin depender de las métricas de otra plataforma.",
        ] },
        { type: "h2", text: "Qué debe tener para que funcione" },
        { type: "ul", items: [
          "Un mensaje claro en los primeros segundos: qué haces, para quién y cómo contactarte.",
          "Diseño adaptable: debe funcionar bien en celulares y computadores; buena parte de las visitas llega desde el celular.",
          "Velocidad: un sitio lento pierde visitas y posiciones en buscadores.",
          "Un llamado a la acción visible: WhatsApp, formulario, reserva o carrito, según tu negocio.",
          "SEO desde el inicio: títulos, descripciones y contenido pensados para cómo te buscan tus clientes.",
          "Que puedas editarlo: textos, precios y productos sin depender de un desarrollador para cada cambio.",
        ] },
        { type: "h2", text: "¿WordPress, Shopify o a la medida?" },
        { type: "p", text: "Depende de lo que necesites. WordPress es flexible y fácil de administrar para sitios corporativos y blogs; WooCommerce y Shopify resuelven muy bien las tiendas en línea; y un desarrollo a la medida (por ejemplo con Next.js) conviene cuando necesitas una experiencia única, integraciones con otros sistemas o automatizaciones." },
        { type: "p", text: "Si estás pensando en tu sitio, escríbeme y revisamos juntos qué opción tiene más sentido para tu negocio y tu presupuesto." },
      ],
      en: [
        { type: "p", text: "Many businesses sell through Instagram, WhatsApp or a marketplace, and it works. The catch is that all of those channels are rented ground: rules change, reach drops or an account gets closed, and your business loses its storefront. Your own website gives you far more control over your content and online presence." },
        { type: "h2", text: "What your business gains from its own site" },
        { type: "ul", items: [
          "24/7 visibility: it can help you show up when someone searches Google or asks an AI assistant for a service like yours.",
          "Credibility: a clear, fast site with complete information builds more trust than a social profile.",
          "Sales without middlemen: with an online store, customers buy at any time without you answering every message.",
          "Your own data: with analytics set up, you can see where visitors come from and how they browse, without relying on another platform's metrics.",
        ] },
        { type: "h2", text: "What it needs in order to work" },
        { type: "ul", items: [
          "A clear message in the first few seconds: what you do, who it's for and how to reach you.",
          "Responsive design: it should work well on phones and computers; a large share of visits comes from phones.",
          "Speed: a slow site loses visitors and search rankings.",
          "A visible call to action: WhatsApp, a form, a booking or a cart, depending on your business.",
          "SEO from day one: titles, descriptions and content built around how customers search for you.",
          "Easy editing: change copy, prices and products without needing a developer every time.",
        ] },
        { type: "h2", text: "WordPress, Shopify or custom?" },
        { type: "p", text: "It depends on what you need. WordPress is flexible and easy to manage for corporate sites and blogs; WooCommerce and Shopify handle online stores very well; and a custom build (for example with Next.js) makes sense when you need a unique experience, integrations with other systems or automation." },
        { type: "p", text: "If you're thinking about your site, get in touch and we'll work out which option makes the most sense for your business and budget." },
      ],
    },
  },
  {
    slug: { es: "como-el-seo-puede-ayudar-a-tu-negocio-a-crecer", en: "how-seo-helps-your-business-grow" },
    title: { es: "Cómo puede ayudar el SEO a tu negocio en la era de la IA", en: "How SEO can help your business in the AI era" },
    description: {
      es: "Qué es el SEO, cómo ayuda a que tus clientes encuentren tu negocio ahora que también buscan con IA, y por dónde empezar a mejorar el contenido de tu sitio.",
      en: "What SEO is, how it helps customers find your business now that they also search with AI, and where to start improving your website's content and structure.",
    },
    published: "2024-05-24",
    updated: "2026-11-20",
    tags: { es: ["SEO", "IA", "Marketing"], en: ["SEO", "AI", "Marketing"] },
    body: {
      es: [
        { type: "p", text: "El SEO (optimización para motores de búsqueda) es el trabajo de hacer que tu sitio aparezca cuando alguien busca lo que ofreces, sin pagar por cada clic. Hoy esa búsqueda ya no ocurre solo en Google: también en los resúmenes con IA de los buscadores y en asistentes como ChatGPT, Claude o Perplexity, que leen la web para responder." },
        { type: "h2", text: "Por qué sigue importando" },
        { type: "ul", items: [
          "Tráfico que llega con intención: quien busca «diseño de tienda en línea en Medellín» ya está buscando una solución.",
          "Visibilidad sostenida: a diferencia de la publicidad, el contenido bien posicionado sigue trayendo visitas cuando dejas de pagar.",
          "Más prospectos y ventas: más visitas cualificadas significan más contactos y más oportunidades.",
          "Base para la IA: los asistentes se apoyan en contenido claro, estructurado y accesible. Un buen SEO no garantiza aparecer en sus respuestas, pero sí facilita que tu sitio se entienda.",
        ] },
        { type: "h2", text: "Lo básico que debe tener tu sitio" },
        { type: "ul", items: [
          "Un título y una descripción únicos por página, escritos para personas.",
          "Contenido que responda preguntas reales de tus clientes, con encabezados claros.",
          "Velocidad y buena experiencia en celular (Core Web Vitals).",
          "Un sitemap.xml y un robots.txt bien configurados para que los buscadores encuentren todo.",
          "Datos estructurados (Schema.org) para que buscadores e IA entiendan quién eres, qué vendes y dónde estás.",
        ] },
        { type: "p", text: "Un extra que vale la pena: un archivo llms.txt, una propuesta reciente que resume tu sitio en texto plano para que los modelos de lenguaje lo lean con facilidad. No es un estándar oficial ni reemplaza lo anterior, pero cuesta poco tenerlo." },
        { type: "h2", text: "Por dónde empezar" },
        { type: "p", text: "Empieza por entender cómo te buscan tus clientes, revisa que tu sitio cargue rápido y que cada página tenga un propósito claro. Después, publica contenido útil de forma constante. El SEO no es inmediato y requiere continuidad; su retorno depende de tu mercado, tu competencia y de qué tan bien tu sitio convierte las visitas." },
        { type: "p", text: "¿Quieres saber cómo está tu sitio hoy? Escríbeme y lo revisamos." },
      ],
      en: [
        { type: "p", text: "SEO (search engine optimization) is the work of getting your site to show up when someone searches for what you offer, without paying per click. Today that search doesn't only happen on Google: it also happens in search engines' AI summaries and in assistants like ChatGPT, Claude or Perplexity, which read the web to answer." },
        { type: "h2", text: "Why it still matters" },
        { type: "ul", items: [
          "Traffic with intent: someone searching for “online store design in Medellín” is already looking for a solution.",
          "Lasting visibility: unlike ads, well-ranked content keeps bringing visitors after you stop paying.",
          "More leads and sales: more qualified visits mean more inquiries and more opportunities.",
          "A foundation for AI: assistants rely on clear, structured and accessible content. Good SEO doesn't guarantee a mention in their answers, but it makes your site easier to understand.",
        ] },
        { type: "h2", text: "The essentials every site needs" },
        { type: "ul", items: [
          "A unique title and description on every page, written for people.",
          "Content that answers your customers' real questions, with clear headings.",
          "Speed and a good mobile experience (Core Web Vitals).",
          "A properly configured sitemap.xml and robots.txt so search engines can find everything.",
          "Structured data (Schema.org) so search engines and AI understand who you are, what you sell and where you are.",
        ] },
        { type: "p", text: "A worthwhile extra: an llms.txt file, a recent proposal that summarizes your site in plain text so language models can read it easily. It isn't an official standard and doesn't replace the essentials above, but it's cheap to add." },
        { type: "h2", text: "Where to start" },
        { type: "p", text: "Start by understanding how your customers search for you, make sure your site loads fast and that every page has a clear purpose. Then publish useful content consistently. SEO isn't instant and takes ongoing work; its return depends on your market, your competition and how well your site turns visits into customers." },
        { type: "p", text: "Want to know how your site is doing today? Get in touch and we'll review it." },
      ],
    },
  },
];
