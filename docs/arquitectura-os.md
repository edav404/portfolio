# Arquitectura del SO con ventanas (Fase 4)

Diseño para guardar como `docs/arquitectura-os.md`. Base de código: rama `fase/3-arquitectura-i18n`. Las rutas a la documentación de Next son relativas a `node_modules/next/dist/docs/01-app/`. Marcas: [V] verificado en código o docs, [S] supuesto que el spike O0 debe confirmar.

## 0. Decisiones

| # | Decisión | Respaldo |
|---|---|---|
| O1 | El SO es una **ruta real** con layout propio: `app/(es)/os/` y `app/en/os/`. El shell se monta una vez en `os/layout.tsx` y sobrevive a la navegación dentro de `/os`. | `01-getting-started/03-layouts-and-pages.md`: "layouts preserve state… do not rerender" [V] |
| O2 | **Estado = store propio** (`lib/os/store.ts`, `useSyncExternalStore`) sobre un reducer puro. La URL es una **proyección** del estado, no su fuente. | PERF-07 pide re-render por ventana, no global |
| O3 | **URL ↔ ventana con `history.pushState/replaceState` + `usePathname`**, no `router.push`. No se usan rutas paralelas ni interceptadas. | `01-getting-started/04-linking-and-navigating.md` §Native History API: Next integra pushState en el router y `usePathname` se actualiza [V]. Anexo 01 §3.2 explica por qué no slots. |
| O4 | **Se elimina el overlay** `PortfolioExperience` y `html[data-os-open]`. `/` solo ofrece enlaces a `/os/`. `/?view=retro` pasa a redirección cliente en la F4 y a 307 en la F5. | D5 de `arquitectura-rutas.md`: público ↔ `/os` comparte layout raíz |
| O5 | **El HTML de `/os/` se renderiza en servidor** (escritorio, taskbar, ventana inicial). No hay `ssr:false` global. Solo las apps pesadas, el arranque y la mascota se cargan diferidos. | A11Y-06 y SEO sin JS: `noscript` útil |
| O6 | **Geometría SSR-segura con CSS** (`min()`/`clamp()` sobre variables). El JS solo aplica geometría persistida después de hidratar. | Evita saltos y desajustes de hidratación |
| O7 | **Las ventanas minimizadas permanecen montadas** con `hidden`. Solo cerrar desmonta. | Hoy minimizar pierde el estado del formulario y la terminal |
| O8 | Marca visible: **"EDAV OS"** (cromo Luna propio), sin "98", BIOS ni "XP" en la marca. | UI-01, UI-11; pregunta Q2 |

## 1. Rutas

### 1.1 Árbol

```
app/
  (es)/os/
    layout.tsx                  ← adaptador: <OsLayoutView locale="es">{children}</OsLayoutView>; metadata robots noindex
    page.tsx                    ← osMetadata("es"); <noscript> con enlace a "/"
    proyectos/[slug]/page.tsx   ← generateStaticParams + dynamicParams=false; osProjectMetadata; <noscript> con título + enlace a /proyectos/<slug>/
  en/os/
    layout.tsx                  ← idem con locale="en" (bajo el layout raíz EN, sin grupo)
    page.tsx
    projects/[slug]/page.tsx
components/views/os.tsx         ← OsLayoutView (servidor), osMetadata, osProjectParams, osProjectMetadata
components/os/…                 ← cliente, ver §2
lib/os/…                        ← lógica pura, ver §2
```

- URLs: `/os/`, `/os/proyectos/<slug>/`, `/en/os/`, `/en/os/projects/<slug>/`. Los slugs son los mismos que los de `/proyectos/<slug>/`.
- Sin `template.tsx` en `os/` (COD-09). El `page-transition` queda solo en `(site)`. Test de estructura nuevo: `os/` no contiene `template.tsx`.
- Las páginas siguen el contrato de `arquitectura-rutas.md` §2: adaptadores de ~10 líneas con `dynamicParams = false` y `generateStaticParams`. `route-files.test.ts` ya cubre la paridad cuando `since ≤ CURRENT_PHASE`: subir `CURRENT_PHASE` a 4.
- Las páginas devuelven solo `<noscript>`. El layout las pasa como `children` al shell, que las monta dentro de un contenedor `sr-only`. Sin JS el usuario ve el escritorio sin función y un enlace a la web.
- Esto es una elección mía. Que las páginas devuelvan `null` también es válido.

### 1.2 Layout persistente

```tsx
// components/views/os.tsx (servidor)
export function OsLayoutView({ locale, children }) {
  const os = uiFor(locale, "os");                       // ~2,6 KB gz
  const index = projectIndex(locale);                   // lean: slug,title,kind,ownership,status,year,category,summary,image,hrefPublic,credits[{name,role,href?}]
  const details = projectDetails(locale);               // challenge, solution, myRole, services, technologies, links
  return <OsShell locale={locale} copy={...} projects={index} details={details} other={{ href: languageIndexForOs(locale), label }}>{children}</OsShell>;
}
```

- Se importa `@/components/os/os.css` aquí. Es CSS de segmento: solo se descarga en `/os`. Se borra `app/desktop.css`.
- `<div class="os-root" data-theme="xp">` con `position: fixed; inset: 0; isolation: isolate`. Sin `body:has()` ni `html[data-os-open]`. Esto cumple D4 y §2.1 de `arquitectura-rutas.md`.
- Presupuesto de datos: 17 proyectos, `content/projects.ts` pesa 30 KB con ambos idiomas, así que un idioma ronda 15 KB, unos 5 KB gz. Va inline en el HTML. Si supera 10 KB gz, los detalles pasan a un JSON estático por idioma.

### 1.3 Vínculo URL ↔ ventana

**Principio.** Solo las ventanas de proyecto tienen URL. Las demás apps viven en `/os/`. El path refleja la ventana activa si es de proyecto; si no, `/os/`.

**Una sola entrada al estado desde la URL.** El shell lee `usePathname()` en el render inicial, en SSR y en cliente (como hoy `ThemeRoot`). Un efecto sobre `pathname` ejecuta `SYNC_URL` cuando `pathname !== lastWritten.current`. Cubre cuatro casos:

1. Deep link o recarga: el estado inicial sale de `intentFromPath(pathname)`. El HTML ya trae la ventana abierta.
2. Atrás y adelante: Next integra popstate y actualiza `usePathname` [V].
3. Un `<Link>` externo hacia `/os/proyectos/x/`: el layout persiste y la ruta cambia.
4. Un pushState propio no dispara el efecto, porque `lastWritten` coincide.

**Escritura estado → URL.** Una función pura `planHistory(prev, next, action, mode)` en `lib/os/window-url.ts` devuelve `{ mode: "push" | "replace" | "none", path }`. Reglas en modo escritorio:

| Acción | Efecto en la URL |
|---|---|
| `OPEN` de un proyecto que no estaba abierto | `pushState({os:1,id}, "", "/os/proyectos/<slug>/")` |
| `OPEN` o `FOCUS` de un proyecto ya abierto | `replaceState` al path de la ventana activa |
| Enfocar otra ventana (taskbar, clic) | `replaceState`: el foco no contamina el historial |
| `CLOSE` de la ventana activa | `replaceState` al path de la nueva activa o `/os/` |
| `OPEN` de una app sin URL | `none` |
| Acciones originadas en `SYNC_URL` | `none` (evita bucles) |

**Atrás y adelante (desktop).** `SYNC_URL(target)` es una acción pura del reducer:
- `target = project(slug)`: abre y enfoca esa ventana, o la restaura si está minimizada.
- `target = desktop`: cierra la ventana de proyecto activa, si lo es. Atrás deshace "abrir proyecto". Adelante lo reabre. Si la activa no es de proyecto, no hace nada.
- Un slug desconocido es un no-op (el shell recibe `knownSlugs`).

**Modo pocket (≤768 px, ver §5.4).** Cada `OPEN` de una ventana nueva hace pushState, incluso las apps (la URL queda en `/os/` con `state.id`). El gesto atrás del sistema cierra la ventana superior. El botón "‹ Atrás" de la barra de título llama a `history.back()` si la entrada es nuestra. Este modo es el paso O10.

**`document.title`.** pushState no re-ejecuta `generateMetadata`. El hook de historial actualiza `document.title` (`"<Proyecto> | EDAV OS"`) y lo restaura al cerrar. El canonical del DOM vivo queda el del primer render. Es inocuo porque la página es `noindex`; el HTML inicial de cada URL trae el suyo.

**Verificación [S] en O0.** Next copia el árbol del router en `history.state` y, al hacer popstate a una entrada creada con pushState, no debería pedir RSC nuevo. Si lo hiciera, solo sería un fetch estático del layout persistente. Medir también que `usePathname` se actualiza en Edge.

### 1.4 SSG de los slugs

- `osProjectParams()` devuelve los slugs de `caseStudies` (13), igual que la página pública (tests existentes).
- Los 4 proyectos privados (17 − 13) no tienen portada, y por eso no tienen página pública. **Recomiendo** que aparezcan igual en la galería del SO con tarjeta sin imagen, y que tengan su ventana en `/os/proyectos/<slug>/`, sin el enlace "Ver página pública". Si se prefiere paridad estricta, solo los 13. Es la pregunta Q6. El diseño es idéntico: `osProjectParams()` cambia de fuente.
- Cada slug de `os/proyectos/[slug]` exporta `dynamicParams = false` (ya forzado por `app-structure.test.ts`).

### 1.5 Convivencia con `/?view=retro` y el overlay

| Momento | Comportamiento |
|---|---|
| Hasta O9 | `PortfolioExperience` y `desktop-shell.tsx` siguen funcionando. El SO nuevo se construye al lado en `components/os/`, sin tocarlos. |
| O9, cambio de contrato | `DesktopLaunchButton` pasa a `<Link href={href("os", locale)}>` con `onPointerEnter` y prefetch. El enlace de `components/footer.tsx:24` apunta a `href("os", locale)`. `PortfolioExperience`, `loadDesktop`, el `createPortal` y `html[data-os-open]` se eliminan. `HomeView` deja de resolver `os` (≈2,6 KB gz menos en `/`). |
| O9, compatibilidad | Un `<RetroRedirect locale/>` cliente (diez líneas) en la portada lee `?view=retro` tras hidratar y hace `router.replace(href("os", locale))`. |
| Fase 5 | `next.config.ts` `redirects()` con `has: [{ type: "query", key: "view", value: "retro" }]`, `permanent: false` (307), de `/` a `/os/` y de `/en/` a `/en/os/`. Sin `proxy.ts` (D3). Se retira `RetroRedirect`. |

**Salida del SO.** "Vista web" (Inicio → "Cerrar sesión" y la bandeja) es un `<Link>` a `href("home", locale)`. Es navegación normal con scroll arriba. La devolución del foco del overlay deja de existir; el foco lo gestiona el navegador en la nueva página. Se pierde la posición de scroll de la portada: coste aceptado.

### 1.6 `routes.ts`, sitemap, robots, metadata, `llms.txt`

- `content/routes.ts`: `os` y `osProject` ya existen con `since: 4, indexable: false`. En la F4 pasan a existir. Añadir `os` y `osProject` a `staticKeys` y `refs()` de `lib/i18n/pages.ts` para que `languageIndex` dé la equivalencia ES↔EN dentro del SO. `publicPages()` los excluye ya por `indexable`. Test: ninguna ruta `os*` en `publicPages()` ni en el sitemap.
- **Metadata.** `osMetadata(locale)` y `osProjectMetadata(locale, slug)` llaman a `buildMetadata({ route, index:false, … })`. Resultado: `robots: noindex, follow`, canonical propio, `og:url` propio y sin hreflang. Eso último hay que comprobarlo contra `seoEligibility`; es lógico porque hreflang entre páginas noindex no aporta. `os/layout.tsx` también exporta `metadata = { robots: { index: false, follow: true } }` como red. Si `content/pages.ts` exige una entrada por `RouteKey`, añadir `os` o ubicar el título y la descripción en `ui.os.meta` (en el mismo paso que `ui.ts`).
- **robots.ts.** No añadir `Disallow: /os/`. Un `Disallow` impediría leer el `noindex`. Añadir un comentario explicándolo.
- **`llms.txt`.** El generador de la F7 sale de `publicPages()`, que ya excluye `/os`. No se lista el SO.
- **Selector de idioma en el SO.** Entrada "English/Español" en el área de notificación y en el menú Inicio: `<Link prefetch={false} hrefLang lang>` al valor de `languageIndex`. Cruza layout raíz, con recarga completa deliberada (§2.2 de `arquitectura-rutas.md`). Las posiciones persistidas son independientes del idioma.

## 2. Estado y módulos

### 2.1 Reducer puro: `lib/os/window-reducer.ts`

Solo TypeScript, sin React ni DOM. Entorno de tests Node, el que ya usa Vitest.

```ts
export type AppId = "welcome"|"projects"|"services"|"about"|"contact"|"media"|"terminal"|"settings";
export type WindowId = AppId | `project:${string}`;
export type Rect = { x: number; y: number; w: number; h: number };
export type WindowState = {
  id: WindowId;
  minimized: boolean;
  maximized: boolean;
  rect: Rect;                      // geometría restaurada (nunca el maximizado)
};
export type OsState = {
  windows: Partial<Record<WindowId, WindowState>>;   // presentes = abiertas (incl. minimizadas)
  order: WindowId[];                                  // z-order: el último es el tope; z-index = índice (0…n-1)
  viewport: { w: number; h: number };                 // por defecto 1280×720; el cliente lo actualiza
  cascade: number;                                    // contador para posiciones en cascada
};
export type Action =
  | { type: "OPEN"; id: WindowId }                          // abre o, si ya existe, restaura y enfoca
  | { type: "CLOSE"; id: WindowId }
  | { type: "FOCUS"; id: WindowId }                         // restaura si estaba minimizada
  | { type: "MINIMIZE"; id: WindowId }
  | { type: "TOGGLE_MAXIMIZE"; id: WindowId }
  | { type: "MOVE"; id: WindowId; x: number; y: number }    // commit al soltar o por teclado
  | { type: "RESIZE"; id: WindowId; w: number; h: number; x?: number; y?: number }
  | { type: "SNAP"; id: WindowId; to: "left"|"right"|"center"|"default" }   // alternativa sin arrastre
  | { type: "RESET_GEOMETRY"; id?: WindowId }
  | { type: "SET_VIEWPORT"; w: number; h: number }
  | { type: "HYDRATE_GEOMETRY"; saved: Record<string, Rect & { maximized?: boolean }> }
  | { type: "SYNC_URL"; target: { kind: "desktop" } | { kind: "project"; slug: string }; known: readonly string[] }
  | { type: "MINIMIZE_ALL" } | { type: "CLOSE_ALL" }
  | { type: "CYCLE"; dir: 1 | -1 };
export function reduce(state: OsState, action: Action): OsState;
export function createInitialState(opts: { path: string; locale; knownSlugs: readonly string[]; viewport? }): OsState;
```

- **Selectores puros en el mismo módulo:** `activeId(state)` (la última de `order` no minimizada), `visibleIds`, `zIndexOf`, `nextAfterClose(state, id)`.
- **Estado derivado, no almacenado.** `activeId` se deriva, así que no hay invariantes que sincronizar.
- **Estabilidad referencial.** `reduce` devuelve la misma referencia si la acción no cambia nada, y conserva el objeto `WindowState` de las ventanas no tocadas. Esto hace posible `memo`.
- **Geometría en `lib/os/window-geometry.ts`.** `defaultRect(id, cascade, viewport)`, `clampRect(rect, viewport)`, `snapRect(to, viewport)`, `MIN_W = 320`, `MIN_H = 220`. Constantes `TASKBAR_H = 30`, `TITLEBAR_H = 30` y `MOBILE_MAX = 768`. Todas coinciden con los tokens CSS (un test lo comprueba leyendo `os.css`). Clamp: la barra de título nunca queda fuera de pantalla (≥ 80 px visibles en x, y ≥ 0 hasta `h − TASKBAR_H − TITLEBAR_H` en y). Esto cierra COD-08, porque `innerWidth < 769` deja de estar en la lógica.
- **Inicio.** `/os/` abre solo `welcome`. Recomiendo no abrir `media` al inicio (Q8). `/os/proyectos/<slug>/` abre solo `project:<slug>`, sin Welcome encima.
- **`OsEvent`.** `deriveEvents(prev, next, action)` es pura. Devuelve `opened | closed | minimized | restored | maximized | focused | moved | reset`. Lo consumen el anunciador, el gestor de foco y (F6) el bus de la mascota (MAS-08).
- **Persistencia en `lib/os/persistence.ts`.** `serialize/parse` con versión (`edav-os:v1`) y validación defensiva de rects. Se escribe tras `MOVE/RESIZE/TOGGLE_MAXIMIZE/RESET`, con debounce y `try/catch` (SEC y la nota de `localStorage` de la F2). Las posiciones persistidas se aplican con `HYDRATE_GEOMETRY` después de hidratar y se re-clampan al `viewport`.
- **Preferencias en `lib/os/prefs.ts`.** `{ sound:false, screenEffect:false, assistant:"clippy"|"none", shortcuts:true }`, con `parse` y valores por defecto. Se leen con un store `useSyncExternalStore` cuyo `getServerSnapshot` devuelve los defaults. No hay desajuste de hidratación.

### 2.2 Store: `lib/os/store.ts`

`createOsStore(reducer, initial)` devuelve `{ getState, dispatch, subscribe, subscribeEvents }`, con unas 30 líneas y sin React. El shell lo crea una vez (`useState(() => createOsStore(…))`). Los componentes usan `useOsSelector(selector)` (`useSyncExternalStore` con `getServerSnapshot = initial`). `dispatch` es estable. Cada `WindowFrame` se suscribe solo a su propia ventana, a su índice z y a un booleano `isActive`.

### 2.3 Descomposición de `desktop-shell.tsx` (ARQ-03)

| Módulo | Frontera | Contenido |
|---|---|---|
| `components/views/os.tsx` | servidor | Resuelve `ui.os`, proyectos proyectados y equivalencia de idioma. Es el único que importa `content/ui.ts` y `content/projects.ts` (COD-07). |
| `components/os/os-shell.tsx` | cliente (núcleo) | Crea el store, provee contextos (`OsCopy`, store, prefs), compone el escritorio, la capa de ventanas, la taskbar y el `h1`. |
| `components/os/desktop-surface.tsx` | cliente | Fondo, lista de iconos (`ul` con botones), menú contextual. |
| `components/os/window-layer.tsx` y `window-frame.tsx` | cliente | `WindowFrame` en `memo`. Barra de título, botones, menú de sistema, tiradores de redimensionado. Solo `rect`, `z`, `isActive` y `copy` como props. |
| `components/os/taskbar.tsx` | cliente | Toolbar (Inicio + ventanas) y bandeja. |
| `components/os/start-menu.tsx`, `context-menu.tsx`, `system-menu.tsx`, `menu.tsx` | cliente | `menu.tsx` es la primitiva de menú con roving (`useMenu`). |
| `components/os/use-pointer-drag.ts` | cliente | Hook compartido con `RetroClippy` (cierra la parte de DEP-03). |
| `components/os/use-focus-manager.ts`, `announcer.tsx`, `use-os-history.ts`, `use-shortcuts.ts`, `sound.ts` | cliente | Foco al abrir y cerrar, anuncios, sincronía con la URL, atajos y un único `AudioContext` perezoso. |
| `components/os/apps/welcome.tsx`, `project-window.tsx` | cliente (núcleo) | Entran en el HTML de un deep link. |
| `components/os/apps/projects-gallery.tsx`, `about.tsx`, `services.tsx`, `contact.tsx`, `media.tsx`, `terminal.tsx`, `settings.tsx` | cliente, **diferidos** | `next/dynamic` con SSR activado (`ssr: true`) donde esté dentro del HTML inicial. Precarga con `onPointerEnter/onFocus` del icono, como hoy. |
| `components/os/boot-splash.tsx`, `assistant/` (RetroClippy), `components/os/icons/xp-icons.tsx` y `logo.tsx` | cliente / diferido | El arranque y la mascota son diferidos. Los iconos y el logo son SVG puros en el núcleo. |

**Reglas de frontera** (ampliar `i18n-boundaries.test.ts`):
- Ningún módulo de `components/os/**` ni de `lib/os/**` importa `content/ui.ts`, `content/pages.ts` ni `content/posts.ts`.
- `lib/os/**` no importa React ni `next/*`.
- `content/projects.ts` solo lo importan `components/views/os.tsx` y `lib/os/**` (para tipos).

**Presupuesto de JS** [S: medir el punto de partida en O0 con `next build` y `next experimental-analyze` (`03-api-reference/06-cli/next.md`)]:
- Núcleo específico de `/os` (shell, reducer, iconos, welcome, ventana de proyecto): ≤ 45 KB gz sobre el baseline de React y Next.
- Cada app diferida: ≤ 20 KB gz. Contacto depende de `contact-form`.
- Arranque: ≤ 3 KB gz. Mascota: no mayor que hoy. Sin dependencias nuevas.
- Aplicación: un script `scripts/check-bundle-budget.mjs` falla en CI si se supera (comprobar si Next 16.4.6 deja `route-bundle-stats` en `.next/diagnostics`; si no, sumar los chunks que lista el manifest de `/os`).

### 2.4 Tests unitarios (Vitest, `tests/unit/os-*.test.ts`)

**`os-window-reducer.test.ts`**
1. `OPEN` crea la ventana, la deja en el tope de `order` y es la activa.
2. `OPEN` de una ventana abierta no duplica: la enfoca.
3. `OPEN` de una minimizada la restaura y enfoca.
4. `OPEN` en cascada: la segunda ventana nueva se desplaza respecto de la primera.
5. `CLOSE` la elimina de `windows` y `order`; la activa pasa a ser la siguiente visible.
6. `CLOSE` de una inexistente devuelve la misma referencia.
7. `FOCUS` reordena y mantiene `order` como permutación sin duplicados.
8. `FOCUS` sobre la que ya es la activa devuelve la misma referencia.
9. `z-index = índice` acotado a 0…n−1 tras 10 000 `FOCUS`.
10. `MINIMIZE` pasa el foco a la siguiente visible; sin ninguna visible, `activeId` es `null`.
11. `MINIMIZE` de una ya minimizada es no-op.
12. `TOGGLE_MAXIMIZE` conserva `rect` restaurado y alterna.
13. `MOVE` clampa dentro del viewport, con barra de título siempre alcanzable.
14. `MOVE` con maximizada es no-op.
15. `RESIZE` respeta `MIN_W/MIN_H` y el borde derecho e inferior.
16. `SNAP` `left/right` ocupa la mitad útil sin pisar la barra de tareas; `center` centra; `default` restaura la inicial.
17. `RESET_GEOMETRY` con id solo cambia esa ventana; sin id, todas; no altera `order`.
18. `SET_VIEWPORT` re-clampa todas las ventanas abiertas.
19. `HYDRATE_GEOMETRY` aplica rects válidos, ignora ids desconocidos y rects corruptos (NaN, negativos, tipos erróneos).
20. `SYNC_URL project` abre o enfoca; slug ausente de `known` es no-op.
21. `SYNC_URL desktop` cierra la ventana de proyecto activa y no cierra una app.
22. Secuencia atrás/adelante: abrir A, abrir B, `SYNC desktop` ×2, y reabrir cuadra con `order`.
23. `CYCLE` ±1 recorre las visibles en orden y da la vuelta.
24. `MINIMIZE_ALL` seguido de `FOCUS` restaura solo la elegida. `CLOSE_ALL` vacía.
25. `createInitialState`: `/os/` → solo `welcome`; `/os/proyectos/x/` → solo `project:x`; slug desconocido → como `/os/`; ES y EN equivalentes.
26. Invariantes (property test sencillo con acciones aleatorias): `order` = claves de `windows` sin duplicados; los `rect` finitos.
27. Pureza: no muta el estado de entrada (`Object.freeze` profundo).

**`os-window-url.test.ts`** (`planHistory` e `intentFromPath`): reglas de §1.3 una a una; acciones de `SYNC_URL` → `none`; modo pocket (push en todo `OPEN`); `/os/`, `/en/os/`, `/os/proyectos/x/` y con o sin barra final; `%2F`, `.` y `..` no son rutas (reutiliza `matchPath`).

**`os-window-geometry.test.ts`**: `defaultRect`, `clampRect` con viewports de 320×480 a 3840×2160, `snapRect`, y que `MOBILE_MAX` coincide con `@media (max-width: 768px)` en `os.css`.

**`os-persistence.test.ts` y `os-prefs.test.ts`**: versión y migración descartada, JSON inválido, tamaño acotado, valores por defecto (`sound:false`, `screenEffect:false`).

**`os-store.test.ts`**: `dispatch` notifica solo si cambia la referencia; los suscriptores de eventos reciben `opened/closed/…`.

**`os-menu-nav.test.ts`**: función pura `nextIndex(key, index, count, typeahead?)` para ↑/↓/Home/End/letra, con ciclo.

**`os-focus-return.test.ts`**: `resolveReturnTarget(candidates)` con cadena opener → botón de Inicio → icono → siguiente ventana → raíz.

**`os-gallery-filters.test.ts`**: `filterProjects(list, { kind, ownership })`, conteos por filtro y proyectos sin portada.

**`os-credits.test.ts`**: `lmilo` produce enlace `https://github.com/lmilo`; `jdicans` no tiene `href`; `edav` es propio; cada `credits[].person` ∈ `people`.

**Estructura (ampliar los existentes)**: `os/` sin `template.tsx` ni `[...missing]`; paridad de archivos ES/EN; toda página de `os/` devuelve noindex; los tokens `--z-os-*` están en orden creciente y no hay `z-index` numérico en `os.css`.

## 3. Rendimiento del arrastre (PERF-07)

**Principio.** Durante un gesto no hay `dispatch` ni re-render de React. Se escribe en el DOM de una sola ventana y se confirma una vez al soltar.

`usePointerDrag({ frameRef, onCommit, canStart })`:
1. `pointerdown` (botón principal, fuera de los botones de la barra, ventana no maximizada, no pocket): `setPointerCapture`, guarda origen y `rect`. Añade `is-dragging` (quita transiciones, `user-select: none`) y `will-change: transform`. Enfoca con `FOCUS` **una vez**.
2. `pointermove`: calcula el desplazamiento ya clampado (dentro de `viewport`, barra alcanzable) y lo escribe en `frame.style.transform = translate3d(dx,dy,0)` dentro de **un único `requestAnimationFrame`** (coalescencia). Solo `transform`: sin layout.
3. `pointerup`/`pointercancel`/`lostpointercapture`: `dispatch({ type: "MOVE", id, x, y })` y quita `will-change`. Un `useLayoutEffect` en `WindowFrame`, dependiente de `rect.x/y`, borra `style.transform` antes de pintar. Si el desplazamiento fue 0, se borra en el propio handler.
4. Redimensionado: igual, pero se escribe `style.width/height` por ref en rAF (layout de esa ventana, sin render de React) y se confirma con `RESIZE`. `contain: layout paint` en `.os-window`. Si el contenido interno se resiente (galería de 17 miniaturas), plan B: durante el gesto mostrar el contorno fantasma de XP ("mostrar contenido al arrastrar" apagado) y aplicar el tamaño al soltar.
5. Escape durante el gesto lo cancela y restaura.

**Aislamiento del render.**
- `WindowFrame` es `memo` y recibe props primitivas más el `rect` estable. El contenido (`apps/*`) está detrás del propio `memo`.
- Ningún componente lee el estado completo. El `<time>` del reloj vive en su propio componente, con `setInterval` de 30 s.
- `use-os-history` y `persistence` se suscriben fuera de React.
- `prefers-reduced-motion`: sin transiciones de ventana.

**Criterios de aceptación (CDP en Edge).**
- Durante un arrastre de 60 `pointermove`, un `MutationObserver` sobre `.os-windows` registra **cero** mutaciones `childList` y solo mutaciones de `style` en el marco arrastrado.
- Un `PerformanceObserver` `event`/INP (o las marcas manuales) no supera 100 ms de procesamiento por `pointermove`.
- Tras soltar y recargar, la ventana está en el mismo sitio (persistencia).
- 4× ralentización de CPU: sin tareas largas > 50 ms atribuibles a React.

### 3.1 Alternativa sin arrastre (WCAG 2.5.7, A11Y-14)

- **Menú de sistema** en el icono de la barra de título: `button aria-haspopup="menu"` con nombre "Menú de ventana de {título}". Se abre con clic, Intro, Espacio, ↓, Shift+F10 y clic derecho sobre la barra. Elementos (`menuitem`, todos operables con un solo clic): Restaurar, Mover, Tamaño, Minimizar, Maximizar, **Ajustar a la izquierda**, **Ajustar a la derecha**, **Centrar**, **Restablecer posición**, Cerrar. "Ajustar…", "Centrar" y "Restablecer" no necesitan teclado fino ni arrastre.
- **Modo Mover y Tamaño** por teclado: ← ↑ ↓ → mueve 16 px (Mayús 64 px), Intro confirma, Esc cancela y restaura. Anuncio único: "Moviendo la ventana {título}. Flechas para mover, Intro para confirmar, Esc para cancelar." Cada pulsación hace un `MOVE`; basta con renderizar una ventana.
- **El tirador de redimensionado** pasa a ser decorativo (`aria-hidden`, sin tab stop, `tabindex="-1"`). Quita un tab stop por ventana y el teclado queda en el menú de sistema. Cierra además la parte de A11Y-11 sobre controles falsos.
- **"Restablecer ventanas"** está en el menú contextual del escritorio y en la app Propiedades (`RESET_GEOMETRY` sin id).
- **Objetivos de puntero** ≥ 24×24 en desktop y 44×44 con `pointer: coarse` (A11Y-12). Los botones de ventana Luna miden 21 px en XP real: aquí 24, con el borde visual de 21 y el resto como área clicable por `::before`.
- **Mascota (F6)**: botón "Cambiar de esquina" reutilizando `SNAP`-like; aquí solo se deja el gancho.

## 4. Accesibilidad (ARIA APG)

**Landmarks y encabezados.** El `os-root` contiene `<h1 class="sr-only">EDAV OS — escritorio de Emmanuel Dávila</h1>` permanente (A11Y-15). Las ventanas usan `h2` en la barra de título. `<main id="os-desktop">` envuelve iconos y capa de ventanas. La taskbar queda fuera de `main`. Enlace de salto "Ir a la ventana activa", que enfoca el marco de la activa o el de Welcome. Sin `role="application"`.

**Ventana = `dialog` no modal.**
```html
<div role="dialog" aria-modal="false" aria-labelledby="win-{id}-title" id="win-{id}" tabindex="-1" hidden?={minimized}>
  <div class="os-titlebar">
    <button aria-haspopup="menu" aria-expanded aria-label="Menú de ventana de {título}">icono</button>
    <h2 id="win-{id}-title">{título}</h2>
    <button aria-label="Minimizar {título}"/> <button aria-label="Maximizar {título}" aria-pressed/> <button aria-label="Cerrar {título}"/>
  </div>
  <div class="os-window-content">…</div>
</div>
```
- Se eliminan `aria-label` sobre `section`, la tira de menús falsa (Archivo/Editar/Ver/Ayuda) y los botones ←/→/↑ sin acción (UI-07, A11Y-11).
- Los nombres accesibles contienen el texto visible (2.5.3).

**Foco.**
- Al abrir con acción del usuario, el foco va al **marco** (`tabindex=-1`): el lector lee título y rol, y el siguiente Tab entra al contenido. Excepción declarada por app (`initialFocus: "content"`): la terminal, que pierde su `autoFocus`.
- En carga con deep link, el foco va al marco de la ventana del proyecto (se llegó a esa URL con intención). Al cargar `/os/` sin deep link no se roba el foco.
- **Devolución al cerrar.** El gestor de foco guarda el activador al abrir: `document.activeElement`, o el elemento que declare `data-focus-return="<id>"` (cada menú lo pone apuntando a su botón disparador, porque el menú se cierra al elegir). Al cerrar se intenta, en orden: activador conectado y visible → botón de Inicio (si vino de un menú) → icono del escritorio de esa app → marco de la siguiente ventana activa → raíz del escritorio. La cadena es una función pura (`resolveReturnTarget`), testeada.
- **Minimizar** envía el foco al botón de esa ventana en la barra de tareas. **Restaurar** desde la taskbar enfoca el marco.
- **Enfocar por clic o Tab dentro de una ventana inactiva** la activa (`onFocusCapture` → `FOCUS`). No se reordena el DOM de ventanas.
- Foco visible: doble anillo de A11Y-03, con token `--os-focus-*` que ya existe.

**Escape.** Cierra, en este orden, el elemento transitorio superior: menú (Inicio, contextual o de sistema), globo, modo Mover/Tamaño. **No cierra ventanas en escritorio**, para no perder lo escrito en el formulario o la terminal (§5.5 del anexo 03). En pocket (modal) sí cierra la ventana superior. El cierre de ventana en escritorio es por botón, menú de sistema o `Alt+Shift+W`. Documentado en la ayuda de atajos. Hay una tensión con el APG de diálogo; ver Q3.

**Barra de tareas = `toolbar`.**
- `<div role="toolbar" aria-label="Barra de tareas" aria-orientation="horizontal">` con Inicio y los botones de ventana. Roving tabindex, ←/→/Home/End, **una sola parada de Tab**.
- Botón de ventana: nombre "Mi trabajo" más texto oculto "minimizada" o "activa", `aria-pressed`, `aria-controls` (las minimizadas siguen montadas, por lo que el id existe).
- La bandeja es otro grupo (`role="group" aria-label="Área de notificación"`) con paradas normales: idioma (enlace), sonido (`aria-pressed`, nombre fijo "Sonido"), efecto de pantalla (`aria-pressed`, "Efecto de pantalla antigua"), mascota, y `<time dateTime>` con `aria-label` de fecha y hora completas (no enfocable). Los nombres no cambian con el estado (`aria-pressed` lo transporta).

**Menú Inicio = Menu Button** (anexo 03 §5.2).
- Botón: `aria-haspopup="menu" aria-expanded aria-controls="os-start-menu"`, texto visible "inicio".
- Panel `role="menu"` con `aria-label`; apps como `menuitem`; grupos `role="group"` con nombre ("Programas", "Sistema"); "Todos los programas" es un `menuitem` con `aria-haspopup`.
- Teclado: Intro, Espacio o ↓ abren y enfocan el primero; ↑ abre y enfoca el último; ↑/↓ recorren con ciclo; Home/End; primera letra; Esc cierra y devuelve el foco al botón; Tab cierra y continúa; clic fuera cierra. Roving tabindex vía `useMenu`.
- **Alternativa** si el esfuerzo apremia: patrón Disclosure con lista de botones normales. El plan no depende de ella.

**Menú contextual del escritorio.** `role="menu"`. Se abre con clic derecho **solo sobre el fondo** (A11Y-15: no bloquea el menú nativo en campos), con la tecla Menú o Shift+F10 sobre la lista de iconos. Elementos: Restablecer ventanas, Mostrar escritorio, "Efecto de pantalla antigua" (`menuitemcheckbox`) y Propiedades. Se quitan "Actualizar" y "Abrir terminal" como relleno (UI-07).

**Iconos.** `ul[role=list][aria-label]` con botones. Puntero: un clic selecciona, doble clic abre (UX-11, fidelidad XP). Con `pointer: coarse`, un toque abre. Teclado: Intro o Espacio abre; flechas mueven entre iconos. Primer arranque: globo de bandeja "Haz doble clic en un icono para abrirlo" (UX-11). El doble clic es una comodidad: nada depende de él (2.5.1).

**Atajos (2.1.4).** Siempre con modificador y desactivables en Propiedades. Se usa `event.code` (la tecla Mayús altera `key`). Solo activos con el SO montado. Alt+Shift+S abre Inicio; Alt+Shift+T enfoca la barra de tareas; Alt+Shift+D enfoca el escritorio; Alt+Shift+↑/↓ cicla ventanas; Alt+Shift+W cierra la activa; Alt+Shift+? abre la ayuda. Riesgo [S]: en Windows con varias distribuciones de teclado, Alt+Shift alterna el idioma al soltar si no hubo otra tecla, pero con tecla intermedia no debería dispararse. Probar con NVDA y JAWS; Q4.

**`inert`.** Solo donde hay modalidad real (A11Y-06). Arranque: todo el escritorio `inert`. Pocket: la ventana superior es modal, y escritorio, taskbar y demás ventanas quedan `inert`. En escritorio (ventanas no modales) no hay `inert`. Ya no hay shell público detrás: se elimina `visibility:hidden` sobre `.theme-root`.

**Anuncios sobrios.** Un único `role="status"` visualmente oculto, **montado siempre** (no se remonta). Cola con deduplicación y mínimo de ~1 s entre mensajes. Solo acciones del usuario: "Ventana {título} minimizada / maximizada / restaurada / cerrada", inicio y fin de Mover, "Ventanas restablecidas", "Sonido activado". **No** se anuncia "abierta" (el foco al marco ya lo lee) ni el arranque salvo un mensaje único. La notificación visual del globo no es live region (A11Y-07); los textos importantes pasan por el anunciador. Se elimina el `role="status"` de la notificación actual.

**Movimiento.** `prefers-reduced-motion: reduce`: sin transiciones de ventana ni menú, sin arranque, efecto de pantalla estático, mascota con fotograma fijo. Nada parpadea más de 3 veces por segundo. `forced-colors: active`: los botones de ventana y el foco usan `ButtonText/Highlight` con borde de 1 px.

## 5. Visual

Los valores Luna son de referencia, tomados de memoria visual de XP [S: contrastar con capturas antes de cerrar]. Todo se dibuja con CSS puro y SVG propios, sin assets de Microsoft, sin Tahoma ni Bliss.

### 5.1 Tokens (sobre `app/styles/theme-xp.css`)

Se sustituyen los tokens Win98 (`--os-chrome #c0c0c0`, biseles `outset`, `--os-titlebar-bg` 90°, menú con banda vertical "EDAV 98") por los de Luna que propone el anexo 02 §3.4. Los nombres `--os-*` se mantienen para no tocar el CSS durante la transición, y se retiran los que dejen de usarse.

| Elemento | Valor de referencia |
|---|---|
| Superficie de diálogo | `#ece9d8`, botones `#f5f4ea`, contenido `#fff`, bordes `#aca899` |
| Marco de ventana | 3 px laterales y base `#0831d9`, esquinas superiores de 8 px |
| Barra de título | 30 px, degradado vertical `#0997ff → #0053ee 8% → #0050ee 40% → #06f 88% → #003dd7`; inactiva `#7a96df → #9db9eb → #7a96df`; texto blanco 700 con sombra `1px 1px #0f1089` |
| Botones de ventana | 24×24 (borde visual 21), radio 3 px, borde blanco 1 px. Minimizar y maximizar `#fff → #a7c6ff 30% → #3c80f4`; cerrar `#f8a98a → #e0461c 40% → #c03010`; glifos dibujados en SVG o CSS |
| Barra de tareas | 30 px (48 px en pocket), `#3168d5 → #4993e6 3% → #2157d7 6% → #2663e0 10% → #245edc 90% → #1941a5`; botón de ventana `#3c81f3`, activo `#1e52b7` |
| Botón Inicio | Verde `#3c9d29 → #56b33d 12% → #3c9d29 80% → #2f8a1f`, radio `0 10px 10px 0`, texto "inicio" 700 cursiva blanca |
| Bandeja | `#0c59b9 → #139ee9 6% → #18b5f2 50% → #139beb 94% → #0c59b9`, borde izquierdo `#095bc9` |
| Menú Inicio | Dos columnas, ancho 380 px. Cabecera de 54 px `#1f5fcd → #3b86e6` con avatar y nombre. Izquierda blanca (apps fijadas con icono de 32 px y dos líneas). Derecha `#d3e5fa` (CV, Sobre mí, Servicios, Terminal, Propiedades). Pie con "Cerrar sesión" y "Vista web". Hover `#316ac5` sobre texto blanco. |
| Texto | 11 px base en el cromo (`--font-os`), 13–14 px en contenido de apps; títulos de ventana 13 px negrita |
| Foco | Se mantiene el doble anillo de A11Y-03 (`--os-focus-outline`, `--os-focus-inset`) |
| Fondo | `--os-desktop-bg` pasa a una colina verde con cielo azul **originales** en SVG o gradientes. Sin neón, rejilla ni "sol" de la dirección 98. |

**Fuentes.** La pila del cromo usa `--font-os` con alternativas del sistema. Si se quiere una métrica estable, usar con `next/font` una fuente libre y neutra (por ejemplo Noto Sans). No se redistribuye Tahoma, Verdana ni Trebuchet.

**Contraste.** Se reutilizan las correcciones A11Y-13 de `theme-xp.css` (etiqueta de icono con pastilla `rgba(0,0,40,.6)`). Se verifica cada texto nuevo contra los fondos Luna.

### 5.2 Escala de z-index (UI-04)

Sustituye a `--z-os-*` de `tokens.css` (hoy 5, 6 y 9000–9070). Todo dentro de `.os-root { isolation: isolate }`; las ventanas usan `z-index` inline 0…n−1 dentro de `.os-windows { position: relative; z-index: var(--z-os-windows); isolation: isolate }`.

| Token | Valor | Capa |
|---|---|---|
| `--z-os-wallpaper` | 0 | Fondo |
| `--z-os-icons` | 1 | Iconos del escritorio |
| `--z-os-windows` | 10 | Capa de ventanas (z interno = índice de `order`) |
| `--z-os-assistant` | 20 | Mascota |
| `--z-os-taskbar` | 30 | Barra de tareas |
| `--z-os-menu` | 40 | Inicio, contextual y de sistema |
| `--z-os-balloon` | 45 | Globos de bandeja |
| `--z-os-effect` | 60 | Efecto de pantalla antigua (`pointer-events: none`) |
| `--z-os-modal` | 70 | Arranque y modal en pocket |
| `--z-os-skip-link` | 80 | Enlace de salto |

`--z-os-root: 2000` se elimina cuando se retira el overlay (ya no hay shell público debajo). Test: cada `--z-os-*` está en orden creciente y `os.css` no contiene `z-index` numérico.

### 5.3 Iconos y logo (UI-10, UI-11)

- `components/os/icons/xp-icons.tsx`: set propio en SVG de 32 px (se escala a 16 y 48). Relleno a color con luz arriba a la izquierda, contorno oscuro de 1 px y sombra suave. Nombres: `project` (carpeta amarilla), `about` (tarjeta de usuario), `contact` (sobre), `media` (CD y nota), `terminal`, `cv` (documento con esquina doblada), `services` (asistente), `settings` (pantalla), `welcome`, `help`. Una sola función `XpIcon name size`.
- **Logo (UI-11).** Un orbe de cuatro cuartos de disco (rojo, verde, azul, amarillo) con las letras "ED" encima. Evita la forma de bandera de la marca Windows y conserva los colores. Lo usan el botón Inicio, el avatar y el arranque.
- La rejilla de colores de `PixelLogo` y los iconos de trazo de 1,6 px de `desktop-icons.tsx` se retiran.

### 5.4 "XP Pocket" (≤768 px; UI-05, UX-05)

CSS manda y el JS espeja con `matchMedia("(max-width: 768px)")` vía `useSyncExternalStore` (el snapshot de servidor es `false`).

- **Escritorio = lanzador**: cuadrícula de 4 columnas con iconos de 48 px y etiqueta debajo (apps + CV), sin ventanas superpuestas. Sin el carrusel actual ni los 6 columnas de 70 px de `desktop.css:421`.
- **Ventanas a pantalla completa en pila**: solo se muestra la superior; el resto `hidden`/`inert`. `position: fixed; inset: 0 0 var(--os-taskbar-h-pocket)`.
- **Barra de título** de 44 px (el anexo dice 36 con botones de 44: no cabe; Q12) con "‹ Atrás" a la izquierda (cierra la ventana, o `history.back()` si la entrada es nuestra) y ✕ a la derecha. Minimizar y maximizar ocultos; mover y redimensionar desactivados.
- **Historial**: cada `OPEN` hace pushState (§1.3), así que el gesto atrás cierra la ventana.
- **Barra de tareas** de 48 px: Inicio (solo logo), título de la ventana activa y reloj.
- **Menú Inicio** como hoja a pantalla completa con las dos columnas apiladas.
- **Mascota** minimizada como icono de bandeja; sin globos espontáneos.
- Sin efecto de pantalla antigua ni arranque; animaciones mínimas.
- Objetivos de 44×44 con `pointer: coarse`.

### 5.5 Efecto de pantalla antigua, arranque y audio

- **CRT (UI-09, PERF-08): apagado por defecto.** Se sustituye el canvas WebGL por scanlines CSS estáticas (`repeating-linear-gradient`, `pointer-events: none`, opacidad baja) en la capa `--z-os-effect`. Toggle con `aria-pressed` en la bandeja y casilla en Propiedades ("Efecto de pantalla antigua"). Se borra `crt-overlay.tsx`. Alternativa: conservar el WebGL tras `dynamic import`, solo al activarlo, a 15 fps, con pausa en `visibilitychange` y DPR 1. Recomiendo la opción CSS (Q5).
- **Arranque.** Se elimina la BIOS (UI-01). Queda una pantalla de inicio de sesión corta (≈2 s): logo, barra de progreso azul y "Iniciando EDAV OS". `role="dialog" aria-modal`, resto `inert`, salta con clic, Intro o Esc. Se muestra **solo** en `/os/` (sin deep link), en escritorio, una vez por sesión (`sessionStorage`) y sin `prefers-reduced-motion`. Se pinta como div CSS en el HTML del servidor (`os-boot--pending`) que la hidratación convierte en interactivo o retira; un `<noscript><style>` lo oculta sin JS. Al terminar, el foco va al marco de Welcome. El audio del arranque se elimina porque el sonido está apagado por defecto y el arranque ya no necesita el gesto.
- **Audio (UI-13).** `lib/os/sound.ts`: **un** `AudioContext` perezoso, creado en el primer gesto con el sonido activado. Recetas sintéticas (seno/triángulo, ganancia maestra ≈0,04): clic, abrir, cerrar, minimizar, error, notificación e inicio de sesión. Sin archivos. Se suspende en `visibilitychange` y se cierra al desmontar. **Apagado por defecto**, interruptor en la bandeja (`aria-pressed`) y persistido. Se reproduce solo si `prefs.sound`.

### 5.4b Mascota en la F4

`RetroClippy` se mueve a `components/os/assistant/` y se monta tras hidratar (diferido). Clippy por defecto, descartable, con descarte persistente en `prefs.assistant`. Usa `usePointerDrag` y el token `--z-os-assistant`. Recibe los eventos de `deriveEvents` (el gancho de MAS-08). El motor y los sprites nuevos son de la F6.

## 6. Galería única de proyectos (UX-11, UI-07)

App `projects` ("Mi trabajo"), con estilo de Explorador Luna:

- **Panel izquierdo (tipo "panel de tareas" de XP)**, con dos grupos de filtros como `role="group"` con botones `aria-pressed`: *Tipo* (Todos, Clientes, Personales, Automatizaciones: `projectKinds`) y *Autoría* (Todos, Propios, Cocreados, Colaboración, Cliente: `projectOwnershipLabels`), cada uno con su recuento. Sustituyen a las carpetas falsas y a los botones ←/→/↑ del explorador actual.
- **Cuadrícula** de tarjetas (`ul`). Cada tarjeta: miniatura (o tarjeta tipográfica si no hay portada), título, categoría y año, estado y **badge de crédito**. Un clic selecciona y muestra detalle en la barra inferior; Intro, doble clic o el botón "Abrir" abren la ventana `project:<slug>`.
- **Anuncio**: al filtrar, un `role="status"` único anuncia "12 proyectos". El estado del filtro es local a la ventana (sin URL).
- **Función de filtrado pura** `filterProjects` (testeada). El servidor entrega la lista ya proyectada.
- **Badge de crédito** (`components/projects/credit-badge.tsx`, reutilizable por las páginas públicas):
  - *Propio*: "Proyecto propio".
  - *Cocreado*: "Cocreado con @lmilo", con **enlace** a `https://github.com/lmilo` (`target="_blank" rel="noopener noreferrer"`, nombre accesible "lmilo en GitHub, se abre en una pestaña nueva").
  - *Colaboración*: "Colaboración · jdicans", **sin enlace** (texto plano): `people.jdicans` no tiene `github`.
  - *Cliente*: "Proyecto para cliente".
  - El servidor resuelve `{ name, role, href? }` desde `content/people.ts`; el cliente solo pinta.
- **Ventana de proyecto** (`project:<slug>`): portada, título, categoría, año y estado, badge de crédito, resumen, reto, solución, "Mi rol" (`myRole`), servicios, tecnologías y enlaces del proyecto, y el pie con "Ver página pública" (`<Link href="/proyectos/<slug>/">`, oculto si no hay página pública) y "Iniciar un proyecto" (abre Contacto). Varias ventanas de proyecto pueden coexistir.
- **Descubribilidad (UX-11)**: icono de **CV.pdf** en el escritorio (enlace de descarga, no ventana), globo inicial "Haz doble clic…", Welcome con los dos botones actuales y ayuda "Ayuda → Atajos" en la app Propiedades.

## 7. Plan de migración

Regla de oro: **no se borra nada del código actual hasta O9**. El SO nuevo se construye en `components/os/` y `lib/os/`, con el overlay intacto.

| Paso | Qué | Agente y archivos | Criterio de aceptación |
|---|---|---|---|
| **O0** Spike | Throwaway worktree: layout `os` con shell mínimo; probar pushState, popstate, `usePathname` en SSR estático, tiempos de hidratación y baseline de bundle. | A (solo lectura y medición) | Atrás y adelante con pushState en Edge sin fetch RSC inesperado; `usePathname` correcto en el HTML; baseline de KB anotado. Si falla, plan B: `router.push(..., { scroll: false })` con la ruta real. |
| **O1** Núcleo puro | `lib/os/{window-reducer,window-geometry,window-url,persistence,prefs,store,events}.ts` y tests de §2.4. | A. Sin tocar nada fuera de `lib/os/` y `tests/unit/os-*` | `npm run check` verde; todos los tests de §2.4 pasan; sin importar React. |
| **O2** Visual (paralelo a O1) | Tokens Luna en `theme-xp.css`, escala z en `tokens.css`, `components/os/os.css`, `xp-icons.tsx`, logo, fondo. | B. Archivos de estilos y `components/os/icons/` | Contraste ≥ 4,5:1 (texto) y ≥ 3:1 (no texto) en los cromos; sin hex ni `z-index` literales en `os.css`; revisión visual en Edge. |
| **O3** `ui.ts` y rutas | Nuevas cadenas `ui.os` (nombres XP en ES y EN, menús, atajos, anuncios). Esqueleto de rutas `os/`, `views/os.tsx`, `osMetadata`, `availablePages`, `CURRENT_PHASE = 4`. | C. **Solo este agente toca `content/ui.ts`** (evita conflictos con B y D) | `/os/` y `/en/os/` devuelven 200 con `noindex`, canonical propio y sin hreflang; fuera del sitemap; `route-files`, `app-structure` y `sitemap` pasan. |
| **O4** Shell | `os-shell`, `desktop-surface`, `window-layer`, `window-frame`, `taskbar` y Welcome con el store. | D (depende de O1 y O2) | HTML de `/os/` con escritorio y Welcome renderizados en servidor, sin errores de hidratación; abrir, cerrar, minimizar, restaurar y z-order por teclado y ratón. |
| **O5** Interacción | `use-pointer-drag`, redimensionado, menú de sistema, modo Mover/Tamaño, gestor de foco, anunciador. | D, tras O4 | Criterios de §3; foco al abrir y devuelto al cerrar; sin tab stop del tirador. |
| **O6** Menús y atajos | `menu.tsx`, Inicio, contextual, toolbar con roving, bandeja, `use-shortcuts`. | E (paralelo a O5) | Matriz de teclado de §4 completa. |
| **O7** Apps | Galería, ventana de proyecto, About, Servicios, Contacto, Multimedia, Terminal y Propiedades, cada una en su archivo. | Varios agentes en paralelo, uno por app. `projects-gallery` y `project-window` primero | Cada app abre diferida sin romper el presupuesto; galería con filtros y badges (lmilo con enlace, jdicans sin); sin literales ES (`i18n-boundaries`). |
| **O8** URL ↔ ventana | `use-os-history`, `SYNC_URL`, `document.title`, deep links. | D | Pruebas CDP de §8; sin bucles; recarga en `/os/proyectos/<slug>/` abre la ventana. |
| **O9** Cambio de contrato | Enlaces a `/os/`, `RetroRedirect`, retirada de `PortfolioExperience`, `desktop-shell.tsx`, `desktop.css`, `crt-overlay.tsx`, `data-os-open`. | F, solo este agente. Archivos: `home.tsx`, `footer.tsx`, `portfolio-experience.tsx`, `globals.css` | `/` ya no descarga el SO ni `ui.os`; `/?view=retro` redirige; `npm run check` y `npm run smoke` verdes; snapshot de rutas sin cambios no previstos (documentar en `arquitectura-rutas.md` §10). |
| **O10** Pocket | Modo ≤768 px, historial por ventana, hoja de Inicio. | G | CDP con emulación 390×844 y táctil; el gesto atrás cierra la ventana; objetivos ≥ 44 px. |
| **O11** Preferencias, audio, arranque | `prefs`, sonido, efecto de pantalla, arranque, mascota diferida. | H | Todo apagado por defecto; `prefers-reduced-motion` respetado; descarte de Clippy persiste. |
| **O12** QA y cierre | Suite CDP completa, presupuesto de bundle en CI, axe en Edge [S], actualizar `pendientes.md` y `arquitectura-rutas.md` (filas `/os`). | Todos | Criterios de §8 verdes; CSP en Report-Only sin violaciones nuevas. |

**Paralelismo.** O1, O2 y O3 pueden ir a la vez. O4 espera a O1 y O2. O5, O6 y O7 se reparten sobre archivos distintos tras O4. O8 espera a O4 y O1. O9 va al final, y es el único paso que toca `home.tsx`, `footer.tsx` y `globals.css`.

### 7.1 Riesgos

| Riesgo | Mitigación |
|---|---|
| pushState y el router de Next se pisan al volver atrás | Spike O0; `lastWritten` para ignorar nuestras propias escrituras; plan B con rutas reales. |
| Desajuste de hidratación (reloj, viewport, prefs) | Estado inicial derivado de la URL y no del navegador; geometría con CSS; prefs con `getServerSnapshot`; reloj tras el montaje. |
| Salto visual al aplicar posiciones persistidas | Solo afecta a quien movió ventanas; se aplica en el primer efecto tras hidratar; aceptado. |
| Peso del JS de `/os` | Presupuesto en CI; apps diferidas; datos de detalle inline solo si < 10 KB gz. |
| `Alt+Shift` choca con el cambio de idioma de Windows o con un lector | Prueba con NVDA y JAWS; opción para desactivarlos; fallback por menús (Q4). |
| Perder el scroll de la portada al entrar al SO | Cambio aceptado (Q1). |
| Minimizadas montadas consumen memoria | Solo las abiertas; cerrar desmonta; límite blando de ventanas de proyecto (p. ej. 8) y aviso. |
| Hex/z-index literales reaparecen | Tests de tokens (§2.4). |
| Conflictos entre agentes en `content/ui.ts` | Un solo propietario (agente C). |
| Hosting detrás de Cloudflare (caché de HTML) | `/os/*` son estáticos con la misma regla que el resto; la preferencia (F5) la lee el cliente. No añade `Vary`. |

## 8. Pruebas

**Vitest** (§2.4): reducer, url, geometría, persistencia, prefs, store, menús, retorno de foco, filtros, créditos, estructura y fronteras. `npm run check` obligatorio en cada paso.

**Edge headless con CDP** (`scripts/os-e2e.mjs`, sin dependencias nuevas; Node 24 trae `WebSocket`; mismo estilo que `scripts/smoke-routes.mjs` y que el resto de comprobaciones con Edge de la F3), contra el build standalone:
1. Deep link `/os/proyectos/<slug>/` y `/en/os/projects/<slug>/`: ventana abierta en el HTML inicial, sin errores de consola ni de hidratación, foco en el marco y `document.title`.
2. Intro sobre un icono → el foco va al marco; Esc no cierra la ventana; al cerrar con el botón el foco vuelve al icono.
3. Minimizar → el foco va al botón de la barra; restaurar → al marco.
4. Menú Inicio: abrir con Intro, ↓, ↑, Home, End y letra; Esc devuelve el foco; Tab cierra.
5. Toolbar con una sola parada de Tab y roving ←/→.
6. Arrastre: cero mutaciones `childList` y solo `style` en el marco; posición persistida tras recargar.
7. Mover y Tamaño por teclado y por menú de sistema; "Ajustar a la izquierda" y "Restablecer" sin arrastre.
8. Historial: abrir A, abrir B, atrás, atrás, adelante; URL y ventanas coherentes; recarga en cada paso.
9. Pocket (`Emulation.setDeviceMetricsOverride` 390×844 y táctil): lanzador, pila de ventanas, atrás cierra, `inert` en el fondo, objetivos ≥ 44 px.
10. `prefers-reduced-motion` (`Emulation.setEmulatedMedia`): sin arranque ni transiciones.
11. `inert` durante el arranque: Tab no llega al escritorio.
12. Estado por defecto: sonido y efecto de pantalla apagados, sin canvas, Clippy visible y descartable con el descarte persistente tras recargar.
13. Galería: filtros con recuentos, badges (lmilo con enlace, jdicans sin), sin proyectos duplicados.
14. `/?view=retro` redirige a `/os/` (cliente en la F4, 307 en la F5).

**Presupuesto de bundle** y **axe** [S] en CI o como paso manual documentado. **NVDA** manual para las ventanas, el menú Inicio y los anuncios (pendiente de la F7).

## 9. Preguntas abiertas (con recomendación)

| # | Pregunta | Recomendación |
|---|---|---|
| Q1 | ¿Eliminar el overlay `?view=retro` en la F4 o mantenerlo hasta la F5? | Eliminarlo en O9: un SO, una ruta. Coste: se pierde el scroll de la portada. |
| Q2 | ¿Nombre visible? ("EDAV OS", "EDAV XP") | "EDAV OS": evita "XP" y "98" y coincide con la ruta. |
| Q3 | ¿Esc cierra ventanas? | No en escritorio, sí en pocket. Documentarlo en la ayuda de atajos. |
| Q4 | ¿Atajos con Alt+Shift? | Sí, con interruptor en Propiedades; probar con NVDA, JAWS y varias distribuciones de teclado. |
| Q5 | ¿Conservar el WebGL del CRT? | No: CSS estático por defecto. Si se quiere, WebGL diferido a 15 fps y solo al activarlo. |
| Q6 | ¿Qué proyectos tienen ventana? Hay 13 con portada y 4 privados. | Los 17 en el SO (tarjeta sin imagen y sin "página pública" para los 4), con `osProject` sobre todos. Si se prefiere paridad, solo los 13: el diseño no cambia. |
| Q7 | ¿URL para otras apps (`?app=`)? | No: solo proyectos tienen URL. Menos superficie para duplicados. |
| Q8 | ¿Welcome solo o Welcome + Reproductor al inicio? | Solo Welcome: menos ruido, menos JS y menos peticiones a Last.fm. |
| Q9 | ¿Datos de detalle inline o diferidos? | Inline hasta 10 KB gz; después JSON estático por idioma. |
| Q10 | ¿Doble clic para abrir iconos? | Sí en puntero fino (fidelidad XP) con la ayuda del globo; un toque en táctil; Intro siempre. |
| Q11 | ¿Mantener un arranque? | Sí, breve (≈2 s), una vez por sesión, saltable y sin audio; fuera en pocket, deep link y reduced-motion. |
| Q12 | Barra de título pocket de 36 px (anexo 02) o 44 px | 44 px: los botones de 44×44 no caben en 36. |
| Q13 | Fuente del cromo | Pila del sistema más fuente libre autoalojada de respaldo. |
| Q14 | ¿Foco en el marco al cargar un deep link? | Sí; en `/os/` sin deep link no se roba el foco. |
| Q15 | Mascota en la F4 | Mantener `RetroClippy` en su ranura diferida con descarte persistente; todo lo demás es F6. |

### Archivos críticos para la implementación

- `C:\Users\Emman\Documents\edav-portfolio\components\desktop\desktop-shell.tsx` (se descompone y se retira)
- `C:\Users\Emman\Documents\edav-portfolio\components\portfolio-experience.tsx` (se retira en O9)
- `C:\Users\Emman\Documents\edav-portfolio\content\routes.ts` y `C:\Users\Emman\Documents\edav-portfolio\lib\i18n\pages.ts` (rutas `os` y `osProject`, equivalencia de idioma)
- `C:\Users\Emman\Documents\edav-portfolio\app\styles\theme-xp.css` y `C:\Users\Emman\Documents\edav-portfolio\app\styles\tokens.css` (cromo Luna y escala de z-index)
- `C:\Users\Emman\Documents\edav-portfolio\content\ui.ts` (microcopy `ui.os`; un solo propietario)
