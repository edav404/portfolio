# Fase 1 · Informe 04 — SEO y contenido

Auditor: SEO + contenido (solo lectura). Criterio: skill `seo-optimizer` + documentación local de Next 16.4.6 (`node_modules/next/dist/docs/`).
Fecha: 2026-11-20. Rama: `fase/1-auditoria`.

## 0. Método y fuentes

- **Verificado en el código:** `app/**`, `components/**`, `content/*.ts`, `data/*.ts`, `next.config.ts`, `public/llms.txt`, `Dockerfile`, `docs/*.md`.
- **Verificado en el build:** HTML generado en `.next/server/app/*.html` y `sitemap.xml.body` (build local existente, no se ha recompilado). Ahí se comprobó lo que realmente sale en el `<head>`.
- **Verificado en la documentación de Next 16:**
  - `01-app/03-api-reference/04-functions/generate-metadata.md`: `alternates.languages`, `openGraph` y fusión superficial (*shallow merge*) de metadata.
  - `03-file-conventions/01-metadata/sitemap.md`: sitemap localizado con `alternates.languages`.
  - `05-config/01-next-config-js/redirects.md`: `permanent: true` → **308**, o `statusCode` explícito.
  - `03-file-conventions/route-groups.md`: varios root layouts.
  - `02-guides/internationalization.md` y `02-guides/json-ld.md`.
  - Tipos: `x-default` está admitido en `dist/lib/metadata/types/alternative-urls-types.d.ts`, y `openGraph.alternateLocale` existe.
- **No verificable:** la carpeta `WordPress/` está **vacía** (0 archivos; la exportación no está en disco). Tampoco aparece en el historial de git. El mapa de redirecciones de la sección 3 se basa en los slugs conservados en `content/posts.ts` y en las convenciones por defecto de WordPress, y **cada fila está marcada como suposición** hasta que se valide con Search Console o Wayback (procedimiento abajo). No hice consultas externas sobre el dominio.

Severidades: **crítico** bloquea la indexación o la posiciona mal; **importante**, señal incorrecta o pérdida de tráfico; **menor**, pulido.

---

## 1. Resumen de hallazgos

| ID | Sev. | Hallazgo | Fase | Esf. |
|---|---|---|---|---|
| SEO-01 | crítico | "/" se sirve sin contenido real: el HTML solo trae el selector | 5 | M |
| SEO-02 | importante | `og:url`, `og:title` y `og:description` de la home se heredan en todas las páginas | 3/7 | S |
| SEO-03 | importante | No hay imagen OG/Twitter en ninguna página salvo los proyectos | 7 | S |
| SEO-04 | importante | El sitemap lista URLs sin barra final, pero el canonical las lleva (redirección 308) | 2 | S |
| SEO-05 | importante | `lastModified` del sitemap falso (fecha del build / 1 de enero) | 7 | S |
| SEO-06 | importante | El blog existe en `content/posts.ts` pero no tiene ruta: las URLs antiguas de WordPress dan 404 | 3/7 | M |
| SEO-07 | importante | FAQPage plantillada y repetida en 13 páginas de proyecto | 2/7 | S |
| SEO-08 | importante | JSON-LD Person incompleto, sin `@id`, sin WebSite ni BreadcrumbList | 7 | S |
| SEO-09 | importante | No hay i18n: `html lang="es"` fijo, sin hreflang ni rutas EN | 3 | L |
| SEO-10 | importante | `llms.txt` desactualizado y escrito a mano (se desincroniza de `content/`) | 7 | S |
| SEO-11 | menor | `robots.ts`: `host` no estándar y `Disallow: /page/` heredado de WordPress | 7 | S |
| SEO-12 | menor | 404 hereda `canonical: /` (ya lleva `noindex`, pero la señal es contradictoria) | 7 | S |
| SEO-13 | menor | CreativeWork atribuye `creator` incluso en The Brant (rol de apoyo) | 4 | S |
| SEO-14 | menor | "Estado: Completado" fijo en el código del caso de estudio | 4 | S |
| CNT-01 | importante | Posicionamiento inconsistente: "diseño web" (UI) frente a "Full Stack y automatización" (content) | 3 | M |
| CNT-02 | importante | Cifras inconsistentes: "5+ años", "100% a la medida", 12 frente a 13 proyectos | 3 | S |
| CNT-03 | importante | `/sobre-mi` usa texto fijo en el código y no `profile.bio`; quedará desfasado en enero de 2027 | 3 | S |
| CNT-04 | importante | Servicios sin página propia (solo anclas `#slug`), así que no hay URL que posicionar por servicio | 5/7 | M |
| CNT-05 | menor | Meta descriptions cortas (65–123 caracteres) en proyectos y `/ahora`, `/servicios` | 7 | S |
| CNT-06 | menor | Títulos de los posts superan 60 caracteres con la plantilla | 7 | S |
| CNT-07 | menor | Enlazado interno pobre: proyecto ↔ servicio ↔ post | 5/7 | M |
| CNT-08 | menor | Revisar si el nombre del programa interno y del área de Nutresa están autorizados | 3 | S |
| CNT-09 | menor | `keywords` meta irrelevante para Google; `site.description` se reutiliza como og/twitter en todo el sitio | 7 | S |

---

## 2. SEO técnico actual (detalle)

### SEO-01 · crítico · "/" no expone contenido indexable
- **Evidencia:**
  - `components/portfolio-experience.tsx:38`: el estado inicial es `useState<ViewMode>("choice")` y `:57` renderiza solo `ExperienceGateway`.
  - El componente es `"use client"` y el SSR entrega únicamente el selector. Verificado en `.next/server/app/index.html`: el único `<h1>` es "¿Cómo quieres explorar el portafolio de Emmanuel?". La clase `hero-lead` de `StandardHome` aparece **0 veces**.
  - El texto de valor (hero, servicios, testimonios, proyectos destacados) solo existe tras un clic en el cliente.
- **Impacto:** la URL más fuerte del dominio se indexa como una pantalla de selección. No contiene "desarrollador web Medellín", ni proyectos, ni servicios en el HTML inicial. Hay riesgo de *soft-404* o de contenido escaso, y los asistentes de IA que no ejecutan JS ven una página vacía.
- **Fix (ver sección 4.4):** "/" debe renderizar en servidor la home clásica completa, y el selector pasa a ser un overlay o diálogo del cliente que solo aparece si no hay preferencia guardada (cookie). Nunca debe sustituir al contenido.

### SEO-02 · importante · Open Graph heredado incorrectamente
- **Evidencia:**
  - `app/layout.tsx:18-19` define `openGraph` y `twitter` en el root.
  - `app/proyectos/page.tsx:5`, `servicios/page.tsx:5`, `sobre-mi/page.tsx:5`, `ahora/page.tsx:6` y `contacto/page.tsx:6` no definen `openGraph`.
  - Como la metadata se fusiona de forma **superficial** (`generate-metadata.md`, sección "Merging"), heredan el objeto entero. Verificado en `.next/server/app/servicios.html`: `og:url="https://edav.com.co/"` y `og:title="Emmanuel Dávila — Desarrollo y diseño web"`. Lo mismo ocurre en `/proyectos/` y `/sobre-mi/`.
  - Al revés, `app/proyectos/[slug]/page.tsx:13` define su propio `openGraph` y **pierde** `siteName`, `locale`, `type` y `url`.
- **Impacto:** al compartir cualquier página aparece la tarjeta de la home. Además, `og:url` apunta a "/" y Facebook/LinkedIn agrupan todas las páginas bajo la misma URL.
- **Fix:** crear un helper `buildMetadata({ locale, path, title, description, image, type })` en `lib/seo.ts`. Debe devolver `title`, `description`, `alternates` (canonical + languages), `openGraph` completo (`url`, `siteName`, `locale`, `alternateLocale`, `type`, `images`) y `twitter`. Usarlo en todas las páginas.

### SEO-03 · importante · No hay imagen social por defecto
- **Evidencia:** no existen `app/opengraph-image.*` ni `twitter-image.*` (`git ls-files`). Además, `twitter.card: "summary_large_image"` está declarado sin imagen (`app/layout.tsx:19`).
- **Fix:** `app/opengraph-image.tsx` (ImageResponse, 1200×630, estética EDAV OS, texto "Emmanuel Dávila · Desarrollador web en Medellín"), con una variante EN bajo la ruta `/en`. En los proyectos, mantener la captura con `width`/`height`.

### SEO-04 · importante · Sitemap y canonical en desacuerdo con `trailingSlash`
- **Evidencia:**
  - `next.config.ts:17` tiene `trailingSlash: true`.
  - El canonical sale con barra: `https://edav.com.co/proyectos/` (verificado).
  - Sin embargo, `app/sitemap.ts:9` construye `${site.domain}${path}` sin barra. El `.next/server/app/sitemap.xml.body` contiene `<loc>https://edav.com.co/proyectos</loc>`, que responde 308 hacia `/proyectos/`.
- **Impacto:** Search Console reporta "Página con redirección" y el rastreo de las 19 URLs se desperdicia.
- **Fix:** un helper `absoluteUrl(path)` que siempre añada `/` final (salvo en archivos con extensión), usado en el sitemap, en `alternates`, en JSON-LD y en `llms.txt`.

### SEO-05 · importante · `lastModified` no fiable
- **Evidencia:** `app/sitemap.ts:9` usa `new Date()` para las páginas (cambia en cada build) y `${project.year}-01-01` para los proyectos, que es una fecha inventada.
- **Fix:** añadir `updated: "YYYY-MM-DD"` en `content/` (projects, services, profile) y usarlo. En los posts ya existe `updated`. Si no hay un dato real, omitir `lastModified`. Los campos `changeFrequency` y `priority` los ignora Google y se pueden quitar.

### SEO-06 · importante · El blog no está publicado
- **Evidencia:** `content/posts.ts:20-135` tiene 2 posts bilingües con slugs heredados de WordPress (`:22`, `:79`) y `published: "2024-05-24"`. No hay ninguna ruta `app/blog/**`, el sitemap no los incluye y el `Header` no enlaza al blog (`components/header.tsx`, array `links`).
- **Impacto:** las URLs antiguas que pudiera tener indexadas el WordPress dan 404 y se pierden sus señales. Además, se pierde el contenido con más intención informativa del sitio.
- **Fix:** crear `/blog/` y `/blog/[slug]/` (ES) y `/en/blog/` y `/en/blog/[slug]/` (EN) con `BlogPosting` JSON-LD (`datePublished`, `dateModified`, `author` → `#person`, `inLanguage`). Añadir las redirecciones 301 de la sección 3.

### SEO-07 · importante · FAQ plantillada en los proyectos
- **Evidencia:** `app/proyectos/[slug]/page.tsx:18-24` genera 3 preguntas automáticas por proyecto. La tercera ("¿Emmanuel desarrolla proyectos similares?") tiene **la misma respuesta en las 13 páginas**, y la segunda es solo la lista de tecnologías. Todo se emite como `FAQPage`.
- **Impacto:** son preguntas que nadie hace, con contenido duplicado entre páginas. Además, Google limita desde 2023 los resultados enriquecidos de FAQ a sitios gubernamentales y de salud con autoridad. Esto es conocimiento previo (anuncio de Google Search Central), no lo verifiqué aquí, así que el beneficio es nulo y el riesgo de parecer spam, real.
- **Fix:** quitar `FAQPage` y la sección FAQ de los proyectos. En su lugar, usar bloques reales: "Mi rol", "Resultado" (solo si es real y está autorizado) y "Servicios relacionados" con enlaces. En `/servicios`, las 4 FAQ (`app/servicios/page.tsx:7-12`) son razonables y visibles. Se puede conservar el schema, aunque no dará rich result. **No inventar FAQ nuevas.**

### SEO-08 · importante · Datos estructurados incompletos
- **Evidencia:**
  - `app/layout.tsx:25-29`: Person sin `@id`, `sameAs` (LinkedIn y GitHub están en `content/profile.ts:57-58`), `image`, `alumniOf`, `email` (público, `profile.ts:61`) ni `description`. `knowsAbout` está fijo en el código y desalineado con `skills`.
  - `app/page.tsx:6-13`: `ProfessionalService` sin `provider` ni `@id`.
  - No hay `WebSite`.
  - Las migas son visuales en `[slug]/page.tsx:25` pero no hay `BreadcrumbList`.
  - CreativeWork repite un Person anónimo.
- **Fix:** un único `@graph` en el layout por idioma:
  - `Person` (`@id: https://edav.com.co/#person`), con `name`, `alternateName: "edav"`, `jobTitle` (de `profile.headline[locale]`), `url`, `sameAs` [LinkedIn, GitHub], `alumniOf` (EducationalOrganization "Tecnológico de Antioquia"), `knowsAbout` (derivado de `skills`) y `address` (solo `addressLocality`/`addressCountry`; nunca dirección física).
  - `WebSite` (`@id: /#website`, `inLanguage`, `publisher: #person`).
  - `ProfessionalService` con `provider: #person`, `areaServed: ["CO","MX","US"]` y `availableLanguage: ["es","en"]`.
  - Por página: `BreadcrumbList`. En proyectos, `CreativeWork` con `creator`/`contributor` según la sección SEO-13. En posts, `BlogPosting`.
  - **No** marcar los testimonios como `Review`/`AggregateRating`: las reseñas sobre uno mismo no son elegibles y es una señal de riesgo.

### SEO-09 · importante · Sin infraestructura bilingüe
- **Evidencia:**
  - `app/layout.tsx:30` fija `<html lang="es">` y `:18` fija `locale: "es_CO"`.
  - No hay `alternates.languages` ni rutas `/en`.
  - Todo `data/*.ts` toma solo `.es`.
- **Fix:** ver sección 4.

### SEO-10 · importante · llms.txt desactualizado
- **Evidencia:** `public/llms.txt:1-20`. Describe "/" como "presentación, proyectos, servicios…" (falso hoy, ver SEO-01). No menciona automatización, Microsoft 365, el blog, el CV ni la versión EN. Tampoco usa el formato de enlaces `[título](url)` de llmstxt.org.
- **Fix:** ver sección 5. Generarlo desde `content/` con un route handler estático, como ya se hace con el CV.

### SEO-11 · menor · robots
- **Evidencia:** `app/robots.ts:7`: `host` solo lo entiende Yandex. `Disallow: /page/` es un vestigio de la paginación de WordPress y además impide que Google vea los 410/301 de esas URLs.
- **Fix:** `rules: { userAgent: "*", allow: "/", disallow: ["/api/"] }` + `sitemap`. Gestionar `/page/*` con redirecciones o 410 (sección 3). No bloquear `/os/` ni `/classic/` en robots: si se bloquean, Google no puede leer su canonical.

### SEO-12 · menor · 404
- **Evidencia:** `.next/server/app/_not-found.html` sale con `noindex` (bien) pero también con `<link rel="canonical" href="https://edav.com.co/">`, heredado del layout (`app/layout.tsx:17`).
- **Fix:** no definir `canonical` en el root layout. Ponerlo por página con el helper de SEO-02. La 404 es solo ES (`app/not-found.tsx:6`), así que con i18n hace falta una 404 por root layout o una 404 global bilingüe.

### SEO-13 · menor · Atribución en CreativeWork
- **Evidencia:** `app/proyectos/[slug]/page.tsx:23` usa `creator: Person` en todos los casos. En `content/projects.ts`, The Brant tiene `myRole` "Apoyo en diseño y desarrollo web". Motila es de lmilo (`docs/contenido.md:32`).
- **Fix:** mapear `ownership`:
  - `client` → `creator: #person` y `sourceOrganization`/`funder` = cliente (o solo `about`).
  - `collaboration` → `contributor: #person` y `creator: lmilo`.
  - `co-created` → `creator: [ ... ]`.
  - The Brant → `contributor`.

  Esto refuerza E-E-A-T (honestidad en los créditos).

### SEO-14 · menor · Estado fijo
- **Evidencia:** `app/proyectos/[slug]/page.tsx:25`, `<span className="status-inline">Completado</span>`, cuando `content/projects.ts:16` define `status`. Cuando entren los personales ("in-development"), mostrará información falsa.
- **Fix:** usar `statusLabel[project.status][locale]`.

### Redirecciones `.php` actuales
- `next.config.ts:25-29` reescribe (no redirige) `/api/lastfm.php` y `/api/contact.php`. Para SEO es neutral: `/api/` está en `Disallow`. Recomendación: mantener la reescritura hasta confirmar en los logs de Traefik que nadie las usa, y quitarla en la Fase 8.

### URLs y `trailingSlash`
- `trailingSlash: true` es coherente y los canonicals ya salen con barra. Mantenerlo y alinear el sitemap (SEO-04), los enlaces internos y el `llms.txt`.
- Rutas con extensión (`/cv/*.pdf`, `/llms.txt`): sirven bien hoy, porque `robots.txt` y `sitemap.xml` responden. Verificar con `curl -I` en la Fase 7 que `/llms-full.txt` no se redirige a `/llms-full.txt/`.
- Los PDF del CV son indexables y contienen el teléfono. Es aceptable porque es público por decisión del usuario (`docs/contenido.md:23`). Como opción, enviar `X-Robots-Tag: noindex` en `/cv/*` para que el PDF no le quite posiciones a `/sobre-mi/`.

---

## 3. SEO del antiguo WordPress → mapa de redirecciones 301

**Hecho:** `WordPress/` está vacía, así que no pude leer la exportación. Los únicos rastros verificables son:
- los slugs de los 2 posts, conservados en `content/posts.ts:22,79` con `published: 2024-05-24`;
- `Disallow: /page/` en `app/robots.ts:7`.

**Antes de implementar (Fase 7/8), obtener la lista real** desde cualquiera de estas fuentes:
1. Search Console → Indexación → Páginas, y Rendimiento → Páginas (exportar los últimos 16 meses).
2. Wayback CDX, consultado por el propio usuario en su navegador: `https://web.archive.org/cdx/search/cdx?url=edav.com.co/*&output=txt&fl=original,statuscode&collapse=urlkey`.
3. Si aparece la exportación (`.xml` WXR), las etiquetas `<link>` y `<wp:post_name>` de cada `<item>`.

**Mapa propuesto** (Next `redirects()`, `permanent: true` → 308, que Google trata como 301; si se exige 301 literal, usar `statusCode: 301`. Ambos están documentados en `redirects.md:30,351`):

| Origen (WordPress, **suposición** salvo nota) | Destino | Tipo |
|---|---|---|
| `/para-que-una-pagina-web-para-mi-negocio/` (slug verificado; prefijo supuesto `/%postname%/`) | `/blog/para-que-una-pagina-web-para-mi-negocio/` | 308/301 |
| `/como-el-seo-puede-ayudar-a-tu-negocio-a-crecer/` (slug verificado; prefijo supuesto) | `/blog/como-el-seo-puede-ayudar-a-tu-negocio-a-crecer/` | 308/301 |
| `/2024/05/24/:slug/` o `/2024/05/:slug/` (si los permalinks eran por fecha) | `/blog/:slug/` | 308/301 |
| `/blog/page/:n/`, `/page/:n/` | `/blog/` | 308 |
| `/category/:x/`, `/tag/:x/`, `/author/:x/` | `/blog/` | 308 |
| `/feed/`, `/comments/feed/`, `/:slug/feed/` | `/blog/` (o un RSS nuevo `/blog/rss.xml` si se crea) | 308 |
| `/portafolio/`, `/portfolio/`, `/proyecto/:slug/`, `/portfolio/:slug/` | `/proyectos/` o `/proyectos/:slug/` si el slug coincide | 308 |
| `/sobre-mi/`, `/servicios/`, `/contacto/` | (probablemente iguales; no requieren redirección) | — |
| `/acerca-de/`, `/about/`, `/quien-soy/` | `/sobre-mi/` | 308 |
| `/tienda/`, `/carrito/`, `/checkout/`, `/mi-cuenta/` (si hubo WooCommerce propio) | `/` | 308 o 410 |
| `/wp-admin/*`, `/wp-login.php`, `/xmlrpc.php`, `/wp-json/*` | 410 (route handler o proxy) | 410 |
| `/wp-content/uploads/*` (imágenes indexadas en Google Imágenes) | 410, o 308 a la imagen equivalente en `/images/` si existe | 410/308 |
| `/?p=:id`, `/?page_id=:id` | destino del ID (usar `has: [{type:"query",key:"p"}]`) | 308 |

**Reglas:**
- Ningún 301 masivo a "/" (Google lo trata como soft-404); usar 410 para lo que no tiene equivalente.
- Mantener las redirecciones al menos 12 meses.
- Implementar en `next.config.ts` → `redirects()` y, para los 410, un `proxy.ts` o route handlers.
- Las redirecciones de WordPress van **solo a la versión ES**, porque WordPress estaba en español (suposición).

---

## 4. Plan bilingüe

### 4.1 Estrategia de URLs (recomendada)
- ES es la versión principal y va **sin prefijo**. EN va bajo `/en/`, con **slugs de sección traducidos**.
- No hay redirección automática por `Accept-Language`: Googlebot rastrea sin ese encabezado o desde EE. UU. y dejaría de ver el ES. A cambio, un aviso discreto del tipo "View in English" en el cliente.

| ES (x-default) | EN |
|---|---|
| `/` | `/en/` |
| `/proyectos/` | `/en/projects/` |
| `/proyectos/[slug]/` | `/en/projects/[slug]/` (mismo slug) |
| `/servicios/` | `/en/services/` |
| `/servicios/[slug]/` (nuevo, CNT-04) | `/en/services/[slug-en]/` → `Service.slug` debe pasar a `L` |
| `/sobre-mi/` | `/en/about/` |
| `/blog/` | `/en/blog/` |
| `/blog/[posts.slug.es]/` | `/en/blog/[posts.slug.en]/` |
| `/ahora/` | `/en/now/` |
| `/contacto/` | `/en/contact/` |
| `/cv/emmanuel-davila-cv-es.pdf` | `/cv/emmanuel-davila-cv-en.pdf` |
| `/os/`, `/classic/` | `/en/os/`, `/en/classic/` (ver 4.3) |

**Implementación en Next 16** (según la documentación local): dos root layouts con route groups, `app/(es)/layout.tsx` con `<html lang="es">` y `app/(en)/en/layout.tsx` con `<html lang="en">` (`route-groups.md:25-32`). Así no se necesita un proxy y cada idioma tiene su `lang` correcto en el HTML del servidor.
- Coste: cambiar de idioma recarga la página completa (`route-groups.md:30`), lo cual es aceptable.
- La alternativa `app/[lang]` (`internationalization.md:74-96`) obliga a reescribir ES sin prefijo mediante proxy y a mapear los slugs traducidos. Es más compleja.
- Una tabla `routes: Record<RouteId, L<string>>` en `content/routes.ts` resuelve el par ES↔EN de cada página. Es la fuente única para el canonical, el hreflang, el sitemap, el selector de idioma y `llms.txt`.

### 4.2 hreflang, canonical y Open Graph
- En cada página: `alternates: { canonical: <self>, languages: { es: <es>, en: <en>, "x-default": <es> } }`. `x-default` está admitido en los tipos (`alternative-urls-types.d.ts:2`).
- Usar `es` y `en` sin región: el contenido sirve a todo el mundo hispanohablante y angloparlante.
- Cada versión es **canonical de sí misma**. Nunca hay canonical cruzado entre idiomas.
- Sitemap con `alternates.languages` en cada entrada, una por URL e idioma (`sitemap.md:211-250`).
- `openGraph.locale`: `es_CO` / `en_US`, con `alternateLocale` recíproco (`opengraph-types.d.ts:14`).
- Si una traducción no existe, omitirla de `languages` (no apuntar a 404). Hoy todo `content/` tiene ES y EN.

### 4.3 /os frente a /classic sin contenido duplicado
Principio: **la experiencia es una preferencia de presentación, no una dimensión de URL**. El contenido vive en URLs únicas (`/proyectos/x/`, `/servicios/`, `/blog/x/`…) que ambos modos comparten.
- **Preferencia en cookie** (`edav-view=os|classic`), no en `localStorage` (hoy se usa `portfolio-experience.tsx:52`). Así el servidor renderiza el modo correcto sin parpadeo.
- **Sin cookie** (visitantes nuevos y Googlebot), se renderiza el **modo clásico**. Ambos modos deben contener el mismo texto principal en el HTML del servidor, para que no sea *cloaking*.
- **`/classic/`**: fija la cookie y muestra la home clásica. Canonical → `/` (idéntico contenido). Fuera del sitemap.
- **`/os/`**: fija la cookie y abre el escritorio. Canonical → `/`, con `robots: { index: false, follow: true }` como refuerzo. El DOM del SO es distinto y Google puede ignorar un canonical si el contenido difiere, por eso conviene el `noindex`. Fuera del sitemap.
- **`/proyectos/[slug]/` en modo OS** (Fase 4): la misma URL hace SSR del artículo completo (H1, texto, migas). Si la cookie es `os`, el SO hidrata y lo abre como ventana. El canonical siempre es la URL limpia.
- **Por qué canonical al clásico/"/":** HTML semántico, LCP rápido, accesible, enlaces rastreables y texto en el DOM inicial. El SO depende de JS y de ventanas.
- `?view=standard` (`portfolio-experience.tsx:43,53`): se puede eliminar al pasar a la cookie. Mientras exista, el canonical "/" ya lo cubre.

### 4.4 El selector en "/" sin pantalla vacía
- "/" hace SSR de la **home clásica completa**:
  - H1 con la palabra clave: "Emmanuel Dávila — desarrollador web y de automatización en Medellín".
  - Intro de 2–3 frases tomada de `profile.tagline`.
  - Servicios con enlaces, 6 proyectos destacados con enlaces, testimonios y CTA.
- El selector estilo arranque XP es un **diálogo superpuesto en el cliente**. Solo aparece si no hay cookie y no aparece para bots, porque se monta en `useEffect`. Al elegir, guarda la cookie y, si se elige OS, monta el escritorio encima.
- Si se quiere el selector en el SSR por estética, renderizarlo como `<dialog>` o `aside` **después** del contenido, con el H1 real en el `<main>`. El H1 de la página no debe ser la pregunta "¿Cómo quieres explorar…?".
- Mantener el `Header` y el `Footer` con los enlaces en el SSR. Ya lo hacen, porque son SSR del layout.

---

## 5. llms.txt y llms-full.txt bilingües

Implementación:
- Route handlers `app/llms.txt/route.ts` y `app/llms-full.txt/route.ts` con `dynamic = "force-static"`, siguiendo el patrón de `app/cv/[file]/route.ts:8`. Generan el texto desde `content/*.ts` y `content/routes.ts`.
- Eliminar `public/llms.txt`, porque entraría en conflicto con la ruta.
- `Content-Type: text/plain; charset=utf-8`.
- Formato llmstxt.org: H1, blockquote, H2 con listas `- [Título](URL): nota`, y sección `## Optional`.

### 5.1 `/llms.txt` (índice; ES primero y luego EN; URLs absolutas con barra final)
```markdown
# Emmanuel Dávila (edav) — Portafolio EDAV OS

> Desarrollador Full Stack y de automatización en Medellín, Colombia. Sitios a la medida (Next.js, React, TypeScript), WordPress/WooCommerce, Shopify y automatización de procesos (Power Platform, n8n). Sitio bilingüe: español (principal) e inglés.

Contenido en español en https://edav.com.co/ · English version at https://edav.com.co/en/

## Perfil
- [Sobre mí](https://edav.com.co/sobre-mi/): {profile.tagline.es}
- [CV en PDF (ES)](https://edav.com.co/cv/emmanuel-davila-cv-es.pdf): experiencia, formación y habilidades.

## Servicios
- [Desarrollo web](https://edav.com.co/servicios/desarrollo-web/): {services[0].kicker.es}
- [Automatización de procesos](https://edav.com.co/servicios/automatizacion/): …
- [WordPress y WooCommerce](…), [Shopify](…), [Diseño web y UX/UI](…)

## Proyectos
- [Vaulto](https://edav.com.co/proyectos/vaulto/): {summary.es} (cocreado con lmilo)
- … (uno por proyecto: título, summary.es y relación/créditos según ownership)

## Blog
- [{posts[i].title.es}](https://edav.com.co/blog/{slug.es}/): {description.es}

## English
- [About](https://edav.com.co/en/about/) · [Services](https://edav.com.co/en/services/) · [Projects](https://edav.com.co/en/projects/) · [Blog](https://edav.com.co/en/blog/) · [CV (EN)](https://edav.com.co/cv/emmanuel-davila-cv-en.pdf)

## Contacto
- [Formulario](https://edav.com.co/contacto/) · Correo: contacto@edav.com.co · [LinkedIn](https://www.linkedin.com/in/edav404) · [GitHub](https://github.com/edav404)

## Optional
- [Versión completa en texto](https://edav.com.co/llms-full.txt)
- [Ahora](https://edav.com.co/ahora/): música reciente (Last.fm) y foco actual.
- Uso: se permite citar descripciones breves con atribución a Emmanuel Dávila y enlace a https://edav.com.co/.
```

### 5.2 `/llms-full.txt` (contenido completo; dos bloques de idioma completos)
1. `# Emmanuel Dávila — llms-full (ES)`, seguido de:
   - Perfil: `headline`, `bio[]` y `focus[]`.
   - Experiencia: `experience[]` con `role`, fechas, `summary` y **solo los `cvHighlights`** (mismo criterio de confidencialidad que el CV).
   - Formación: `education[]`.
   - Habilidades: `skillGroups`.
   - Servicios: `title`, `description`, `includes` y `stack`.
   - Proyectos: `title`, `kind`, `ownership` + créditos, `status`, `year`, `client`, `location`, `summary`, `challenge`, `solution`, `myRole`, `technologies` y URL.
   - Blog: `body` convertido a Markdown.
   - Testimonios: citas literales con el nombre del cliente.
2. `# Emmanuel Dávila — llms-full (EN)`: lo mismo con `.en`. Los testimonios se marcan "(translated from Spanish)" según `translatedFrom`.
3. Encabezado con "Última actualización: {fecha del build}" y la URL canónica de cada sección.

En `/sobre-mi/` (o en el `<head>` con `alternates.types`), enlazar `llms.txt` como `rel="alternate" type="text/plain"` es opcional.

---

## 6. Contenido

### Palabras clave objetivo
**Suposición:** no hay datos de volumen; validar con Search Console o Keyword Planner.

| Página | ES (principal) | EN |
|---|---|---|
| `/` | desarrollador web en Medellín · desarrollador Full Stack Colombia · Emmanuel Dávila | freelance web developer Colombia · full-stack developer Medellín |
| `/servicios/desarrollo-web/` | desarrollo web a la medida Medellín · desarrollador Next.js Colombia | Next.js developer Latin America · custom website developer |
| `/servicios/automatizacion/` | automatización de procesos Medellín · Power Automate / Power Apps consultor · automatización con n8n | process automation developer · n8n automation · Power Platform developer |
| `/servicios/wordpress/` | desarrollo WordPress Medellín · tienda WooCommerce Colombia | WordPress WooCommerce developer Colombia |
| `/servicios/shopify/` | desarrollador Shopify Colombia · secciones Liquid | Shopify developer Colombia · Shopify Liquid sections |
| `/servicios/diseno-web/` | diseño web y UX/UI Medellín | web design UX/UI Colombia |
| `/blog/*` | ¿para qué una página web para mi negocio? · SEO para negocios con IA | why a business needs a website · SEO in the AI era |

### CNT-01 · importante · Posicionamiento inconsistente
- **Evidencia:**
  - `content/profile.ts:9-10`: "Desarrollador Full Stack y de automatización". `profile.ts:17-20`: seoDescription con automatización.
  - En cambio, el título del root es "Desarrollo y diseño web" (`app/layout.tsx:11,18,19`).
  - `keywords` no incluye automatización (`:16`).
  - Hero: "desarrollador web Full Stack y diseñador web" (`components/standard-home.tsx:17`).
  - `/sobre-mi` dice "Full Stack + Diseño web" (`app/sobre-mi/page.tsx:8`).
  - `/ahora` sí menciona la automatización.
- **Fix:** derivar todo de `profile` y unificar. Título de la home ES, 55 caracteres: "Desarrollador web y de automatización en Medellín | edav". EN: "Web & Automation Developer in Medellín, Colombia | edav". Ajustar el template a `%s | Emmanuel Dávila` solo cuando quepa (≤60).

### CNT-02 · importante · Cifras inconsistentes o no defendibles
- **Evidencia:**
  - `components/standard-home.tsx:19` dice "5+ años creando para la web", pero `content/experience.ts` sitúa el primer rol web en 2022-08 (Nora Data) y el freelance en 2023, es decir, unos 4 años.
  - "100% hecho a la medida" contradice el uso de temas WordPress/Shopify.
  - "13+ proyectos documentados" y `:44` "Ver los 13 proyectos", frente a `profile.stats` "12 proyectos web para clientes" (`profile.ts:64`). Son 13 con portada (12 clientes + CiviCoin) y 17 en total en `content/projects.ts`.
- **Impacto:** las cifras incoherentes dañan la confianza (Trust en E-E-A-T).
- **Fix:** derivar las cifras de `content/` (`projects.filter(kind==="client").length`, año de inicio desde `experience`) y quitar las afirmaciones absolutas.

### CNT-03 · importante · `/sobre-mi` no usa `content/`
- **Evidencia:** `app/sobre-mi/page.tsx:8` tiene el texto fijo en el código ("Estudio Tecnología en Sistemas…, realizo mis prácticas institucionales en Servicios Nutresa"), distinto de `profile.bio` (`profile.ts:22-35`). No muestra la experiencia (`experience.ts`), la formación, el enlace al CV ni LinkedIn/GitHub. La práctica termina el 2026-12-31 (`experience.ts:27-28`), así que el texto en presente quedará falso en enero de 2027.
- **Fix:** que `/sobre-mi/` renderice `bio`, la línea de tiempo `experience`, `education`, `skillGroups`, los enlaces al CV ES/EN y `sameAs`. Es la página E-E-A-T principal: autor real, formación verificable y experiencia con logros.

### CNT-04 · importante · Servicios sin URL propia
- **Evidencia:** `app/servicios/page.tsx:16` muestra todos los servicios en una sola página con `id={service.slug}`. La home enlaza a `/servicios#slug` (`standard-home.tsx:49`). La automatización, que es el diferenciador, no tiene página propia.
- **Fix:** crear `/servicios/[slug]/` (y su equivalente EN) con 400–800 palabras reales:
  - Problema que resuelve y proceso.
  - Qué incluye (`includes`) y stack.
  - **Proyectos relacionados** (cruce por `technologies`/`category`).
  - FAQ visibles solo si son reales.
  - CTA a `/contacto/?servicio=slug`.

  En automatización, usar como prueba el bot de recordatorios y la experiencia en Microsoft 365, redactada como en el CV y sin datos internos.

### CNT-05 · menor · Meta descriptions
- **Evidencia** (medido con node sobre `content/`):
  - Summaries de proyectos usados como description: ES de 85 a 123 caracteres (erth-wellness 85, big-vapers 93) y EN de 65 a 119 (erth-wellness 65, tech-byte 74).
  - `/ahora` 65 (`app/ahora/page.tsx:6`), `/servicios` 98, `/contacto` 109.
  - La home ES/EN tiene 143/142, que es correcto.
- **Fix:** añadir `seoDescription: L` opcional en `Project`/`Service` (140–160 caracteres) con tipo de proyecto + tecnología + ubicación + rol. Ejemplo: "Tienda WooCommerce para Vape and Friends (Colombia): catálogo mayorista y minorista, diseño responsive y edición sencilla. Caso de estudio de Emmanuel Dávila."

### CNT-06 · menor · Títulos de posts largos
- **Evidencia:** los títulos ES miden 45 y 56 caracteres (`posts.ts:23,80`). Con " | Emmanuel Dávila" (18) quedan en 63 y 74.
- **Fix:** en posts, usar el template corto " | edav" o un `seoTitle` opcional. El slug del post 2 no coincide con su título actual: se conserva a propósito para no romper la URL antigua, y es correcto.

### CNT-07 · menor · Enlazado interno
- **Estado actual:**
  - Los proyectos solo enlazan a `/contacto` (`[slug]/page.tsx:25`).
  - No hay proyecto anterior/siguiente ni servicios relacionados.
  - Los posts no existen como páginas.
  - El footer no enlaza a sobre-mí, al blog ni a la versión EN (`components/footer.tsx:12-16`).
- **Fix:**
  - Proyecto → 1–2 servicios + 2 proyectos relacionados.
  - Servicio → proyectos y post relacionado.
  - Post → servicio (ej. el post SEO → `/servicios/desarrollo-web/`) + `/contacto/`.
  - Footer con todas las secciones y el selector ES/EN.
  - Anclas descriptivas en lugar de "Abrir caso de estudio" genérico. Basta con añadir el nombre del proyecto en el texto visible o en el aria.

### CNT-08 · menor · Confidencialidad (verificación, no publicar más)
- **Evidencia:** `content/experience.ts:30-31` cita el nombre del programa interno de migración y el área de base. `:37-45` incluye cifras de alcance. `docs/contenido.md:39-51` indica que la redacción sigue el estilo de un CV y que está confirmada.
- **Fix:** confirmar que el nombre del programa interno está autorizado. Si hay duda, sustituirlo por "programa de migración a Microsoft 365". **No** llevar estos detalles a `llms-full.txt` más allá de los `cvHighlights`, ni añadir resultados de negocio.

### CNT-09 · menor · Meta keywords y descripción global
- `keywords` (`app/layout.tsx:16`) no tiene efecto en Google. Se puede mantener sin coste o quitar.
- `site.description` se usa como og/twitter description en páginas que no son la home (SEO-02).

### Consistencia ES/EN (revisada)
- `content/*.ts` está completo en ES y EN en todos los campos `L`. Las traducciones son naturales, no literales. Los testimonios se marcan como traducción (`services.ts`, `translatedFrom`), lo que es correcto.
- Diferencias menores: el primer párrafo de la bio EN reordena la formación (`profile.ts:30` frente a `:24`) sin cambiar los hechos. Los summaries EN son más cortos que los ES (CNT-05).
- Toda la UI (`components/*`, `app/*`) es solo ES y tiene texto fijo en el código. Para la Fase 3 hace falta un diccionario de interfaz `content/ui.ts` con `L` (navegación, CTA, 404, selector, migas, "Caso de estudio").

### E-E-A-T (resumen de acciones)
1. Página de autor real (`/sobre-mi/`) con experiencia, formación, CV y `sameAs` (CNT-03, SEO-08).
2. Byline y fechas en los posts (`published`/`updated` ya existen en `posts.ts:28-29`) con enlace al autor.
3. Créditos honestos en los proyectos (SEO-13, badges de la Fase 4) y rol explícito (`myRole`).
4. Testimonios con nombre de marca y logo (ya existen), sin schema `Review`.
5. Cifras derivadas de datos (CNT-02).
6. Ningún dato confidencial de Nutresa más allá de lo ya redactado como CV.

---

## 7. Orden sugerido por fase

- **Fase 2:**
  - SEO-04: barra final en el sitemap.
  - SEO-07: quitar la FAQPage de los proyectos.
  - SEO-11: limpiar robots.
- **Fase 3:**
  - `content/routes.ts` + root layouts ES/EN (SEO-09).
  - Helper `buildMetadata` (SEO-02, SEO-12).
  - `content/ui.ts`.
  - CNT-01, CNT-02, CNT-03.
  - `Service.slug` → `L`.
- **Fase 4:**
  - SSR del caso de estudio también en modo OS (4.3).
  - SEO-13, SEO-14.
  - Proyectos personales en el sitemap cuando tengan página.
- **Fase 5:**
  - SEO-01 / 4.4: SSR de la home clásica y selector como overlay.
  - Cookie de preferencia.
  - Canonical y noindex en `/os/` y `/classic/`.
  - CNT-04: páginas de servicio.
- **Fase 7:**
  - SEO-03 (OG image), SEO-05 (lastmod), SEO-06 (blog), SEO-08 (`@graph`) y SEO-10 (`llms*.txt`).
  - CNT-05, CNT-06, CNT-07.
  - Validar con Rich Results Test y la inspección de URL de Search Console.
- **Fase 8:**
  - Redirecciones de WordPress (sección 3) validadas con Search Console o Wayback.
  - Retirar los rewrites `.php` si los logs lo permiten.
  - Enviar el sitemap a Search Console y Bing Webmaster.
