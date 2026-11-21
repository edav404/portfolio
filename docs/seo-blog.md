# Auditoría SEO del blog (Fase 2 · SEO-06, decisión 3)

Fecha: 2026-11-21. Autor de los artículos: **Emmanuel Dávila** (Desarrollador Full Stack y de automatización).
Fuente del contenido: `content/posts.ts` (ES y EN). Rutas: `/blog/` y `/blog/<slug-es>/` (la versión EN, `/en/blog/<slug-en>/`, llega en la Fase 3).

Criterios: intención de búsqueda, keyword en título/H1/primer párrafo/meta, títulos ≤ 60 caracteres con sufijo, descripciones de 140–160, jerarquía H1 → H2, enlazado interno, afirmaciones verificables y E-E-A-T. No se inventan cifras: toda la experiencia citada sale de `content/profile.ts`, `content/experience.ts`, `content/projects.ts` y `content/services.ts`.

Las keywords son propuestas editoriales, no datos de volumen: no se consultó ninguna herramienta de keywords. Validarlas con Search Console tras publicar.

## Cambios comunes

- Campo nuevo `seoTitle` (≤ 53 caracteres). La página lo publica como `<seoTitle> | edav` (≤ 60, CNT-06). El H1 sigue siendo `title`.
- `updated` pasa a `2026-11-21` en los dos posts, que es la fecha real de esta revisión. `published` se mantiene en `2024-05-24` (WordPress).
- Enlaces en línea con la sintaxis `[texto](/ruta/)`. Las rutas se escriben en ES también en el cuerpo EN; en la Fase 3 el renderizador EN las traduce con `content/routes.ts`.
- Byline visible con enlace a `/sobre-mi/` (`rel="author"`), fechas de publicación y actualización con `<time>`, y JSON-LD `BlogPosting` (`author` → `#person`, `datePublished`, `dateModified`, `inLanguage`).
- Párrafo de experiencia propia en cada artículo (la "E" de E-E-A-T), redactado solo con hechos del contenido existente.

---

## 1. ¿Para qué necesita tu negocio una página web?

`/blog/para-que-una-pagina-web-para-mi-negocio/` · EN: `why-your-business-needs-a-website`

| Aspecto | Antes | Después |
|---|---|---|
| Intención | Informativa con fase comercial: un dueño de negocio que vende por redes y duda si invertir en web | Igual. Se refuerza la parte comercial con "cómo elegir" |
| Keyword principal ES | (implícita) | **página web para tu negocio** |
| Secundarias ES | — | para qué sirve una página web, beneficios de una página web, WordPress o Shopify, página web vs redes sociales, desarrollo web a la medida |
| Keyword principal EN | — | **why your business needs a website** |
| Secundarias EN | — | business website benefits, WordPress vs Shopify vs custom, website vs social media |
| Title (SERP) | "¿Para qué necesita tu negocio una página web? \| Emmanuel Dávila" (63) | "Página web para tu negocio: beneficios y cómo elegir \| edav" (59) · EN "Why your business needs a website and how to choose \| edav" (58) |
| Meta description | 160 / 145 | 159 / 150, con la keyword al inicio y la mención de automatización |
| Encabezados | H1 + 3 H2 | H1 + 3 H2. El primero pasa a "Para qué sirve una página web en tu negocio" (keyword); el último, a "¿WordPress, Shopify o desarrollo a la medida?" |
| Enlazado interno | Ninguno | Post de SEO, `/servicios/#wordpress`, `#shopify`, `#desarrollo-web`, `#automatizacion`, `/proyectos/green-holds-shopify/`, `/proyectos/vape-friends/` y `/contacto/` |

**Afirmaciones revisadas**
- "Un sitio propio te da mucho más control" → se concreta: contenido, dominio y datos, y se aclara que no reemplaza las redes.
- "Un sitio lento pierde visitas y posiciones" → se suaviza: la gente se va antes de ver la oferta, y la experiencia de página "también cuenta" para los buscadores. No se afirma un efecto directo en el ranking.
- "en 2026" en la meta → se quita: fecha el texto sin aportar nada.
- "Buena parte de las visitas llega desde el celular" → se mantiene cualitativa, sin porcentaje inventado.
- Shopify: se añade el hecho verificable de que es una suscripción mensual con pagos, inventario y envíos integrados.

**Mejoras aplicadas**
- Párrafo de experiencia: sitios y tiendas en WordPress, WooCommerce y Shopify para marcas de Colombia, México y EE. UU. (de `profile.bio`), más desarrollo a la medida y automatización.
- Beneficio nuevo, alineado con el posicionamiento: "Procesos que se hacen solos" (formularios que alimentan el correo o una hoja de cálculo, bots de recordatorio). Sin cifras de ahorro.
- La comparación pasa de párrafo a lista con un enlace por opción y un caso real (Vape & Friends para WooCommerce, Green Holds Shopify para la autonomía editorial, según `projects.ts`).

## 2. Cómo puede ayudar el SEO a tu negocio en la era de la IA

`/blog/como-el-seo-puede-ayudar-a-tu-negocio-a-crecer/` · EN: `how-seo-helps-your-business-grow`

El slug ES no coincide con el título: se conserva a propósito porque es la URL de WordPress.

| Aspecto | Antes | Después |
|---|---|---|
| Intención | Informativa: qué es el SEO y si sigue sirviendo con la IA | Igual. Se añade el paso práctico "por dónde empezar" |
| Keyword principal ES | — | **SEO para tu negocio** |
| Secundarias ES | — | qué es el SEO, SEO e inteligencia artificial, SEO para pymes, llms.txt, datos estructurados, Core Web Vitals |
| Keyword principal EN | — | **SEO for your business** (variante: SEO for small business) |
| Secundarias EN | — | SEO in the AI era, how SEO helps a business grow, llms.txt, structured data |
| Title (SERP) | "Cómo puede ayudar el SEO a tu negocio en la era de la IA \| Emmanuel Dávila" (74) | "SEO para tu negocio en la era de la IA: cómo empezar \| edav" (59) · EN "SEO for your business in the AI era: where to start \| edav" (58) |
| Meta description | 155 / 156 | 157 / 147 |
| Encabezados | H1 + 3 H2 (lo de IA estaba como viñeta y párrafo sueltos) | H1 + 4 H2: "Por qué sigue importando el SEO", **"Qué cambia con la inteligencia artificial"** (sección nueva que agrupa el contenido sobre IA y llms.txt), "Lo básico que debe tener tu sitio" y "Por dónde empezar" |
| Enlazado interno | Ninguno | `/proyectos/green-holds/`, post 1, `/servicios/#desarrollo-web` y `/contacto/` |

**Afirmaciones revisadas**
- Asistentes "que leen la web para responder" → "que pueden consultar la web": no todos lo hacen siempre.
- "Más visitas cualificadas significan más contactos" → condicional: solo si llegan con intención y el sitio facilita el contacto.
- "El contenido bien posicionado sigue trayendo visitas" → "puede seguir".
- llms.txt "propuesta reciente" → fechada: "propuesta de 2024". Además: no es un estándar oficial y no hay garantía de que buscadores o asistentes lo usen.
- Core Web Vitals: se precisa que son la forma en que Google mide la velocidad y la experiencia.
- Se mantiene "Un buen SEO no garantiza aparecer en sus respuestas".

**Mejoras aplicadas**
- Párrafo de experiencia: entre 2022 y 2023 administró el sitio WordPress de Green Holds e hizo mejoras de SEO y contenido (`experience.ts`, Nora Data), y el SEO técnico forma parte de sus desarrollos (`services.ts`, "SEO técnico").
- CTA final enlazado al servicio que incluye el SEO técnico.

---

## Pendientes

- **Fase 3:** rutas `/en/blog/` y `/en/blog/<slug-en>/` con `hreflang`; traducir los `href` ES del cuerpo con `content/routes.ts`; enlace al blog en el header y el footer (archivos compartidos, fuera de este alcance).
- **Fase 7:** imagen OG por post (hoy no hay imagen social); `Person` con `@id: /#person` en el layout para que la referencia del `BlogPosting` resuelva (SEO-08); `BreadcrumbList`; posts en `llms.txt`/`llms-full.txt`; "post relacionado" desde `/servicios/` (CNT-07).
- Validar las keywords y la intención con Search Console tras 4–8 semanas.
