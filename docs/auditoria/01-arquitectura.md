# Fase 1 — Auditoría de ARQUITECTURA, CÓDIGO y DEPENDENCIAS

Repo auditado: este repositorio, rama `fase/1-auditoria` (árbol limpio). Modo solo lectura: no se modificó ningún archivo del repo.
Fuentes de Next.js consultadas: `node_modules/next/dist/docs/01-app/…` (se cita el archivo en cada recomendación).

Convención: **[V]** = hecho verificado (código leído o comando ejecutado). **[S]** = suposición o estimación no medida.

---

## 0. Resultado de los comandos

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | **0 errores** (exit 0) [V] |
| `npm run lint` (`eslint .`) | **0 errores, 0 avisos** (exit 0) [V] |
| `npm audit --omit=dev` | **0 vulnerabilidades** [V] |
| `npm ls --depth=0` | 14 paquetes directos, sin `extraneous` ni `missing` [V] |
| `npm outdated` | ver §4 [V] |

---

## 1. Mapa del proyecto

### 1.1 Rutas (`app/`)

| Ruta | Archivo | Tipo | Render | Datos |
|---|---|---|---|---|
| `/` | `app/page.tsx` | Page (server) → `PortfolioExperience` (**client**) | Estático, pero el HTML inicial solo contiene el selector | `data/site` |
| `/proyectos` | `app/proyectos/page.tsx` | Page (server) | SSG | `data/projects` |
| `/proyectos/[slug]` | `app/proyectos/[slug]/page.tsx` | Page (server) + `generateStaticParams` + `generateMetadata` | SSG (13 slugs con imagen) | `data/projects`, `data/site` |
| `/servicios` | `app/servicios/page.tsx` | Page (server), FAQ en JSX | SSG | `data/site` |
| `/sobre-mi` | `app/sobre-mi/page.tsx` | Page (server) | SSG | `data/site` |
| `/ahora` | `app/ahora/page.tsx` | Page (server) + `MusicWidget` (client) | SSG + fetch cliente | `data/site`, `/api/lastfm/` |
| `/contacto` | `app/contacto/page.tsx` | Page (server) + `ContactForm` (client) | SSG | `data/site`, `/api/contact/` |
| `/cv/[file]` | `app/cv/[file]/route.ts` | Route Handler `force-static`, `dynamicParams=false` | PDF generado en build | `content/*` vía `lib/cv/cv-document.tsx` |
| `/api/contact` | `app/api/contact/route.ts` | Route Handler POST | Dinámico | `lib/server/mailer`, `lib/server/rate-limit` |
| `/api/lastfm` | `app/api/lastfm/route.ts` | Route Handler GET (`connection()`) | Dinámico | `lib/server/lastfm` |
| `/api/health` | `app/api/health/route.ts` | Route Handler GET | Dinámico | — |
| `/robots.txt`, `/sitemap.xml` | `app/robots.ts`, `app/sitemap.ts` | Metadata routes `force-static` | Estático | `data/*` |
| — | `app/layout.tsx` | Root layout: `Header` + `main` + `Footer` + JSON-LD Person | — | `data/site` |
| — | `app/template.tsx` | Envuelve cada página en `.page-transition` (se remonta en cada navegación) | — | — |
| — | `app/loading.tsx`, `app/not-found.tsx` | Boundary global; 404 usa `RetroClippy` (client + framer-motion) | — | — |

`next.config.ts`: `output: "standalone"`, `trailingSlash: true`, `images.unoptimized: true`, rewrites `/api/*.php` → handlers, cabeceras de seguridad base (sin CSP). No existe `proxy.ts`.

### 1.2 Componentes

| Archivo | Líneas | Máx. caracteres/línea | `"use client"` | Rol |
|---|---|---|---|---|
| `components/desktop/desktop-shell.tsx` | 244 | **1 246** | sí | Escritorio completo: `BootScreen`, `ProjectExplorer`, `WelcomeApp`, `AboutApp`, `WindowContent`, gestor de ventanas, menú Inicio, menú contextual, barra de tareas, notificaciones, sonido |
| `components/desktop/RetroClippy.tsx` | 78 | 220 | sí | Asistente (framer-motion `drag`, portal) |
| `components/desktop/crt-overlay.tsx` | 55 | 194 | sí | Shader WebGL |
| `components/desktop/services-wizard.tsx` | 21 | 459 | sí | Asistente de servicios |
| `components/desktop/terminal-app.tsx` | 38 | 230 | sí | Terminal |
| `components/desktop/desktop-icons.tsx` | 24 | 143 | no | Iconos SVG del SO + `PixelLogo` |
| `components/portfolio-experience.tsx` | 62 | 143 | sí | Selector "choice / retro / standard" |
| `components/standard-home.tsx` | 63 | 510 | no (pero queda en el bundle cliente al importarse desde `portfolio-experience`) | Home "web normal" |
| `components/header.tsx` | 43 | 138 | sí | Nav clásica |
| `components/contact-form.tsx` | 43 | 286 | sí | Formulario |
| `components/music-widget.tsx` | 47 | 224 | sí | Last.fm |
| `components/ui.tsx` | 45 | 131 | no | `Window`, `Cta`, `SectionHeading`, `ProjectCard`, `JsonLd` |
| `components/icons.tsx` | 23 | 156 | no | Iconos de la web clásica |
| `components/footer.tsx` | 22 | 169 | no | Footer |

Páginas con JSX en una sola línea: `app/servicios/page.tsx:16` (2 505 caracteres), `app/sobre-mi/page.tsx:8` (1 999), `app/proyectos/[slug]/page.tsx:25`, `app/ahora/page.tsx:9`, `app/contacto/page.tsx:9`, `app/proyectos/page.tsx:8`, `app/not-found.tsx:6` [V].

### 1.3 Contenido, adaptadores y servidor

- `content/` (fuente única, `L<T> = Record<"es"|"en", T>`): `types.ts`, `profile.ts`, `projects.ts` (551 líneas, **19 proyectos**, 13 con `image`, 5 con `featured: true`), `services.ts` (5 servicios + testimonios), `experience.ts`, `people.ts`, `posts.ts` [V].
- `data/` (adaptadores temporales a ES): `data/projects.ts` (filtra los que tienen imagen → 13), `data/site.ts` (`site`, `services`, `testimonials`, `technologies`) [V].
- `lib/server/`: `mailer.ts`, `rate-limit.ts`, `lastfm.ts` (todos con `server-only`) [V]. `lib/cv/cv-document.tsx` (react-pdf, `server-only`, lee `content/` directamente, bilingüe) [V].
- Estilos: `app/globals.css` (374 líneas, tokens `:root` + web clásica + Google Fonts por `@import`) y `app/desktop.css` (489 líneas, SO + selector + Clippy). Ambos se importan en el root layout → se cargan en **todas** las rutas [V].

### 1.4 Flujo de datos (actual)

```
content/*.ts  (L<T> es/en)
   │
   ├──► lib/cv/cv-document.tsx ──► app/cv/[file]/route.ts  (PDF es/en en build)  ← único consumidor bilingüe
   │
   └──► data/projects.ts, data/site.ts   (proyección SOLO "es")
            │
            ├──► app/layout.tsx (metadata, JSON-LD)  ──► Header (client) / Footer
            ├──► app/{proyectos,servicios,sobre-mi,ahora,contacto}/page.tsx  (server)
            ├──► app/sitemap.ts, app/robots.ts
            └──► app/page.tsx ──► PortfolioExperience ("use client")
                                    ├── ExperienceGateway   (único HTML del SSR)
                                    ├── DesktopShell ── projects completos + technologies → bundle cliente
                                    │      ├── ProjectExplorer ── router.push(/proyectos/slug) → sale del SO
                                    │      ├── ServicesWizard ── /contacto?servicio=slug (param ignorado)
                                    │      ├── TerminalApp, ContactForm ──POST──► /api/contact ─► lib/server/mailer (SMTP)
                                    │      └── MusicWidget ──GET──► /api/lastfm ─► lib/server/lastfm ─► Last.fm API
                                    └── StandardHome (server-capable, pero empaquetado como cliente)

Textos de UI (h1, CTAs, FAQ, metadata, terminal, BIOS, microcopy): hardcodeados en ES dentro del JSX.
```

---

## 2. Hallazgos

### Arquitectura

**ARQ-01 · importante · La portada `/` no entrega contenido en el HTML y la "preferencia" no se recuerda**
- Evidencia: `components/portfolio-experience.tsx:38` (`useState("choice")`), `:41-47` (`?view=` leído en `setTimeout` dentro de `useEffect`), `:52` (`localStorage.setItem("edav-view")` **sin ningún `getItem` en el repo** [V, grep]); `app/page.tsx:18`.
- Impacto: el SSR de `/` solo contiene el selector; el contenido de `StandardHome` y del escritorio no existe en el HTML (SEO, sin-JS, LCP). Con `?view=standard` hay un parpadeo del selector antes del cambio. El README (`README.md`, "Selector persistente") promete algo que el código no hace. Toda la home (incluida `StandardHome`, que no necesita cliente) va en el bundle cliente.
- Fix: Fase 5 — `/` como selector servido por servidor (HTML real, dos enlaces a `/os` y `/classic`); la elección se guarda en **cookie** (`edav-ui=os|classic`), no en localStorage, para que el servidor/proxy pueda usarla (ver §3.3). `/classic` renderizado 100 % en servidor. Mientras tanto (Fase 2, opcional): leer `localStorage` al montar para cumplir lo prometido.
- Fase 5 · Esfuerzo M.

**ARQ-02 · importante · El root layout mezcla la web clásica y el SO; se ocultan con `body:has()`**
- Evidencia: `app/layout.tsx:30` (Header/Footer siempre); `app/desktop.css:18`, `:22` (`body:has(.desktop-os) > .site-header {display:none}`), `:347` (estilos de header condicionados a `:not(:has(...))`).
- Impacto: DOM y JS (Header es client) innecesarios en el SO; acoplamiento frágil por CSS; ambos stylesheets globales en todas las rutas. Bloquea separar `/os` y `/classic` limpiamente.
- Fix: route groups con layouts propios — `app/[lang]/(classic)/layout.tsx` (Header/Footer + `classic.css`) y `app/[lang]/os/layout.tsx` (shell del SO + `os.css`). Doc: `03-api-reference/03-file-conventions/route-groups.md`.
- Fase 3 (estructura) / 5 (split) · M.

**ARQ-03 · importante · `desktop-shell.tsx` es un monolito no testeable**
- Evidencia: `components/desktop/desktop-shell.tsx:1-244` — 7 componentes, lógica de ventanas, audio, drag/resize, menú Inicio, contexto y taskbar en un archivo; líneas de hasta 1 246 caracteres (`:234-242`); estado en 8 `useState` + 2 `useRef` (`:189-198`); handlers inline por ventana.
- Impacto: imposible probar el gestor de ventanas; cualquier cambio de Fase 4 (multiventana, URL, minimizar/restaurar, z-order) toca todo el archivo; revisiones de diff ilegibles.
- Fix (Fase 4): extraer `lib/os/window-reducer.ts` (puro, con tests), `components/os/{Window,Taskbar,StartMenu,ContextMenu,BootScreen,DesktopIcons}.tsx`, hooks `usePointerDrag` (compartido con Clippy, ver DEP-03) y `useSystemSound` (un solo `AudioContext`). Detalle en §3.2.
- Fase 4 · L.

**ARQ-04 · importante · No hay relación URL ↔ ventana; abrir un proyecto saca al usuario del SO**
- Evidencia: `desktop-shell.tsx:161` (`onDoubleClick → router.push('/proyectos/slug')`), `:162` (`<Link href=/proyectos/slug>`); `services-wizard.tsx:17` (`<Link /contacto?...>`); `AboutApp :175` (`<Link /sobre-mi>`).
- Impacto: se pierde el estado del escritorio (las ventanas viven en `useState` de un componente de página); no hay URL compartible de "SO con ventana X abierta". Requisito central de Fase 4.
- Fix: ver §3.2 (shell en layout persistente + `history.pushState` + estado inicial derivado de params).
- Fase 4 · L.

**ARQ-05 · importante · i18n bloqueado: adaptadores `data/` solo-ES y textos ES hardcodeados en JSX**
- Evidencia: `data/projects.ts:27-43`, `data/site.ts:8-33` (todo `.es`); textos en JSX/metadata en todas las páginas (`app/layout.tsx:11-19`, `app/servicios/page.tsx:7-12` FAQ, `:16`; `app/sobre-mi/page.tsx:8`; `app/proyectos/[slug]/page.tsx:18-25` FAQ y etiquetas; `components/standard-home.tsx:11-61`; `desktop-shell.tsx:21-27, 129-152, 160-175, 196`; `terminal-app.tsx:11-29`; `RetroClippy.tsx:21-27`; `header.tsx:8-15`; `footer.tsx:9-19`; `contact-form.tsx:20-40`; `music-widget.tsx:37-45`; mensajes de API en `app/api/contact/route.ts:57-103`); `app/layout.tsx:30` `lang="es"` fijo; `Intl` con `"es-CO"` fijo (`desktop-shell.tsx:205`, `terminal-app.tsx:26`).
- Impacto: añadir EN implica tocar cada archivo; riesgo de que /os y /classic diverjan en contenido (ya divergen: ver COD-06).
- Fix: ver §3.1 y §3.4 (`content/ui.ts` con microcopy `L`, selectores por locale en servidor, eliminar `data/`).
- Fase 3 · L.

### Código

**COD-01 · importante · Preselección de servicio rota y lista de servicios triplicada**
- Evidencia: enlaces `?servicio=<slug>` en `app/servicios/page.tsx:16` y `components/desktop/services-wizard.tsx:17`; ni `app/contacto/page.tsx` ni `contact-form.tsx` leen el parámetro [V, grep sin `searchParams`]. Opciones del `<select>` hardcodeadas (`contact-form.tsx:36`) y duplicadas en `SERVICES` del handler (`app/api/contact/route.ts:8`), con valores = títulos ES, no slugs. El servicio `automatizacion` (`content/services.ts:28`) no existe en el formulario ni en el handler (cae en "Otro"/"Sin especificar").
- Impacto: CTA "Consultar este servicio" no hace lo que promete; al traducir, el handler rechazará los valores EN; un servicio real no es seleccionable.
- Fix: `value = slug`, etiqueta `t(service.title, locale)` desde `content/services.ts`; el handler valida `slug ∈ services.map(s => s.slug)` y compone el asunto con el título ES; `ContactForm` recibe `defaultService` desde `searchParams` de la página (o `useSearchParams` en el cliente).
- Fase 2 (bug funcional, S) — o Fase 3 si se prefiere junto a i18n.

**COD-02 · menor · Cifras hardcodeadas que ya no cuadran con `content/`**
- Evidencia: "13+"/"13 proyectos"/"13 ITEMS"/"13 documentados" en `components/standard-home.tsx:19,44`, `desktop-shell.tsx:137,170,175`; "5+ años" en `standard-home.tsx:19` y `desktop-shell.tsx:175`. `content/projects.ts` tiene 19 proyectos (13 con imagen) [V].
- Impacto: al publicar la galería con filtros (Fase 4) las cifras quedarán desfasadas.
- Fix: derivar `projects.length` y años desde `content/` (p. ej. `content/experience.ts`), o mover las cifras a `content/profile.ts`.
- Fase 3 · S.

**COD-03 · menor · `featuredProjects` ignora el flag `featured`**
- Evidencia: `data/projects.ts:45` (`slice(0, 6)`); `content/projects.ts` marca 5 con `featured: true` [V].
- Fix: `projects.filter(p => p.featured)`. Fase 3 · S.

**COD-04 · menor · Duplicación**
- `getProject` en `content/projects.ts:549` y `data/projects.ts:47`.
- Dos sistemas de iconos con trazos repetidos (`components/icons.tsx:11,13,9` vs `components/desktop/desktop-icons.tsx:14,12,13`: music, user/about, mail/contact).
- Cromo de ventana duplicado a mano en `app/not-found.tsx:6` en vez de usar `Window` de `components/ui.tsx:7`.
- Dos implementaciones de Web Audio: `BootScreen` (`desktop-shell.tsx:50-65, 82`) y `beep` (`:210-215`), y `beep` crea un `AudioContext` nuevo por clic.
- Dos FAQ con el mismo patrón `FAQPage` JSON-LD inline (`app/servicios/page.tsx:15`, `app/proyectos/[slug]/page.tsx:24`).
- Fix: `components/icons` único con sets; `lib/schema.ts` con `faqSchema()`; hook `useSystemSound`. Fase 3–4 · S.

**COD-05 · menor · Código muerto o sin uso**
- `content/posts.ts` (135 líneas, blog) no lo importa ningún archivo [V]; no hay ruta de blog.
- Exportaciones sin consumidor hoy: `projectKinds`, `statusLabels`, `ownershipLabels` (`content/projects.ts:525-544`), campos `myRole`, `links`; `t`, `locales`, `defaultLocale` (`content/types.ts:6-17`). Son preparación de Fases 3–4: **mantener**, pero deben empezar a usarse.
- CSS sin referencia en TSX [V, script de grep]: `.music-card`, `.music-copy`, `.music-fallback`, `.music-icon`, `.album-skeleton`, `.skeleton`, `.live-dot` (restos del widget anterior).
- `terminal-app.tsx:28`: `.replace("about", "about")` no hace nada.
- UI decorativa no funcional: botones ←→↑ y árbol de carpetas de `ProjectExplorer` (`desktop-shell.tsx:160-161`), menú "Archivo/Editar/Ver/Ayuda" (`:236`); "Cerrar sesión" solo muestra una notificación (`:241`). No es código muerto, pero sí affordances falsas (afecta a UX/a11y).
- Fix: borrar CSS y no-op; decidir si el blog entra en alguna fase; conectar carpetas a los filtros de la galería en Fase 4. Fase 3–4 · S.

**COD-06 · menor · Contenido divergente entre vistas**
- Evidencia: `terminal-app.tsx:24-25` (whoami/skills hardcodeados: incluye "PostgreSQL", "Node.js"), frente a `technologies` derivado de `content/profile.ts` (`data/site.ts:33`); textos de "Sobre mí" distintos en `desktop-shell.tsx:175` y `app/sobre-mi/page.tsx:8`; `app/layout.tsx:28` `knowsAbout` hardcodeado.
- Impacto: contradice el objetivo "/os y /classic leen exactamente lo mismo" (`content/types.ts:3-4`).
- Fix: todo desde `content/`. Fase 3 · S.

**COD-07 · menor · Límites server/client mejorables**
- `PortfolioExperience` (`"use client"`) arrastra `StandardHome` y `DesktopShell` completos al cliente; `DesktopShell` importa `projects` con `challenge`/`solution` (texto largo) aunque el explorador solo usa título, categoría, año, imagen y resumen (`desktop-shell.tsx:9, 158-162`).
- `app/not-found.tsx:3` monta `RetroClippy` → framer-motion se carga en cada 404.
- Fix: en Fase 4–5 el layout del SO (server) resuelve el contenido por locale y pasa al shell solo un "view model" mínimo serializable; las ventanas de proyecto cargan el detalle bajo demanda (ver §3.2). Fase 4 · M.

**COD-08 · menor · Robustez del gestor actual (se resuelve con el reducer de Fase 4)**
- `z` crece sin límite (`desktop-shell.tsx:216-217`); `focus`/`openApp` usan `maxZ` del render (cierre obsoleto posible con eventos encadenados) [S: no reproducido].
- `TerminalApp → onOpen(value)` valida con `value in appMeta` (`:185`), que acepta claves del prototipo (`open constructor`); hoy es inocuo porque no coincide ninguna ventana.
- `innerWidth < 769` hardcodeado en lógica JS (`:219, :222`), duplicando un breakpoint CSS.
- Fix: z-order como orden de un array; `Object.hasOwn`; breakpoint desde un token compartido. Fase 4 · S.

**COD-09 · menor · `app/template.tsx` remonta todo en cada navegación**
- Evidencia: `app/template.tsx:1-3`. Los templates se remontan por diseño (doc `03-api-reference/03-file-conventions/template.md`).
- Impacto: si el shell del SO queda bajo este template, perderá su estado en cada navegación.
- Fix: mover el template solo al grupo `(classic)`; el SO usa layout. Fase 4–5 · S.

**COD-10 · menor · Google Fonts por `@import` en CSS**
- Evidencia: `app/globals.css:1`.
- Impacto: petición de terceros que bloquea el render; obliga a abrir `fonts.googleapis.com`/`fonts.gstatic.com` en la CSP prevista en Fase 2 (`next.config.ts:3`).
- Fix: `next/font/google` (se autoaloja en build) con `variable` CSS. Doc: `01-getting-started/13-fonts.md`. Fase 2 (por la CSP) o 7 · S.

**COD-11 · menor · Estilos: tokens parciales y dos hojas globales**
- Evidencia: `app/globals.css:3-17` define tokens; `app/desktop.css` tiene **373 literales hex** y 41 usos de variables; `globals.css` 141 hex [V, grep]. Ambas en `app/layout.tsx:6-7`.
- Fix: Fase 3 — `styles/tokens.css` (colores, tipografía, espacios, z-index de capas, breakpoints) compartido; `classic.css` y `os.css` importados desde el layout de cada grupo. Fase 3 · M.

**COD-12 · menor · README desactualizado**
- Evidencia: `README.md` ("Los proyectos se administran en `data/projects.ts`", "Selector persistente", "13 proyectos").
- Fix: apuntar a `content/` y `docs/contenido.md`. Fase 3 · S.

### Dependencias

**DEP-01 · menor · Actualizaciones minor/patch disponibles** [V, `npm outdated`]

| Paquete | Actual | Destino Fase 2 | Notas |
|---|---|---|---|
| `react`, `react-dom` | 19.2.4 (fijados exactos) | 19.3.1 | Minor; peer de `next@16.4.6` es `^19.0.0` [V, `npm view`]. Subir ambos a la vez y fijar exacto como ahora. |
| `@types/react`, `@types/react-dom` | 19.2.18 / 19.2.5 | 19.3.0 | Alinear con React. |
| `@types/node` | 24.13.3 | 24.19.2 | Mantener línea 24 = runtime del Dockerfile (`node:24.22.3`). |
| `framer-motion` | 13.1.1 | 13.5.1 | Minor (ver DEP-03 antes de invertir en ella). |
| `next`, `eslint-config-next` | 16.4.6 | 16.4.6 | Al día. |
| `nodemailer`, `@react-pdf/renderer`, `@types/nodemailer`, `server-only` | — | — | Al día. |

**DEP-02 · menor · Majors que NO deben entrar en Fase 2**: `eslint` 10.15 (compatibilidad de `eslint-config-next@16.4.6` no verificada), `typescript` 7.0 (nuevo compilador; plugin `next` de tsconfig sin verificar), `@types/node` 26 (no corresponde al runtime 24), `framer-motion` 14. Fase 2 solo minor/patch, según plan.

**DEP-03 · menor · `framer-motion` solo se usa para arrastrar a Clippy**
- Evidencia: único import en `components/desktop/RetroClippy.tsx:3`, uso `motion.aside drag` (`:64`) [V]. En disco: `framer-motion` 5,4 MB + `motion-dom` 4,3 MB [V]. Coste en bundle cliente **no medido** [S: decenas de KB gzip].
- Impacto: dependencia pesada para un drag que el propio shell ya implementa con Pointer Events (`desktop-shell.tsx:219-224`); además se carga en cada 404.
- Fix: decidir en Fase 4/6. Si las mascotas de Fase 6 usan sprites con animación por CSS/`steps()`, sustituir por un hook `usePointerDrag` compartido con las ventanas y eliminar la dependencia. Si se queda, medir con el analizador de bundle de Next. Fase 4/6 · S.

**DEP-04 · menor · Sin `engines` ni `.nvmrc`**: README exige Node ≥ 24 y el Dockerfile fija 24.22.3, pero `package.json` no lo declara. Fix: `"engines": { "node": ">=24 <25" }`. Fase 2 · S.

Paquetes sin usar: **ninguno** [V: todos los directos tienen import o son tipos/tooling]. `@react-pdf/renderer` solo se ejecuta en build (ruta `force-static`), no llega al cliente [V, `lib/cv/cv-document.tsx:1` `server-only`].

### DX

**DX-01 · importante · No hay tests ni CI**
- Evidencia: sin script `test`, sin Vitest/Jest/Playwright en `node_modules/.bin` [V], sin carpeta `.github` [V].
- Impacto: las Fases 3–5 reestructuran rutas, contenido y el SO sin red de seguridad; el handler de contacto y el rate-limit (código sensible) no tienen pruebas.
- Fix (mínimo recomendado, Fase 3):
  1. **Vitest** (doc `02-guides/testing/vitest.md`) para lógica pura: `lib/server/rate-limit.ts` (ventana, expulsión por `maxKeys`, `clientIp` con N saltos), `mailer.parseConfig` (combinaciones de env), validación del handler de contacto (extraer `line`/`multiline`/validación a `lib/server/contact.ts`), y el futuro `window-reducer`.
  2. **Test de integridad de contenido**: cada `L<T>` tiene `es` y `en` no vacíos; slugs únicos; `image` existe en `public/`; `credits[].person` ∈ `people`; `featured` ≤ N.
  3. **Playwright** humo (doc `02-guides/testing/playwright.md`): `/`, `/classic`, `/os`, `/proyectos/<slug>` abre el SO con la ventana, 404, formulario con SMTP ausente → 503.
  4. CI (GitHub Actions): `npm ci && npm run lint && npm run typecheck && npm test && npm run build`.
- Fase 3 · M.

**DX-02 · menor · Scripts y formato**: faltan `test`, `check` (lint + typecheck + test) y un formateador; las líneas de 1 000–2 500 caracteres indican que no hay Prettier. Fix: añadir Prettier en **un commit aislado** al inicio de Fase 3 (reformatea todo; conviene separarlo de cambios funcionales para revisiones legibles). Fase 3 · S.

**DX-03 · menor · Ignorados**: `eslint.config.mjs:8` ignora `.next/` y `out/` pero no `WordPress/` ni `private/`; `tsconfig.json:31-40` incluye `**/*.ts` sin excluirlos. Hoy no rompe (no hay `.ts` ahí [V]), pero cualquier archivo futuro en esas carpetas entraría en lint/typecheck y en el contexto de Docker (`.dockerignore` sí excluye `WordPress`, no `private`). La carpeta local `out/` es un export antiguo ignorado por git (inocuo). Fix: añadir ambas a `globalIgnores`, `exclude` y `.dockerignore` (`private`). Fase 2 · S.

---

## 3. Preparación para Fases 3–5

### 3.1 i18n (Fase 3) — recomendación compatible con Next 16

Verificado en `node_modules/next/dist/docs/01-app/02-guides/internationalization.md`, `…/03-file-conventions/proxy.md` (Middleware renombrado a **Proxy** en v16; runtime Node por defecto; funciona en servidor Node/standalone) y `…/04-functions/next-root-params.md`.

**Recomendación: segmento `app/[lang]/` + `proxy.ts` que reescribe (no redirige) las URL sin prefijo a `es`.**

```
app/
  [lang]/
    layout.tsx            ← root layout: <html lang={await lang()}>, generateStaticParams → [{lang:'es'},{lang:'en'}], dynamicParams=false
    (classic)/layout.tsx  ← Header/Footer, classic.css, template.tsx
    (classic)/page.tsx, proyectos/…, servicios/…, sobre-mi/…, ahora/…, contacto/…
    os/layout.tsx         ← shell del SO (persistente)
    os/…                  ← ver §3.2
  api/…, cv/[file]/route.ts   ← fuera de [lang] (route handlers no necesitan layout)
proxy.ts
```

- Público: ES sin prefijo (`/proyectos/x`, URLs actuales intactas), EN con prefijo (`/en/proyectos/x`). `proxy.ts`: si el path no empieza por `/en` ⇒ `NextResponse.rewrite` a `/es{path}`; si empieza por `/es` ⇒ redirect 308 a la versión sin prefijo (evita contenido duplicado). Matcher excluyendo `_next`, `api`, `cv`, archivos con extensión, `robots.txt`, `sitemap.xml`.
- No auto-redirigir por `Accept-Language` (ES es el principal y rompería enlaces compartidos); como mucho, un aviso "View in English".
- Locale en servidor con `lang()` de `next/root-params` (la doc indica que no funciona en Client Components ni Route Handlers). Los componentes cliente reciben **strings ya resueltos** por props, o un `LocaleProvider` pequeño; nunca el objeto `L` completo, para no enviar ambos idiomas al navegador.
- Microcopy de UI en `content/ui.ts` como `L` (mismo patrón que el resto; no hace falta librería). Si más adelante hay pluralización compleja, evaluar `next-intl` (listada en la doc), pero hoy no lo justifica.
- `hreflang`/canonical: `alternates.languages` en `generateMetadata` de cada página (Fase 7).
- Decisiones abiertas para el usuario: (a) ¿segmentos traducidos en EN (`/en/projects`) o mismos nombres (`/en/proyectos`)? Recomiendo mismos nombres en Fase 3 (cero mapeo) y traducir en Fase 7 si aporta SEO; (b) `global-not-found.js` es **experimental** (`not-found.md:49`) — con root layout dentro de `[lang]` basta un `app/[lang]/not-found.tsx` más el rewrite del proxy, que hace que toda ruta caiga bajo `[lang]`.
- Riesgo a probar: interacción de `trailingSlash: true` con el matcher y los rewrites del proxy [S: no probado].

### 3.2 Gestor de ventanas y URL ↔ ventana (Fase 4)

Verificado: los layouts "preservan estado, siguen interactivos y no se re-renderizan" al navegar (`01-getting-started/03-layouts-and-pages.md:43`); Next integra `window.history.pushState/replaceState` con el router y actualiza `usePathname`/`useSearchParams` (`01-getting-started/04-linking-and-navigating.md:346-348`); las **rutas interceptadas** solo actúan en navegación suave: en recarga o enlace compartido se renderiza la página completa (`intercepting-routes.md`), y los **slots paralelos** muestran `default.js` en navegación dura (`parallel-routes.md:100-101`).

Por qué **no** usar rutas interceptadas + paralelas como modelo principal: un slot renderiza una ruta activa a la vez (no encaja con varias ventanas de proyecto abiertas, minimizadas y apiladas), y el requisito "el enlace compartido abre el SO con esa ventana" es justo el caso de navegación dura, donde la intercepción no ocurre.

**Modelo recomendado**

1. **Estado**: `lib/os/window-reducer.ts` puro (`useReducer` + Context dividido en `state`/`dispatch`; sin dependencia nueva). Acciones: `OPEN`, `CLOSE`, `FOCUS`, `MINIMIZE`, `RESTORE`, `TOGGLE_MAXIMIZE`, `MOVE`, `RESIZE`. Ventanas con id compuesto (`app:projects`, `project:<slug>`) para permitir varias. Z-order = orden de un array (adiós `z` infinito). Posiciones en `sessionStorage` opcional.
2. **Shell en layout**: `app/[lang]/os/layout.tsx` (server) resuelve el contenido por locale y renderiza `<OsShell initialData=…>{children}</OsShell>` (client). Al estar en layout, sobrevive a navegaciones dentro de `/os`.
3. **Rutas hijas como "intención"**: `app/[lang]/os/page.tsx` (escritorio) y `app/[lang]/os/proyectos/[slug]/page.tsx` con `generateStaticParams`; la página no pinta la ventana: renderiza un componente cliente mínimo que hace `dispatch(OPEN project:slug)` o pasa `initialWindow` al shell. Así la carga directa abre el SO con esa ventana y el HTML sigue siendo estático.
4. **Sincronía URL ↔ foco**: al abrir/enfocar una ventana de proyecto desde el SO, `history.pushState(null, "", "/proyectos/<slug>")` (o `/os/proyectos/<slug>`, según §3.3); al cerrarla, `replaceState` a `/os`. Un efecto escucha `usePathname()` para el botón Atrás (cerrar/abrir la ventana correspondiente). Usar `pushState` en vez de `router.push` evita refetch de RSC y mantiene el árbol montado.
5. **Contenido de la ventana**: el layout pasa un índice ligero (slug, título, categoría, año, imagen, kind, credits); el detalle (`challenge`, `solution`, etc.) se carga bajo demanda desde una ruta estática `app/api/projects/[slug]/route.ts` con `force-static` o se incluye si el total sigue siendo pequeño [S: hoy ~19 proyectos; medir].
6. **Canonical**: la ventana y la página clásica del mismo proyecto apuntan a un único canonical (`/proyectos/<slug>`).

### 3.3 Separar `/os` y `/classic` compartiendo contenido (Fase 5)

- Árboles hermanos bajo `[lang]`: `(classic)` y `os`, ambos consumiendo los mismos selectores de `content/` (§3.4) y componentes de presentación compartidos (`ProjectCard`, `ServiceList`, `ContactForm`, `MusicWidget`) con variantes de estilo por CSS scope (`.theme-os` / `.theme-classic`) en vez de componentes duplicados.
- `/` = selector servido por servidor; la elección se guarda en cookie `edav-ui`.
- **URL compartible única** `/proyectos/<slug>`: el `proxy.ts` (el mismo de i18n) puede reescribir internamente a `/[lang]/os/proyectos/<slug>` si la cookie es `os`, y a la versión clásica en otro caso (por defecto clásica: rastreadores y visitantes nuevos reciben HTML completo). Ambas variantes siguen siendo estáticas. Alternativa más simple si el usuario prefiere no depender de cookie: `/os/proyectos/<slug>` como URL del SO y `/proyectos/<slug>` como clásica, con canonical a la clásica. Decisión para el usuario.
- Precaución [S]: si delante hay Cloudflare con caché de HTML, una misma URL con dos respuestas según cookie requiere no cachear HTML (comportamiento por defecto de Cloudflare) o `Vary: Cookie`.

### 3.4 Migración `data/` → `content/` (Fase 3)

1. Crear `lib/content/` con selectores tipados por locale: `getProjects(locale, {withImage?, featured?, kind?})`, `getProject(slug, locale)`, `getServices(locale)`, `getTestimonials(locale)`, `getSite(locale)`; devuelven "view models" ya resueltos (strings, no `L`). Reutilizar `projectTitle` y `t` de `content/`.
2. Sustituir imports de `@/data/*` (19 puntos de importación [V, grep]) por los selectores, empezando por `sitemap`/`robots`/`layout` (sin UI) y terminando por el SO.
3. Mover microcopy hardcodeado a `content/ui.ts` (§3.1), cifras a valores derivados (COD-02), servicios del formulario a slugs (COD-01).
4. Borrar `data/` y la doble `getProject` (COD-04). Test de integridad de contenido (DX-01) como guardián.
5. `site.domain` (env `NEXT_PUBLIC_SITE_URL`) pasa a `lib/site.ts` (no es contenido).

---

## 4. Plan resumido por fase

| Fase | IDs |
|---|---|
| 2 | DEP-01, DEP-04, COD-01 (bug), COD-10 (si la CSP lo exige), DX-03 |
| 3 | ARQ-02 (estructura), ARQ-05, COD-02, COD-03, COD-04, COD-05, COD-06, COD-11, COD-12, DX-01, DX-02, §3.1, §3.4 |
| 4 | ARQ-03, ARQ-04, COD-07, COD-08, COD-09, DEP-03 (decisión), §3.2 |
| 5 | ARQ-01, ARQ-02 (split final), §3.3 |
| 6 | DEP-03 (si las mascotas no requieren framer-motion) |

## 5. Decisiones que necesitan al usuario

1. EN: ¿`/en/proyectos` (mismos segmentos) o `/en/projects` (traducidos)?
2. URL del proyecto en el SO: ¿única `/proyectos/<slug>` con proxy según cookie, o `/os/proyectos/<slug>` explícita?
3. ¿Se mantiene `content/posts.ts` (blog) para alguna fase o se elimina?
4. ¿`framer-motion` se queda para las mascotas de Fase 6 o se sustituye por drag propio?
