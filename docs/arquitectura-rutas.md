# Arquitectura de rutas e i18n (Fase 3)

Diseño del arquitecto de rutas (rama `fase/3-arquitectura-i18n`, Next.js 16.4.6, App Router).
Citas a la documentación de Next relativas a `node_modules/next/dist/docs/01-app/`.

## 0. Decisiones

| # | Decisión | Respaldo |
|---|---|---|
| D1 | **Dos layouts raíz por idioma con route groups**: `app/(es)/layout.tsx` (`<html lang="es">`) y `app/(en)/en/layout.tsx` (`<html lang="en">`). Sin `app/[lang]`. | `03-api-reference/03-file-conventions/route-groups.md` ("multiple root layouts"); `layout.md` §Root Layout |
| D2 | **Slugs traducidos = carpetas reales** (`(en)/en/(site)/projects/`, `about/`, `now/`…): una URL, un archivo, sin rewrites. | `route-groups.md` |
| D3 | **Sin `proxy.ts`** en la Fase 3 ni después: ninguna URL pública redirige por `Accept-Language` ni cookie. | `02-guides/cdn-caching.md`; auditoría §6 (Codex) |
| D4 | **`data-theme` en el wrapper del layout anidado**, no en `<html>`: `(site)` → `classic`, `os` → `xp`; base en `:root`. Temas nunca anidados. | UI-02; `not-found.md` |
| D5 | **Solo se cruza de layout raíz al cambiar de idioma.** Público ↔ `/os` comparte layout raíz (navegación suave). | `route-groups.md` §Caveats; `layout.md` |
| D6 | **Todo lo público es SSG**: `generateStaticParams` + `dynamicParams = false`. Dinámicos solo `api/*` y el catch-all 404. | `dynamicParams.md`; `generate-static-params.md` |
| D7 | **`content/routes.ts` es la fuente única** de canonical, hreflang, sitemap, selector de idioma, enlaces internos y `llms.txt`. Código puro, usable en cliente. | anexo 04 §4.1 |
| D8 | **`buildMetadata` devuelve siempre el `openGraph` completo** (la metadata se fusiona en superficie). El layout raíz no define `canonical` ni `openGraph`. | `generate-metadata.md` §Merging |
| D9 | **Hreflang en `<head>` y alternates en el sitemap entran en la Fase 3** con las URLs EN; la Fase 7 verifica y añade `lastModified`. | `01-metadata/sitemap.md` |

**Descartado: `app/[lang]` + `proxy.ts`.** ES sin prefijo obliga a reescribir todas las peticiones, redirigir `/es/*` y mapear slugs traducidos (tres tablas paralelas); el proxy debe ir delante de la caché de Cloudflare; `trailingSlash` + rewrites queda sin probar; y con D1 el locale ya es estático por carpeta. Coste de D1: páginas finas duplicadas (~10 líneas), protegidas por un test de paridad. La opción `i18n` de `next.config` es del Pages Router.

## 1. Árbol de rutas

○ estático · ● SSG · ƒ dinámico. Archivos relativos a `app/`.

| URL ES | URL EN | Archivo ES / EN | Tema | Indexable | Render | Fase |
|---|---|---|---|---|---|---|
| `/` | `/en/` | `(es)/(site)/page.tsx` / `(en)/en/(site)/page.tsx` | classic | Sí (ES = x-default) | ○ | F3 |
| `/proyectos/` | `/en/projects/` | `…/proyectos/` / `…/projects/` | classic | Sí | ○ | F3 |
| `/proyectos/<slug>/` | `/en/projects/<slug>/` (mismo slug) | `…/[slug]/page.tsx` | classic | Sí | ● (`dynamicParams=false`, hoy falta) | F3 |
| `/servicios/` | `/en/services/` | `…/servicios/` / `…/services/` | classic | Sí | ○ | F3 |
| `/servicios/<slug>/` | `/en/services/<slug-en>/` | `…/[slug]/` | classic | Sí | ● | F5 (CNT-04) |
| `/sobre-mi/` | `/en/about/` | `…/sobre-mi/` / `…/about/` | classic | Sí | ○ | F3 |
| `/blog/` | `/en/blog/` | `…/blog/` ×2 | classic | Sí | ○ | F3 |
| `/blog/<slug-es>/` | `/en/blog/<slug-en>/` | `…/blog/[slug]/` ×2 | classic | Sí | ● | F3 |
| `/ahora/` | `/en/now/` | `…/ahora/` / `…/now/` | classic | Sí | ○ (Last.fm desde el cliente) | F3 |
| `/contacto/` | `/en/contact/` | `…/contacto/` / `…/contact/` | classic | Sí | ○ (`?servicio=` en cliente) | F3 |
| `/classic/` | `/en/classic/` | `…/(site)/classic/` ×2 | classic | No (canonical → home, fuera del sitemap) | ○ | F5 |
| `/os/` | `/en/os/` | `(es)/os/` / `(en)/en/os/` | xp | No (`noindex, follow`) | ○ | F4 |
| `/os/proyectos/<slug>/` | `/en/os/projects/<slug>/` | `…/os/…/[slug]/` | xp | No | ● | F4 |
| `/?view=retro` | `/en/?view=retro` | mismo HTML que `/` | classic + overlay xp | canonical `/` | ○ | existe; en F5, **307** a `/os/` |
| 404 | 404 bajo `/en/` | `(site)/[...missing]/page.tsx` + `(site)/not-found.tsx` por idioma | classic | `noindex` | ƒ (`force-dynamic`) | F3 |
| `/api/*` | — | `api/*/route.ts` | — | No | ƒ | existen |
| `/cv/*.pdf` | — | `cv/[file]/route.ts` | — | Sí | ● | existe |
| `/sitemap.xml`, `/robots.txt` | — | `sitemap.ts`, `robots.ts` | — | — | ○ | F3 (alternates) / F7 |
| `/llms.txt`, `/llms-full.txt` | — | route handlers `force-static` | — | — | ○ | F7 |
| URLs WordPress | — | `lib/redirects.ts` (308) | — | — | — | existen; ninguna `source` choca con `/en/*` (test) |

Las URLs con extensión quedan fuera de `trailingSlash`. Slugs de proyecto iguales en ES/EN; los de posts se traducen.

## 2. Estructura de `app/`

```
app/
  (es)/
    layout.tsx              ← raíz ES: rootMetadata("es"); <Document locale="es">
    (site)/
      layout.tsx            ← <SiteShell locale="es">: div data-theme="classic" + Header · main · Footer
      template.tsx · not-found.tsx · [...missing]/page.tsx (force-dynamic; notFound())
      page.tsx · proyectos/ · proyectos/[slug]/ · servicios/ · sobre-mi/ · blog/ · blog/[slug]/ · ahora/ · contacto/
      classic/ (F5) · servicios/[slug]/ (F5)
    os/ (F4)                ← <OsShell>: data-theme="xp"; sin Header/Footer; noindex
  (en)/en/
    layout.tsx              ← raíz EN
    (site)/ … projects/ · services/ · about/ · blog/ · now/ · contact/
    os/ (F4)
  api/ · cv/[file]/ · sitemap.ts · robots.ts · icon.svg
components/shell/{document,site-shell,language-switch}.tsx
components/views/{home,projects,project,services,about,blog,post,now,contact,not-found}.tsx  ← reciben `locale`
content/{routes,ui,pages}.ts · lib/metadata.ts · lib/i18n/{pages,links,locale-context}.ts(x) · lib/fonts.ts
```

Las páginas de `app/` son adaptadores finos (params → `locale`, `slug`) que definen sus exports en el propio archivo (análisis estático de Next):

```tsx
// app/(en)/en/(site)/projects/[slug]/page.tsx
import { ProjectView, projectMetadata, projectParams } from "@/components/views/project";
export const dynamicParams = false;
export function generateStaticParams() { return projectParams(); }
export async function generateMetadata({ params }: PageProps<"/en/projects/[slug]">) { return projectMetadata("en", (await params).slug); }
export default async function Page({ params }: PageProps<"/en/projects/[slug]">) { return <ProjectView locale="en" slug={(await params).slug} />; }
```

### 2.1 `data-theme` (contrato para CSS)

- `<html>` sin tema; tokens base en `:root`.
- `(site)/layout.tsx`: `<div class="theme-root" data-theme="classic">` a altura completa. En F3 `classic` reproduce el aspecto actual; en F5 cambian los valores, no los nombres.
- `os/layout.tsx` (F4): `data-theme="xp"`, `position: fixed; inset: 0`. Sustituye a `body:has(.desktop-os)`.
- Overlay de `/?view=retro` (hasta F5): `createPortal(…, document.body)` con `data-theme="xp"`; bloqueo de scroll con `html[data-os-open]`, no `:has()`.
- Reglas: todo lo temático por custom properties en `[data-theme="…"]`; sin selectores descendientes del tipo `[data-theme] .x`; sin `:has()` para temas; temas no anidados; los portales llevan su propio `data-theme`.

### 2.2 Coste de cruzar layouts raíz

Solo al cambiar de idioma (selector ES↔EN, con `prefetch={false}`): recarga completa, aceptable porque es deliberada y las páginas son estáticas. Enlaces EN que apunten a rutas ES se evitan con `localizeInternalHref` y un test. Público ↔ `/os` y `/classic` no cruzan.

### 2.3 404 por idioma

`[...missing]/page.tsx` llama a `notFound()` antes de cualquier Suspense → status 404 con la navegación del idioma; `force-dynamic` evita entradas ISR por URL aleatoria. Sin canonical en el 404 (SEO-12). Respaldo si falla el spike: `global-not-found` (experimental, no localizado).

## 3. `proxy.ts`: no

Nada que reescribir (D1/D2); sin redirección por `Accept-Language` (Googlebot, x-default, caché de Cloudflare); la cookie de preferencia (F5) la lee el cliente tras hidratar y ofrece/navega a `/os/`. El aviso "View in English" es un componente cliente descartable (F5). Si algún día hace falta un proxy, su `matcher` excluye `_next`, `api`, `cv` y archivos con extensión.

## 4. Contenido de rutas, microcopy y metadata

### 4.1 `content/routes.ts`

Puro (no importa contenido ni lee env).

```ts
export const routes = {
  home:      { es: "/",                     en: "/en/" },
  projects:  { es: "/proyectos/",           en: "/en/projects/" },
  project:   { es: "/proyectos/[slug]/",    en: "/en/projects/[slug]/" },
  services:  { es: "/servicios/",           en: "/en/services/" },
  about:     { es: "/sobre-mi/",            en: "/en/about/" },
  blog:      { es: "/blog/",                en: "/en/blog/" },
  post:      { es: "/blog/[slug]/",         en: "/en/blog/[slug]/" },
  now:       { es: "/ahora/",               en: "/en/now/" },
  contact:   { es: "/contacto/",            en: "/en/contact/" },
  service:   { es: "/servicios/[slug]/",    en: "/en/services/[slug]/",    since: 5 },
  os:        { es: "/os/",                  en: "/en/os/",                 since: 4, indexable: false },
  osProject: { es: "/os/proyectos/[slug]/", en: "/en/os/projects/[slug]/", since: 4, indexable: false },
  classic:   { es: "/classic/",             en: "/en/classic/",            since: 5, indexable: false },
} as const satisfies Record<string, RouteDef>;

export const publishedLocales: readonly Locale[] = ["es"];   // pasa a ["es","en"] tras la revisión del usuario (P9)
export function href(key, locale, params?): string;           // lanza en build si falta un parámetro
export function alternates(key, params?): Partial<Record<Locale, string>>;  // omite idiomas no publicados
export function hreflangMap(key, params?): Record<string, string>;          // + "x-default" = es
export function matchPath(pathname): { key, locale, params } | null;
export const ogLocale = { es: "es_CO", en: "en_US" };
export const intlLocale = { es: "es-CO", en: "en-US" };
```

Parámetros: `string` (igual en ambos idiomas) o `Partial<L>` (p. ej. slug de post). Anclas y query se añaden fuera (`href("contact", l) + "?servicio=wordpress"`).

### 4.2 Servidor

- `lib/i18n/pages.ts` → `publicPages()`: enumeración única de páginas indexables (`{ key, params, alternates }`), consumida por sitemap, selector de idioma, tests de paridad y `llms.txt`. `buildLanguageIndex()` → mapa ruta actual → equivalente (lo calcula `(site)/layout.tsx` y lo pasa al `LanguageSwitch`).
- `lib/i18n/links.ts` → `localizeInternalHref(esHref, locale)` para los enlaces del cuerpo de los posts.

### 4.3 `content/ui.ts` y `content/pages.ts`

- `ui.ts`: solo microcopy (a11y, nav, idioma, footer, etiquetas de proyecto y estado, post, formulario con códigos de error, 404, SO). `uiFor(locale, section)` devuelve la sección resuelta.
- `pages.ts`: SEO y cabeceras de cada página estática indexadas por `RouteKey` (incluye FAQs de servicios).
- Los componentes cliente **nunca** importan `ui.ts`/`pages.ts`/`posts.ts` enteros: el servidor resuelve y pasa strings por props. `LocaleProvider` solo transporta el `Locale`.
- API de contacto: responde `{ ok: false, code }` y el cliente traduce el código; el asunto del correo sigue en ES.

### 4.4 `lib/metadata.ts`

- `rootMetadata(locale)`: `metadataBase`, `title { default, template: "%s | Emmanuel Dávila" }`, descripción, autores. **Sin** canonical ni openGraph.
- `buildMetadata({ locale, route, params, title, absoluteTitle?, description, image?, type?, article?, index?, canonicalTo? })` devuelve siempre: `alternates` (canonical propio + idiomas publicados + `x-default`), `openGraph` completo (`url` propio, `title`, `locale`, `alternateLocale`, imágenes, campos de artículo), `twitter`, y `robots` noindex cuando `index === false` o el idioma aún no está publicado.
- Imagen OG por defecto: estáticas `public/og/default-{es,en}.png` (1200×630, recurso de diseño pendiente); mientras falten, se omite `images`. Proyectos usan su portada.
- JSON-LD `Person` (`@id …/#person`) en `Document`; `inLanguage` y fechas con `intlLocale`.

## 5. Plan de migración

| Paso | Qué | Criterio de aceptación |
|---|---|---|
| P0 | Línea base: `next build` + snapshot (status, Location, `lang`, title, canonical, `og:url`) de cada URL del sitemap y de cada `source` de redirección | Dos ejecuciones idénticas |
| P1 | `content/routes.ts` + `tests/unit/routes.test.ts` | Paths ES = URLs de P0; barra final; sin colisiones; sin choque con redirecciones; `matchPath(href(...))` ida y vuelta; `alternates` omite no publicados |
| P2 | Estructura: `git mv` a `app/(es)/(site)/…`, `Document`, `SiteShell`, `template`, 404 catch-all (con spike previo: `icon.svg` en ambos layouts, 404 real del catch-all, 404 de slug desconocido, `sitemap`/`robots` siguen ○) | Mismo conjunto de URLs que P0; 200 en todo el sitemap; WP en 308 de un salto; `/no-existe/` 404 con `noindex` y `lang="es"`; `/?view=retro` funciona; tsc/lint/tests pasan |
| P3 | `lib/metadata.ts` en páginas ES; fuera canonical/OG del layout raíz | Canonical = P0; `og:url`/`og:title` propios (SEO-02); 404 sin canonical (SEO-12) |
| P4 | `content/ui.ts` + `content/pages.ts` (ES/EN); vistas en `components/views/*` con `locale`; `LocaleProvider`; `Intl` por idioma; contacto con códigos | Texto ES visible = P0 salvo cambios intencionados; sin literales ES en JSX de vistas/header/footer; ningún cliente importa `ui.ts`/`pages.ts` |
| P5 | `data-theme` (`SiteShell` classic, overlay por portal xp, `html[data-os-open]`); CSS sin `body:has()`; `next/font` en `lib/fonts.ts` | Sin `:has()` de tema; sin cambios visuales no previstos; sin `@import` de Google Fonts |
| P6 | Árbol EN `app/(en)/en/…` con su 404 | Test de paridad de archivos; `/en/x/` con `lang="en"`; `/en/no-existe/` 404 EN; EN con noindex mientras no esté publicado |
| P7 | Selector de idioma, `localizeInternalHref`, `/en/?view=retro` | Enlace de idioma a la equivalente exacta; ningún `href` interno EN fuera de `/en/` (salvo `/cv/`, `/api/`, externos) |
| P8 | `sitemap.ts` desde `publicPages()` con `alternates.languages` | Reciprocidad; x-default = ES; sin `/os`, `/classic`, 404; toda `<loc>` da 200 sin redirección |
| P9 | El usuario revisa el EN → `publishedLocales = ["es","en"]` | Hreflang en ambas versiones; EN en sitemap; sin noindex en EN |

Smoke test `scripts/smoke-routes.mjs` contra `next start` (status, `lang`, canonical propio, hreflang recíproco), añadido al CI.

### Riesgos

| Riesgo | Mitigación |
|---|---|
| Cambiar una URL ES existente | Test P1(a) contra P0; P2 mueve sin renombrar |
| Conflictos entre agentes | P2 con `app/` congelado; CSS no toca layouts; fuentes en `lib/fonts.ts` |
| 308 cacheadas para siempre | La Fase 3 no añade redirecciones permanentes; provisionales con 307 |
| Caché de Cloudflare | HTML estático con `s-maxage` largo: purgar en cada despliegue si hay "Cache Everything"; no quitar `_rsc` de la clave |
| `dynamicParams` olvidado | Test: toda página con `[` exporta `dynamicParams = false` y `generateStaticParams` |
| Dos idiomas en el bundle cliente | Regla: el cliente no importa `ui.ts`/`pages.ts`/`posts.ts` |
| `next/font` duplicado | Definición única en `lib/fonts.ts` |

## 6. Sitemap

- **Fase 3:** generado desde `publicPages()`, una entrada por URL e idioma publicado con `alternates.languages` + `x-default`; excluye `/os`, `/classic`, 404, `/api`, CV; `lastModified` solo en blog/posts.
- **Fase 7:** `lastModified` real, `/servicios/<slug>/`, `robots.ts` (SEO-11), `X-Robots-Tag` en CV, `llms.txt` desde `publicPages()`, validación en Search Console.

## 7. Preguntas abiertas (recomendación)

| # | Pregunta | Recomendación |
|---|---|---|
| 1 | ¿Adelantar hreflang y alternates del sitemap a la Fase 3? | Sí: EN sin hreflang manda señales confusas; F7 verifica |
| 2 | Tema de las páginas públicas en F3 | `classic` con los valores actuales |
| 3 | ¿Qué es `/classic/`? | Entrada simétrica a `/os/` para el selector (F5), canonical → `/`, fuera del sitemap |
| 4 | 404 por idioma | Catch-all `force-dynamic`; `global-not-found` solo si falla el spike |
| 5 | Canonical de `/os/*` | `noindex, follow` con canonical propio |
| 6 | Proxy en `/` según cookie | No; el cliente lee la cookie |
| 7 | Aviso "View in English" | Sí, cliente y descartable (F5), nunca redirección |
| 8 | `?servicio=` en EN | Mantenerlo |
| 9 | Slugs de servicio traducidos (F5) | `slug` ES como id estable + `urlSlug: L` para la URL |
| 10 | ¿EN por páginas o de una vez? | De una vez, tras revisión del usuario; hasta entonces noindex |
| 11 | ¿`/en/os/`? | Sí |
| 12 | Imagen OG por defecto | Estática por idioma en `public/og/` (recurso pendiente) |
| 13 | `x-default` | ES |
| 14 | Vistas compartidas | `components/views/` |
