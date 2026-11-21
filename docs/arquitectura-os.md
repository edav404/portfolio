# Arquitectura del SO con ventanas (Fase 4)

Diseño para guardar como `docs/arquitectura-os.md`. Base de código: rama `fase/3-arquitectura-i18n`. **Revisión v2**: incorpora la revisión de Codex (aprobado con cambios); el detalle hallazgo → cambio está en §11. Las rutas a la documentación de Next son relativas a `node_modules/next/dist/docs/01-app/`. Marcas: [V] verificado en código o docs, [S] supuesto que el spike O0 debe confirmar. **DECISIÓN DEL USUARIO** marca lo que no puede cerrar el diseño.

## 0. Decisiones

| # | Decisión | Respaldo |
|---|---|---|
| DS1 | El SO es una **ruta real** con layout propio: `app/(es)/os/` y `app/en/os/`. El shell se monta una vez en `os/layout.tsx` y sobrevive a la navegación dentro de `/os`. | `01-getting-started/03-layouts-and-pages.md`: "layouts preserve state… do not rerender" [V] |
| DS2 | **Autoridad dividida.** La URL manda sobre el **proyecto seleccionado**; el store manda sobre ventanas montadas, orden z, geometría, borradores y ventana activa. La URL no es la ventana activa. | Revisión R1 |
| DS3 | **Navegación = plan B por defecto, confirmado o revertido por el spike O0** (la elección final entre `router.push` y `pushState` propio la fija el spike):`router.push/replace(href, { scroll: false })` hacia rutas reales de proyecto; el layout compartido conserva el shell; el store solo gobierna las ventanas locales (apps sin URL). Sin `pushState` propio. URLs con `hrefFor`, comparación con `canonicalPath`. | Revisión O1: `pushState` conserva el árbol de segmentos de origen (children, canonical, `og:url` y 404 quedan del documento inicial). `01-getting-started/04-linking-and-navigating.md` |
| DS4 | **Estado = reducer puro + `useReducer`** con `WindowFrame` y apps en `memo`. El store externo (`useSyncExternalStore`) se adopta solo si la medición de renders (§3) lo exige. | La escritura por ref durante el gesto ya elimina la actualización global que motivó PERF-07 |
| DS5 | **Se elimina el overlay** `PortfolioExperience` y `html[data-os-open]`. `/` solo ofrece enlaces a `/os/`. `/?view=retro` pasa a **307 en `next.config.ts` dentro de O9** (sin `RetroRedirect` cliente). | D5 de `arquitectura-rutas.md`: público ↔ `/os` comparte layout raíz |
| DS6 | **El HTML de `/os/` se renderiza en servidor** (escritorio, taskbar, ventana inicial), sin bloqueo previo a la hidratación. No hay `ssr:false` global. Solo las apps pesadas y la mascota se cargan diferidos. | A11Y-06 y SEO sin JS |
| DS7 | **Geometría SSR-segura con CSS** (`min()`/`clamp()`). El JS aplica geometría persistida y medidas **tras hidratar**, en una transición. | Evita saltos y desajustes de hidratación |
| DS8 | **Las ventanas minimizadas permanecen montadas** con `hidden`, bajo un **contrato de suspensión** (§3). Solo cerrar desmonta. | Hoy minimizar pierde el estado del formulario y la terminal |
| DS9 | Marca visible: **"EDAV OS"** (cromo Luna propio), sin "98", BIOS ni "XP" en la marca. | UI-01, UI-11; Q2 |
| DS10 | **Un único catálogo explícito de proyectos autorizados** para el SO (§1.4), reutilizado en SSG, `knownSlugs`, selector de idioma, galería y detalle. | Revisión O6 |
| DS11 | **Pocket = una pantalla activa con encabezado y botón Atrás local.** Sin segundo protocolo de historial. | Revisión R2/O3 |

## 1. Rutas

### 1.1 Árbol

```
app/
  (es)/os/
    layout.tsx                  ← adaptador: <OsLayoutView locale="es">{children}</OsLayoutView>; metadata robots noindex
    page.tsx                    ← osMetadata("es"); devuelve null
    proyectos/[slug]/page.tsx   ← generateStaticParams (catálogo OS, §1.4) + dynamicParams=false; osProjectMetadata; devuelve <ProjectDetail slug> (solo el detalle de ese proyecto)
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
- Las páginas siguen el contrato de `arquitectura-rutas.md` §2: adaptadores de ~10 líneas con `dynamicParams = false` y `generateStaticParams`. **`tests/unit/route-files.test.ts` debe resolver la raíz según la familia de rutas**: hoy busca todas las páginas bajo `(site)` y las rutas OS son hermanas de `(site)`. Cambiarlo en el mismo paso que subir `CURRENT_PHASE` a 4 (O3), o el test falla.
- `/os/` devuelve `null`. Las páginas de proyecto devuelven `<ProjectDetail>` con los datos de **un solo** proyecto; el shell lo monta dentro de la ventana correspondiente y lo guarda en una caché de sesión (§1.2). El respaldo sin JS no vive en las páginas sino en el shell (§1.5).

### 1.2 Layout persistente

```tsx
// components/views/os.tsx (servidor)
export function OsLayoutView({ locale, children }) {
  const os = uiFor(locale, "os");                       // ~2,6 KB gz
  const index = osProjectIndex(locale);                 // lean y SOLO del catálogo autorizado: slug,title,kind,ownership,status,year,category,summary,image,hrefPublic,credits[{name,role,href?}]
  return <OsShell locale={locale} copy={...} projects={index} knownSlugs={osProjectSlugs()} other={{ href: languageIndexForOs(locale), label }}>{children}</OsShell>;
}
```

- **Los detalles no viajan como props del layout.** challenge, solution, myRole, services, technologies y links los entrega la página del slug (`<ProjectDetail>`, solo ese proyecto) como `children`. El shell guarda en una caché de sesión (`detailBySlug`) el nodo recibido, para que las ventanas ya abiertas lo conserven aunque la ruta cambie. Una ventana de proyecto sin detalle todavía (navegación en curso) muestra la cabecera del índice (título, categoría, resumen) y un estado de carga. Si no se abre ninguna ventana, no se entrega ningún detalle.
- Se importa `@/components/os/os.css` aquí. Es CSS de segmento, pero **Next no lo retira al salir en navegación suave** (`01-getting-started/11-css.md`): los tokens y reglas nuevos van bajo `.os-root` o en CSS Modules mientras convivan con el overlay, y no pisan selectores globales. `app/desktop.css` se borra en O9.
- `<div class="os-root" data-theme="xp">` con `position: fixed; inset: 0; isolation: isolate`. Sin `body:has()` ni `html[data-os-open]`. Cumple D4 y §2.1 de `arquitectura-rutas.md`.
- **Presupuesto de datos**: el índice del catálogo (13 proyectos por defecto) es del orden de unos pocos KB gz en HTML y RSC. El criterio se mide sobre **datos transferidos** (HTML + RSC + JS + CSS + imágenes), no sobre el peso de la fuente (§2.3).

### 1.3 Vínculo URL ↔ ventana (plan B)

**Autoridad.** La URL manda sobre el *proyecto seleccionado*: el último proyecto abierto, restaurado o alcanzado con Atrás/Adelante por intención explícita. El store manda sobre las ventanas montadas, el orden z, la geometría, los borradores y la ventana activa. **La URL no es la ventana activa**: abrir Contacto o enfocar otra ventana no la cambia. Consecuencia aceptada y documentada: recargar `/os/proyectos/a/` reabre solo A (las apps locales y sus borradores no se restauran).

**Navegación real.** Abrir un proyecto es `router.push(hrefFor("osProject", locale, slug), { scroll: false })`. El layout `os/` persiste, el shell conserva las ventanas y Next resuelve para esa ruta los `children`, el canonical, `og:url`, el título y el 404 reales. No hay `pushState` propio, `document.title` manual ni `lastWritten`. Las URLs se generan con `hrefFor` y se comparan con `canonicalPath` (con y sin barra final).

**Estado añadido al reducer.** `selection: string | null` (slug seleccionado, espejo de la URL), `openedBy[windowId]` (id de la entrada de historial que abrió cada ventana de proyecto) y `entries[]` + `entryIndex` (pila de ids de entrada propias, solo en memoria). Cada acción lleva un **origen**: `"user"`, `"route"` o `"hydrate"`.

**Flujo (sin bucles, sin filtro por pathname).**
1. Acción del usuario: un hook `useOsNavigation` hace `dispatch({ type, origin: "user" })` y, en el mismo manejador, llama a `router.push/replace` si la regla de abajo lo exige. Tras el `push`, `history.replaceState({ ...history.state, osEntry: id }, "")` marca la entrada con un id propio [S: el spike O0 comprueba que Next tolera el estado ampliado; si no, se usa solo el fallback por URL].
2. La ruta cambia (por nuestra acción, Atrás/Adelante, un `<Link>` externo, deep link o recarga): `usePathname` dispara `dispatch({ type: "ROUTE_CHANGED", target, entryId?, origin: "route" })`, con `entryId` leído de `history.state.osEntry`.
3. `ROUTE_CHANGED` es una **transición idempotente**: si `selection` ya coincide con el destino y la ventana está abierta y visible, devuelve la misma referencia. Dos entradas consecutivas con el mismo pathname no rompen nada; el efecto no necesita filtrar por pathname porque la transición es la misma desde cualquier origen.

**Reglas de historial (escritorio).**

| Acción del usuario | Estado | Historial |
|---|---|---|
| Abrir un proyecto distinto de la selección (galería, Welcome, enlace interno, restaurar desde la barra una ventana de proyecto minimizada) | Abre o restaura, enfoca, `selection = slug`, `openedBy[id] = entrada nueva` | `router.push` |
| Abrir el proyecto ya seleccionado | Restaura y enfoca | Ninguno |
| Abrir una app local | Abre y enfoca; `selection` intacta | Ninguno |
| Enfocar una ventana ya visible (clic, Tab, barra de tareas, ciclo de ventanas) | Solo orden z | Ninguno. El foco no contamina el historial ni cambia la selección |
| Minimizar la ventana seleccionada | Minimiza; `selection = null` | `router.replace("/os/")` |
| Cerrar la ventana seleccionada | Cierra; `selection = null` | `router.replace("/os/")` |
| Minimizar o cerrar cualquier otra ventana | Normal | Ninguno |
| `<Link>` externo a `/os/proyectos/x/` | Lo trata `ROUTE_CHANGED` (fallback por URL) | Lo hace Next |

`replace` tras cerrar o minimizar puede dejar dos entradas consecutivas `/os/`. Se acepta: un Atrás extra no hace nada visible gracias a la idempotencia. Se descartó usar `router.back()` para evitarlo (asíncrono y frágil si el usuario navegó entre medias).

**Atrás y Adelante.** `ROUTE_CHANGED` usa el `entryId` de la entrada destino:
- *Entrada propia conocida, anterior* (Atrás): se cierran las ventanas de proyecto cuyo `openedBy` sea una entrada posterior a la destino (se deshace la apertura), `selection` pasa a la de esa entrada y se enfoca esa ventana (se restaura si estaba minimizada). Las apps locales y los proyectos abiertos por entradas anteriores no se tocan.
- *Entrada propia conocida, posterior* (Adelante): se reabre el proyecto que abrió esa entrada y se selecciona.
- *Entrada ajena, sin id (deep link, recarga, `<Link>` externo, entrada de otra sesión)*: fallback puro por URL. `project(slug)` abre, restaura y enfoca esa ventana y la selecciona; `desktop` limpia la selección y cierra solo la ventana de proyecto que estaba seleccionada, si la abrió una entrada de navegación. Un slug fuera del catálogo no llega aquí: Next responde 404 (§1.4).
- Secuencia comprobable: abrir A, abrir B, enfocar A (sin historial), Atrás (→ A seleccionada, B cerrada por deshacer su apertura), Atrás (→ `/os/`, A cerrada), Adelante ×2 (reabre A, luego B).

**Modo Pocket.** Los proyectos siguen siendo rutas y usan estas reglas. Las apps locales **no crean entradas**: Atrás, ✕ y Escape son una transición local (§5.4). Entrada directa sin predecesora propia: Atrás local cierra hacia el lanzador sin llamar a `history.back()`.

**Verificación [S] en O0.** Comparar, con `router.push(..., { scroll: false })`, navegación fría y precalentada, Atrás, Adelante, recarga, entrada directa sin barra final y salida a la web: cuántas peticiones RSC se hacen y de qué tamaño, qué scroll se restaura (el del documento frente al interno de cada ventana), y que `usePathname` cambia en Edge y en el HTML estático.

### 1.4 Catálogo de proyectos autorizados (SSG)

- **UN catálogo explícito**: `osProjectSlugs` en `content/projects.ts` (lista tipada contra los slugs existentes), con derivados `osProjectIndex(locale)` y `osProjectDetail(locale, slug)`. Es la única fuente para `osProjectParams()` (`generateStaticParams`), `knownSlugs`, `refs()` de `osProject` (selector de idioma), la galería y la página de detalle. Un test compara que los cuatro consumidores devuelven el mismo conjunto.
- **DECISIÓN DEL USUARIO (Q6).** "Sin portada" no equivale a "privado". Por defecto, hasta que el usuario decida, el catálogo contiene **solo los 13 de `caseStudies`**. Si el usuario autoriza publicar los 4 restantes en el SO, hay que confirmar además qué campos se muestran (no tienen portada ni página pública): se añaden al catálogo y a la vez a SSG, selector de idioma y galería, y su ventana omite "Ver página pública".
- Cada slug de `os/proyectos/[slug]` exporta `dynamicParams = false` (ya forzado por `app-structure.test.ts`). Con un solo catálogo ya no existe un slug navegable que devuelva 404 al recargar.
- **Slugs excluidos bajo `/os/`**: acceso directo a `/os/proyectos/<excluido>/` y `/en/os/projects/<excluido>/` responde 404 con `noindex` y sin canonical. ES lo atiende `global-not-found`; EN el catch-all `app/en/(site)/[...missing]`, que queda fuera del layout `os` (se renderiza con el shell público; aceptable). [S: el spike O0 mide esto bajo `/os/`, porque las mediciones de `arquitectura-rutas.md` §9 son de rutas públicas.] Tests: status, `noindex`, canonical e idioma de un slug excluido, tanto en acceso directo como confirmando que ningún enlace lo ofrece.

### 1.5 Convivencia con `/?view=retro` y el overlay

| Momento | Comportamiento |
|---|---|
| Hasta O9 | `PortfolioExperience` y `desktop-shell.tsx` siguen funcionando. El SO nuevo se construye al lado en `components/os/`, sin tocarlos. |
| O9, cambio de contrato (último paso, tras Pocket y QA) | `DesktopLaunchButton` pasa a `<Link href={href("os", locale)} prefetch={false}>` con precarga **por intención** (`onPointerEnter`/`onFocus` → `router.prefetch`). El enlace de `components/footer.tsx:24` apunta a `href("os", locale)`. `PortfolioExperience`, `loadDesktop`, el `createPortal` y `html[data-os-open]` se eliminan. `HomeView` deja de resolver `os` (≈2,6 KB gz menos en `/`). |
| O9, `?view=retro` | `next.config.ts` `redirects()` con `has: [{ type: "query", key: "view", value: "retro" }]`, **307** (`permanent: false`) de `/` a `/os/` y de `/en/` a `/en/os/`. Sin `proxy.ts` (D3). No hay `RetroRedirect` cliente. |

**`Location` exacto del redirect.** Next reenvía la query de origen al destino (documentado), así que el destino real es **`/os/?view=retro`** (y `/en/os/?view=retro`); cualquier parámetro adicional también se reenvía. Se acepta: `/os/` ignora los parámetros que no conoce, su canonical es fijo y es `noindex`. Si se prefiere un destino limpio, hará falta una regla de servidor que retire `view` de forma explícita; es una decisión del usuario, no necesaria para el corte. Se mantiene 307 mientras el cambio sea reversible; 308 solo tras decidir que la retirada del enlace antiguo es permanente (señal de canonicalización más fuerte). Se prueba ES y EN, con y sin barra final, con parámetros extra y la portada sin `view`, en origen y a través de Cloudflare.

**Respaldo sin JS.** El shell renderiza al inicio de `.os-root` un `<noscript>` **visible**, localizado (copy de `ui.os`) y con un `<a href={home}>` enfocable. No usa `sr-only` (esa clase recorta el contenido). El escritorio sin JS es solo una superficie sin función.

**Salida del SO.** "Vista web" (Inicio → "Cerrar sesión" y la bandeja) es un `<Link>` a `href("home", locale)`. Es navegación normal con scroll arriba. La devolución del foco del overlay deja de existir; el foco lo gestiona el navegador en la nueva página. Se pierde la posición de scroll de la portada: coste aceptado (Q1, tras validar el corte).

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
export type Origin = "user" | "route" | "hydrate";
export type OsState = {
  windows: Partial<Record<WindowId, WindowState>>;   // presentes = abiertas (incl. minimizadas)
  order: WindowId[];                                  // z-order: el último es el tope; z-index = índice (0…n-1)
  viewport: { w: number; h: number };                 // por defecto 1280×720; el cliente lo actualiza
  cascade: number;                                    // contador para posiciones en cascada
  selection: string | null;                           // slug del proyecto seleccionado (espejo de la URL, §1.3)
  openedBy: Partial<Record<WindowId, string>>;        // id de la entrada de historial que abrió cada ventana de proyecto
  entries: string[]; entryIndex: number;              // pila de ids de entrada propias (solo memoria)
};
export type Action = { origin?: Origin } & (          // origen de la acción; por defecto "user"
  | { type: "OPEN"; id: WindowId }                          // abre o, si ya existe, restaura y enfoca
  | { type: "CLOSE"; id: WindowId }
  | { type: "FOCUS"; id: WindowId }                         // restaura si estaba minimizada
  | { type: "MINIMIZE"; id: WindowId }
  | { type: "TOGGLE_MAXIMIZE"; id: WindowId }
  | { type: "MOVE"; id: WindowId; x: number; y: number }    // commit al soltar o por teclado
  | { type: "RESIZE"; id: WindowId; w: number; h: number; x?: number; y?: number }
  | { type: "NUDGE"; id: WindowId; dx: number; dy: number; dw: number; dh: number }  // controles de pasos de un solo puntero (§3.1)
  | { type: "SNAP"; id: WindowId; to: "left"|"right"|"center"|"default" }   // alternativa sin arrastre
  | { type: "RESET_GEOMETRY"; id?: WindowId }
  | { type: "HYDRATE"; viewport: { w: number; h: number }; saved: Record<string, Rect & { maximized?: boolean }> }  // medidas + almacenamiento tras hidratar: aplica y re-clampa en UNA transición
  | { type: "SET_VIEWPORT"; w: number; h: number }
  | { type: "ROUTE_CHANGED"; target: { kind: "desktop" } | { kind: "project"; slug: string }; entryId?: string; known: readonly string[] }
  | { type: "POCKET_BACK" }                                  // Atrás, ✕ y Escape en Pocket comparten esta transición
  | { type: "MINIMIZE_ALL" } | { type: "CLOSE_ALL" }
  | { type: "CYCLE"; dir: 1 | -1 });
export function reduce(state: OsState, action: Action): OsState;
export function createInitialState(opts: { path: string; locale; knownSlugs: readonly string[]; viewport? }): OsState;
```

- **Selectores puros en el mismo módulo:** `activeId(state)` (la última de `order` no minimizada), `visibleIds`, `zIndexOf`, `nextAfterClose(state, id)`.
- **Estado derivado, no almacenado.** `activeId` se deriva, así que no hay invariantes que sincronizar.
- **Estabilidad referencial.** `reduce` devuelve la misma referencia si la acción no cambia nada, y conserva el objeto `WindowState` de las ventanas no tocadas. Esto hace posible `memo`.
- **Geometría en `lib/os/window-geometry.ts`.** `defaultRect(id, cascade, viewport)`, `clampRect(rect, viewport)`, `snapRect(to, viewport)`, `MIN_W = 320`, `MIN_H = 220`. Constantes `TASKBAR_H = 30`, `TITLEBAR_H = 30` y `MOBILE_MAX = 768`. Todas coinciden con los tokens CSS (un test lo comprueba leyendo `os.css`). Clamp: la barra de título nunca queda fuera de pantalla (≥ 80 px visibles en x, y ≥ 0 hasta `h − TASKBAR_H − TITLEBAR_H` en y). Esto cierra COD-08, porque `innerWidth < 769` deja de estar en la lógica.
- **Inicio.** `/os/` abre solo `welcome`. Recomiendo no abrir `media` al inicio (Q8). `/os/proyectos/<slug>/` abre solo `project:<slug>`, sin Welcome encima.
- **`OsEvent`.** `deriveEvents(prev, next, action)` es pura. Devuelve `opened | closed | minimized | restored | maximized | focused | moved | reset`. Lo consumen el anunciador, el gestor de foco y (F6) el bus de la mascota (MAS-08).
- **Persistencia en `lib/os/persistence.ts`.** `serialize/parse` con versión (`edav-os:v1`) y validación defensiva de rects. Se escribe tras `MOVE/RESIZE/NUDGE/TOGGLE_MAXIMIZE/RESET`, con debounce y `try/catch`. **Tolera almacenamiento bloqueado (Safari privado, política del navegador) o corrupto**: ante cualquier error se usan los valores por defecto y no se lanza. Lectura de `localStorage` y medida del viewport solo **tras hidratar**; la acción `HYDRATE` aplica las posiciones y las re-clampa al viewport real en una sola transición.
- **Preferencias en `lib/os/prefs.ts`.** `{ sound:false, screenEffect:false, assistant:"clippy"|"none", shortcuts:false }` (atajos globales **opt-in**, Q4), con `parse` y valores por defecto. El snapshot de servidor devuelve los defaults. **`getSnapshot` y `getServerSnapshot` devuelven el mismo tipo y referencias estables** (objeto de defaults congelado; una selección compuesta se memoiza), para no provocar desajuste ni bucles de render.

### 2.2 Estado en React: `useReducer` primero, store solo si se mide

`OsShell` usa `useReducer(reduce, initial)` con `dispatch` estable; `WindowFrame` y las apps van en `memo`, con props primitivas y el `rect` estable que garantiza el reducer. Cada `WindowFrame` recibe solo su ventana, su índice z y un booleano `isActive`. La escritura por ref durante el gesto (§3) ya elimina la actualización global que motivó PERF-07, así que se **mide primero** con este esquema. Contingencia: si el perfil de renders lo exige, `createOsStore(reducer, initial)` (≈30 líneas, sin React: `{ getState, dispatch, subscribe, subscribeEvents }`) con `useOsSelector` sobre `useSyncExternalStore`; ahí `getServerSnapshot` debe devolver el mismo tipo y referencias estables que `getSnapshot`. El reducer puro y `lib/os/window-reducer.ts` no cambian en ningún caso.

### 2.3 Descomposición de `desktop-shell.tsx` (ARQ-03)

| Módulo | Frontera | Contenido |
|---|---|---|
| `components/views/os.tsx` | servidor | Resuelve `ui.os`, proyectos proyectados y equivalencia de idioma. Es el único que importa `content/ui.ts` y `content/projects.ts` (COD-07). |
| `components/os/os-shell.tsx` | cliente (núcleo) | `useReducer` del escritorio, contextos (`OsCopy`, estado, prefs), caché de detalles de proyecto, banner `<noscript>`, escritorio, capa de ventanas, taskbar y el `h1`. |
| `components/os/desktop-surface.tsx` | cliente | Fondo, lista de iconos (`ul` con botones), menú contextual. |
| `components/os/window-layer.tsx` y `window-frame.tsx` | cliente | `WindowFrame` en `memo`. Barra de título, botones, menú de sistema, tiradores de redimensionado. Solo `rect`, `z`, `isActive` y `copy` como props. |
| `components/os/taskbar.tsx` | cliente | Toolbar (Inicio + ventanas) y bandeja. |
| `components/os/start-panel.tsx`, `context-menu.tsx`, `system-menu.tsx`, `menu.tsx` | cliente | `start-panel.tsx` es un **Disclosure** (§4). `menu.tsx` es la primitiva de menú con roving (`useMenu`) y solo la usan el contextual y el de sistema. |
| `components/os/use-pointer-drag.ts` | cliente | Hook compartido con `RetroClippy` (cierra la parte de DEP-03). |
| `components/os/use-focus-manager.ts`, `announcer.tsx`, `use-os-navigation.ts`, `use-shortcuts.ts`, `sound.ts` | cliente | Foco al abrir y cerrar, anuncios, `router` + reglas de historial (§1.3), atajos opt-in y un único `AudioContext` perezoso. |
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
- Aplicación: un script `scripts/check-bundle-budget.mjs` falla en CI si se supera (comprobar si Next 16.4.6 deja `route-bundle-stats` en `.next/diagnostics`; si no, sumar los chunks que lista el manifest de `/os`). Atribución con `next analyze --output`.
- **Se mide por separado** (JS transferido, HTML/RSC, CSS, fuentes e imágenes; red del build standalone): (1) carga de la portada, que debe tener **cero tráfico del SO** antes de interactuar (por eso `prefetch={false}` en los enlaces a `/os/` y precarga solo por intención); (2) carga fría de `/os/`; (3) deep link a un proyecto; (4) coste incremental por app; (5) precarga por intención.

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
20. `ROUTE_CHANGED project` abre o enfoca y fija `selection`; slug ausente de `known` es no-op.
21. `ROUTE_CHANGED desktop` limpia `selection` y cierra solo la ventana de proyecto abierta por la entrada que se deshace; no cierra apps ni proyectos abiertos por otras entradas.
22. Secuencias de historial: (a) abrir A, abrir Contacto: `selection` sigue en A; (b) abrir A, minimizar A: `selection = null`; (c) abrir A, abrir B, enfocar A: ni selección ni entradas cambian; (d) abrir A, abrir B, Atrás, Atrás, Adelante, Adelante: ventanas y selección cuadran con cada entrada (incluido el paso intermedio que apunta a A); (e) entrada ajena o sin id: fallback por URL; (f) `ROUTE_CHANGED` repetido devuelve la misma referencia; (g) `origin: "route"` nunca produce una llamada de historial.
22b. `NUDGE` respeta mínimos y clamp. `POCKET_BACK` cierra la ventana superior y es la misma transición para Atrás, ✕ y Escape; con una sola ventana vuelve al lanzador.
22c. `HYDRATE` con viewport nuevo y rects guardados re-clampa en una sola transición; tolera `saved` vacío o corrupto.
23. `CYCLE` ±1 recorre las visibles en orden y da la vuelta.
24. `MINIMIZE_ALL` seguido de `FOCUS` restaura solo la elegida. `CLOSE_ALL` vacía.
25. `createInitialState`: `/os/` → solo `welcome`; `/os/proyectos/x/` → solo `project:x`; slug desconocido → como `/os/`; ES y EN equivalentes.
26. Invariantes (property test sencillo con acciones aleatorias): `order` = claves de `windows` sin duplicados; los `rect` finitos.
27. Pureza: no muta el estado de entrada (`Object.freeze` profundo).

**`os-window-url.test.ts`** (`planHistory` e `intentFromPath`): la tabla de reglas de §1.3 una a una (push / replace / ninguno); acciones con `origin: "route"` → ninguno; Pocket (las apps locales no crean entradas); `/os/`, `/en/os/`, `/os/proyectos/x/` y con o sin barra final (`canonicalPath`); `%2F`, `.` y `..` no son rutas (reutiliza `matchPath`); el catálogo único coincide en `generateStaticParams`, `knownSlugs`, `refs()` y galería.

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
3. **Finalización única e idempotente.** `finish(reason: "commit" | "cancel")` con guarda `done`, enganchada a `pointerup`, `pointercancel`, `lostpointercapture` y Escape. Cancela el último `requestAnimationFrame` pendiente (`cancelAnimationFrame`), y con `commit` hace un solo `dispatch({ type: "MOVE", id, x, y })`; con `cancel` descarta la posición. Quita `will-change`. Un `useLayoutEffect` en `WindowFrame`, dependiente de `rect.x/y`, borra `style.transform` antes de pintar. Si el desplazamiento fue 0, se borra en el propio handler. Llamarla varias veces (p. ej. `pointerup` seguido de `lostpointercapture`) no repite el commit.
4. Redimensionado: igual, pero se escribe `style.width/height` por ref en rAF (layout de esa ventana, sin render de React) y se confirma con `RESIZE`. `contain: layout paint` en `.os-window`. Si el contenido interno se resiente (galería de 17 miniaturas), plan B: durante el gesto mostrar el contorno fantasma de XP ("mostrar contenido al arrastrar" apagado) y aplicar el tamaño al soltar.
5. Escape durante el gesto llama a `finish("cancel")` y restaura la posición anterior.

**Aislamiento del render.**
- `WindowFrame` es `memo` y recibe props primitivas más el `rect` estable. El contenido (`apps/*`) está detrás del propio `memo`.
- Ningún componente lee el estado completo. El `<time>` del reloj vive en su propio componente, con `setInterval` de 30 s.
- `use-os-history` y `persistence` se suscriben fuera de React.
- `prefers-reduced-motion`: sin transiciones de ventana.

**Criterios de aceptación (CDP en Edge, build standalone).** `MutationObserver` solo no basta (no demuestra cero renders) y Event Timing no mide `pointermove`; se combinan varias señales:
- **Conteo de renders** (contador de render de `WindowFrame` y apps en una build de prueba, o `Profiler.onRender`): **cero** renders de React durante un arrastre de 60 `pointermove`.
- **Marcas del handler y de rAF** (`performance.mark`): como máximo una escritura de `transform` por frame; ninguna tras `finish`.
- **Traza de frames** (`Tracing` o `Performance.getMetrics`): sin tareas largas > 50 ms atribuibles a React con 4× de ralentización de CPU.
- `MutationObserver` sobre `.os-windows` como comprobación complementaria: cero `childList` y solo `style` en el marco arrastrado.
- **Cancelación**: `pointercancel`, `lostpointercapture` y Escape dejan la ventana en su sitio anterior (o en el final si fue commit), sin `will-change` ni `transform` residuales y con un único commit.
- Tras soltar y recargar, la ventana está en el mismo sitio (persistencia).

**Contrato de suspensión (ventanas minimizadas montadas).** Una ventana minimizada sigue montada pero no puede consumir recursos: `useWindowVisibility()` expone `hidden`, y toda app con efectos continuos debe **pausar** al ocultarse y reanudar al mostrarse: temporizadores y sondeo, audio (el `AudioContext` único se suspende si no hay ventana visible que lo use), animaciones y `MusicWidget` (hoy hace un `fetch` al montar, sin ciclo de polling: si se añade sondeo, queda bajo este contrato). Test: con la ventana minimizada, no hay timers ni peticiones periódicas.

### 3.1 Alternativa sin arrastre (WCAG 2.5.7, A11Y-14)

- **Menú de sistema** en el icono de la barra de título: `button aria-haspopup="menu"` con nombre "Menú de ventana de {título}". Se abre con clic, Intro, Espacio, ↓, Shift+F10 y clic derecho sobre la barra. Elementos (`menuitem`, todos operables con un solo clic): Restaurar, Mover, Tamaño, Minimizar, Maximizar, **Ajustar a la izquierda**, **Ajustar a la derecha**, **Centrar**, **Restablecer posición**, Cerrar. "Ajustar…", "Centrar" y "Restablecer" no necesitan teclado fino ni arrastre.
- **Modo Mover y Tamaño** por teclado: ← ↑ ↓ → mueve 16 px (Mayús 64 px), Intro confirma, Esc cancela y restaura. Anuncio único: "Moviendo la ventana {título}. Flechas para mover, Intro para confirmar, Esc para cancelar." Cada pulsación hace un `MOVE`; basta con renderizar una ventana.
- **El tirador de redimensionado** pasa a ser decorativo (`aria-hidden`, sin tab stop, `tabindex="-1"`). Quita un tab stop por ventana y el teclado queda en el menú de sistema. Cierra además la parte de A11Y-11 sobre controles falsos.
- **"Restablecer ventanas"** está en el menú contextual del escritorio y en la app Propiedades (`RESET_GEOMETRY` sin id).
- **Objetivos de puntero** ≥ 24×24 en desktop y 44×44 con `pointer: coarse` (A11Y-12). Los botones de ventana Luna miden 21 px en XP real: aquí 24, con el borde visual de 21 y el resto como área clicable por `::before`.
- **Controles de pasos de un solo puntero (WCAG 2.5.7).** El menú de sistema incluye "Mover y cambiar tamaño…", que abre un panel con botones de clic o toque: ← ↑ ↓ → (16 px; "x4" para 64 px) y ancho/alto − / + (mismo paso), "Hecho" y "Cancelar". Cada pulsación es un `NUDGE` y se anuncia con mensaje agrupado. Permite obtener con clics las mismas posiciones y tamaños que el arrastre, y no depende del teclado ni del arrastre. Los botones miden ≥ 24×24.
- **Mascota (F4).** Si `RetroClippy` conserva el arrastre, debe tener alternativa sin arrastre ya en F4: botón "Cambiar de esquina" (cuatro esquinas) en su globo y en Propiedades. Detalle en §5.4b.

## 4. Accesibilidad (ARIA APG)

**Landmarks y encabezados.** El `os-root` contiene `<h1 class="sr-only">EDAV OS — escritorio de Emmanuel Dávila</h1>` permanente (A11Y-15). Las ventanas usan `h2` en la barra de título. `<main id="os-desktop">` envuelve iconos y capa de ventanas. La taskbar queda fuera de `main`. Enlace de salto "Ir a la ventana activa", que enfoca el marco de la activa o el de Welcome. Sin `role="application"`.

**Ventana = `dialog` no modal (escritorio).**
```html
<div role="dialog" aria-modal="false" aria-labelledby="win-{id}-title" id="win-{id}" tabindex="-1" hidden?={minimized}>
  <div class="os-titlebar">
    <button aria-haspopup="menu" aria-expanded aria-label="Menú de ventana de {título}">icono</button>
    <h2 id="win-{id}-title">{título}</h2>
    <button aria-label="Minimizar {título}"/> <button aria-label="Maximizar {título}" aria-pressed/> <button aria-label="Cerrar {título}"/>
  </div>
  <div class="os-window-content" tabindex="-1" aria-labelledby="win-{id}-title">…</div>
</div>
```
- Se eliminan `aria-label` sobre `section`, la tira de menús falsa (Archivo/Editar/Ver/Ayuda) y los botones ←/→/↑ sin acción (UI-07, A11Y-11).
- Los nombres accesibles contienen el texto visible (2.5.3).
- **En Pocket (≤768 px) la ventana no es un diálogo modal**: es la pantalla activa, con `role="region"` y `aria-labelledby`, encabezado con Atrás local y sin `aria-modal` (§5.4). Los atributos que dependen del modo se aplican tras hidratar; el CSS ya resuelve el diseño en SSR.

**Foco.**
- **Destino por app** (campo `initialFocus` del registro de apps, con un único dueño, §7): `"content"` (por defecto) enfoca la raíz del contenido (`.os-window-content`, `tabindex=-1`, con nombre = título), de modo que **el siguiente Tab entra al contenido** y no a los botones del cromo (que van antes en el DOM; son accesibles con Mayús+Tab y desde el menú de sistema). `"heading"` (proyectos largos: el `h2`, `preventScroll`) y `"control"` (la terminal enfoca su campo; pierde el `autoFocus`) son excepciones declaradas. Enfocar el marco no garantiza que el siguiente Tab entre al contenido, por eso no es el destino por defecto.
- **Se mueve el foco solo donde hace falta**: al abrir por acción del usuario sobre una ventana nueva o restaurada. Enfocar una ventana ya visible por clic no lo mueve. Un deep link a un proyecto enfoca el destino de esa ventana (se llegó con intención). Cargar `/os/` sin deep link **no roba el foco**, tampoco al terminar el arranque. Atrás/Adelante enfocan el destino solo si la ventana apareció o cambió de selección.
- **Devolución al cerrar.** El gestor guarda el activador al abrir: `document.activeElement`, o el elemento con `data-focus-return="<id>"`. **Solo se devuelve el foco si estaba dentro de la ventana que desaparece**; si el usuario estaba en otra parte, no se mueve. Cadena (función pura `resolveReturnTarget`, testeada): activador conectado y visible → botón de Inicio (si vino de un menú) → icono del escritorio de esa app → destino de la siguiente ventana activa → raíz del escritorio. Todo `focus()` usa `preventScroll: true`.
- **Minimizar** envía el foco al botón de esa ventana en la barra de tareas, que **pasa a ser la parada roving** de la toolbar y se desplaza a la vista. **Restaurar** desde la taskbar enfoca el destino de la app.
- **Enfocar por clic o Tab dentro de una ventana inactiva** la activa (`onFocusCapture` → `FOCUS`). No se reordena el DOM de ventanas.
- Foco visible: doble anillo de A11Y-03 (`--os-focus-*`). Foco no tapado (2.4.11): ninguna capa (mascota, taskbar, otra ventana) puede ocultar por completo el elemento enfocado; ver §5.4b y §5.2.

**Escape.** Cierra, en este orden, el elemento transitorio superior: menú (contextual o de sistema), panel de Inicio, globo, panel de pasos o modo Mover/Tamaño. **No cierra ventanas en escritorio**, para no perder lo escrito en el formulario o la terminal (§5.5 del anexo 03); el cierre es por botón, menú de sistema o atajo opt-in. En Pocket, Escape ejecuta `POCKET_BACK`, la misma transición que Atrás y ✕. **Todas las vías de cierre (✕, Atrás, Escape, atajo) pasan por `requestClose(id)`**, que respeta una política común de borradores: una app con cambios sin enviar (Contacto) lo declara con `useWindowGuard` y se pide confirmación en línea. Tensión con el APG de diálogo: ver Q3.

**Barra de tareas = `toolbar`.**
- `<div role="toolbar" aria-label="Barra de tareas" aria-orientation="horizontal">` con Inicio y los botones de ventana. Roving tabindex, ←/→/Home/End, **una sola parada de Tab**. Al minimizar, el botón que recibe el foco pasa a ser la parada roving y se desplaza a la vista.
- Botón de ventana: nombre "Mi trabajo" más texto oculto "minimizada" o "activa", `aria-pressed`, `aria-controls` (las minimizadas siguen montadas, por lo que el id existe).
- La bandeja es otro grupo (`role="group" aria-label="Área de notificación"`) con paradas normales: idioma (enlace), sonido (`aria-pressed`, nombre fijo "Sonido"), efecto de pantalla (`aria-pressed`, "Efecto de pantalla antigua"), mascota, y `<time dateTime>` con `aria-label` de fecha y hora completas (no enfocable). Los nombres no cambian con el estado. **El reloj usa un placeholder estable en SSR y primer render cliente** ("--:--") y se completa tras montar.

**Inicio = Disclosure** (decisión de la revisión; sustituye al Menu Button).
- Botón "inicio": `aria-expanded` y `aria-controls="os-start-panel"`. Sin `aria-haspopup` ni roles `menu`/`menuitem`: el panel es un contenedor con grupos (`role="group"` con nombre "Programas", "Sistema") de **botones y enlaces normales**.
- Teclado: Intro o Espacio alternan; Tab recorre el contenido en orden natural (sin trampa); Esc cierra y devuelve el foco al botón; clic fuera cierra. No exige flechas, typeahead ni roving.
- "Todos los programas" es **otro Disclosure** dentro del panel (botón con `aria-expanded` que muestra una lista). Si en cambio se quisiera un submenú real, habría que definir ←/→, estado expandido y retorno al `menuitem` padre; no se hace.
- **En Pocket**, el botón de Inicio es operable siempre (la barra de tareas es un landmark normal, no queda inerte) y abre una hoja a pantalla completa. Mientras la hoja está abierta, el resto (ventana activa y lanzador) va `inert`; la barra de tareas sigue operable para poder cerrarla con el mismo botón. No hay captura de Tab (no es modal). Al elegir un elemento, la hoja se cierra y el foco sigue la regla de la app abierta; al cerrarla (Esc o botón), vuelve al botón de Inicio.

**Menú contextual del escritorio.** `role="menu"`. Se abre con clic derecho **solo sobre el fondo** (A11Y-15: no bloquea el menú nativo en campos), con la tecla Menú o Shift+F10 sobre la lista de iconos. Elementos: Restablecer ventanas, Mostrar escritorio, "Efecto de pantalla antigua" (`menuitemcheckbox`) y Propiedades. Se quitan "Actualizar" y "Abrir terminal" como relleno (UI-07).

**Iconos.** `ul[role=list][aria-label]` con botones. **Un clic abre la app, como hoy** (Q10): el doble clic no puede ser la única apertura con puntero fino (2.5.1) y se evita exigirlo. Si en algún caso se mantiene "seleccionar con un clic", hay una acción visible "Abrir" y el menú contextual del icono la ofrece. Teclado: Intro o Espacio abre; flechas mueven entre iconos. Primer arranque: globo de bandeja "Haz clic en un icono para abrirlo" (UX-11). Probar equipos híbridos por tipo de puntero (`pointerType`).

**Atajos globales (opt-in, Q4).** **Desactivados por defecto**; se activan en Propiedades (`prefs.shortcuts`). WCAG 2.1.4 regula atajos de un solo carácter; una combinación con Alt+Shift no está cubierta, y su riesgo es de **interoperabilidad** (Alt+Shift cambia el idioma de teclado en Windows, lectores de pantalla). Se mantiene el modificador y la opción de desactivar. Reglas: se compara con `event.code` (posición física de la tecla) y **la ayuda visible muestra esa misma tecla** ("Alt+Shift+S, tecla S"; con `navigator.keyboard.getLayoutMap()` cuando exista [S]); se evita `?` (depende de la distribución) y la ayuda va en Alt+Shift+H. Se ignoran los eventos de campos editables (`input`, `textarea`, `contenteditable`, la terminal), con `event.isComposing` (IME) y `event.repeat`. Alt+Shift+S abre Inicio; +T enfoca la barra de tareas; +D el escritorio; +↑/↓ cicla ventanas; +W cierra la activa (pasa por `requestClose`); +H abre la ayuda. Solo activos con el SO montado. Probar con NVDA, JAWS y varias distribuciones de teclado.

**`inert`.** Solo donde hay modalidad real (A11Y-06). En escritorio (ventanas no modales) no hay `inert`. **El arranque no es modal**: es una capa decorativa `aria-hidden` que no bloquea ni enfoca nada (§5.5). En Pocket, solo mientras la hoja de Inicio está abierta, el resto queda `inert` (§4, Inicio). Los cambios de modo (cruce del breakpoint) con el foco dentro de una ventana que se oculta mueven el foco al destino de la ventana activa. Ya no hay shell público detrás: se elimina `visibility:hidden` sobre `.theme-root`.

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

`--z-os-root: 2000` se elimina cuando se retira el overlay (ya no hay shell público debajo). Test: cada `--z-os-*` está en orden creciente y `os.css` no contiene `z-index` numérico. **Foco no tapado (2.4.11)**: la capa de ventanas termina encima de la barra de tareas (`inset-bottom: var(--os-taskbar-h)`), así que ninguna ventana queda bajo la taskbar; la mascota (20) está por debajo de la barra y por encima de las ventanas, y por eso **se aparta o se colapsa a su icono de bandeja cuando el elemento enfocado queda cubierto por ella** (§5.4b). Una ventana enfocada nunca se eleva sobre mascota o taskbar si eso taparía el foco.

### 5.3 Iconos y logo (UI-10, UI-11)

- `components/os/icons/xp-icons.tsx`: set propio en SVG de 32 px (se escala a 16 y 48). Relleno a color con luz arriba a la izquierda, contorno oscuro de 1 px y sombra suave. Nombres: `project` (carpeta amarilla), `about` (tarjeta de usuario), `contact` (sobre), `media` (CD y nota), `terminal`, `cv` (documento con esquina doblada), `services` (asistente), `settings` (pantalla), `welcome`, `help`. Una sola función `XpIcon name size`.
- **Logo (UI-11).** Un orbe de cuatro cuartos de disco (rojo, verde, azul, amarillo) con las letras "ED" encima. Evita la forma de bandera de la marca Windows y conserva los colores. Lo usan el botón Inicio, el avatar y el arranque.
- La rejilla de colores de `PixelLogo` y los iconos de trazo de 1,6 px de `desktop-icons.tsx` se retiran.

### 5.4 "XP Pocket" (≤768 px; UI-05, UX-05)

CSS manda y el JS espeja con `matchMedia("(max-width: 768px)")` vía `useSyncExternalStore` (snapshot de servidor `false`). El **diseño** (cuadrícula, ventana a pantalla completa, barra de 48 px) se resuelve en CSS ya en SSR; el JS solo gobierna comportamiento (historial, foco, `inert`, atributos de rol) tras hidratar. Cruzar el breakpoint con el foco dentro de una ventana que se oculta mueve el foco al destino de la ventana activa.

- **Escritorio = lanzador**: cuadrícula de 4 columnas con iconos de 48 px y etiqueta debajo (apps + CV), sin ventanas superpuestas.
- **Una pantalla activa**: solo se muestra la ventana superior (el resto `hidden`/`inert`), `position: fixed; inset: 0 0 var(--os-taskbar-h-pocket)`. No es un diálogo modal: es una pantalla con encabezado (`role="region"`).
- **Encabezado** de 44 px (Q12) con botón **"‹ Atrás"** local a la izquierda y ✕ a la derecha. Minimizar y maximizar ocultos; mover y redimensionar desactivados.
- **Atrás, ✕ y Escape son la misma transición** (`POCKET_BACK`, vía `requestClose`): cierran la ventana superior y devuelven a la anterior en la pila local o al lanzador. Con una sola ventana, o **sin predecesora propia (entrada directa)**, cierran hacia el lanzador **sin llamar a `history.back()`**. El foco vuelve al icono del lanzador (o al destino de la ventana anterior).
- **Historial**: sin segundo protocolo. Los **proyectos** siguen siendo rutas reales (§1.3): abrir uno hace `router.push`, y Atrás del sistema recorre esas entradas con las reglas de escritorio. Las **apps locales no crean entradas**: el gesto Atrás del sistema no las cierra (y puede salir de `/os/`); el botón local es el camino. **DECISIÓN DEL USUARIO (aplazada)**: si se quiere que el gesto Atrás del sistema recorra también las apps, habría que especificar `popstate` con estado versionado, validación de sesión y regla para entradas ajenas; no entra en F4.
- **Barra de tareas** de 48 px: Inicio (solo logo), título de la ventana activa y reloj. Inicio operable siempre (§4).
- **Menú Inicio** como hoja a pantalla completa (Disclosure).
- **Mascota** minimizada como icono de bandeja; sin globos espontáneos.
- Sin efecto de pantalla antigua ni arranque; animaciones mínimas.
- Objetivos de 44×44 con `pointer: coarse`.

### 5.5 Efecto de pantalla antigua, arranque y audio

- **CRT (UI-09, PERF-08): apagado por defecto.** Se sustituye el canvas WebGL por scanlines CSS estáticas (`repeating-linear-gradient`, `pointer-events: none`, opacidad baja) en la capa `--z-os-effect`. Toggle con `aria-pressed` en la bandeja y casilla en Propiedades ("Efecto de pantalla antigua"). Se borra `crt-overlay.tsx`. Alternativa: conservar el WebGL tras `dynamic import`, solo al activarlo, a 15 fps, con pausa en `visibilitychange` y DPR 1. Recomiendo la opción CSS (Q5).
- **Arranque (decorativo y no bloqueante).** Se elimina la BIOS (UI-01). Queda una pantalla de inicio de sesión corta (≈2 s): logo, barra de progreso azul y "Iniciando EDAV OS". **El HTML de servidor pinta el escritorio sin bloqueo**; no hay `os-boot--pending` en SSR. Tras hidratar, un efecto comprueba la **elegibilidad** y solo entonces monta la capa de arranque: se omite si hay deep link, si el usuario ya interactuó (pointer, teclado o foco antes de la comprobación), con `prefers-reduced-motion`, en Pocket o si `sessionStorage` indica que ya se mostró en la sesión. Es una capa `aria-hidden` sin `aria-modal` ni `inert`; salta con cualquier clic, tecla o Esc. **Al terminar no mueve el foco** (en `/os/` sin deep link no se roba el foco). El audio del arranque se elimina.
- **Audio (UI-13).** `lib/os/sound.ts`: **un** `AudioContext` perezoso, creado en el primer gesto con el sonido activado. Recetas sintéticas (seno/triángulo, ganancia maestra ≈0,04): clic, abrir, cerrar, minimizar, error, notificación e inicio de sesión. Sin archivos. Se suspende en `visibilitychange` y se cierra al desmontar. **Apagado por defecto**, interruptor en la bandeja (`aria-pressed`) y persistido. Se reproduce solo si `prefs.sound`.

### 5.4b Mascota en la F4

`RetroClippy` se mueve a `components/os/assistant/` y se monta tras hidratar (diferido). Clippy por defecto, descartable, con descarte persistente en `prefs.assistant`. **Su portal va dentro de la capa del SO** (`.os-root`, `--z-os-assistant`), no en `document.body`, para quedar bajo el mismo `inert` y la misma escala de capas. Usa `usePointerDrag` y recibe los eventos de `deriveEvents` (gancho de MAS-08). **Alternativa sin arrastre en F4**: botón "Cambiar de esquina" (cuatro esquinas) en su globo y en Propiedades. **No debe tapar el foco (2.4.11)**: ante un `focusin`, si el elemento enfocado queda cubierto (total o parcialmente de forma que no sea visible) por la mascota, esta se aparta a otra esquina o se colapsa a su icono de bandeja. Se prueba con teclado, con zoom 200 % y con viewport corto. El motor y los sprites nuevos son de la F6. **Q15 queda condicionado** a resolver estas dos cosas (foco tapado y alternativa al arrastre) en F4; si no, la mascota entra apagada por defecto.

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
- **Descubribilidad (UX-11)**: icono de **CV.pdf** en el escritorio (enlace de descarga, no ventana), globo inicial "Haz clic en un icono para abrirlo", Welcome con los dos botones actuales y ayuda "Ayuda → Atajos" en la app Propiedades. La galería solo lista el catálogo autorizado (§1.4).

## 7. Plan de migración

Regla de oro: **no se borra nada del código actual hasta O9**. El SO nuevo se construye en `components/os/` y `lib/os/`, con el overlay intacto.

**Orden: O0 → O1/O2/O3 → O4 → integración O5–O8 → Pocket y QA (O10–O12) → corte O9.** O9 conserva su número pero se ejecuta el último: retirar el respaldo antes de completar Pocket y QA dejaba el SO sin red.

**Dueños únicos** (las apps pueden avanzar en paralelo una vez fijadas estas interfaces): registro de apps (`lib/os/apps.ts`: id, icono, `initialFocus`, contrato de suspensión), contrato de foco (`resolveReturnTarget`, `useFocusManager`), copy (`content/ui.ts`, solo el agente C) y contrato de historial (`window-url.ts` + `use-os-navigation.ts`).

| Paso | Qué | Agente y archivos | Criterio de aceptación |
|---|---|---|---|
| **O0** Spike | Worktree desechable: layout `os` con shell mínimo y dos proyectos de prueba. Con `router.push/replace(..., { scroll: false })` comparar navegación **fría y caliente**, Atrás/Adelante, recarga, entrada directa **sin barra final**, peticiones RSC (número y tamaño) y scroll del documento frente al de la ventana. Comprobar que `history.state` tolera `osEntry`; 404 de slug excluido bajo `/os/` y `/en/os/`; `Location` del redirect `?view=retro`; prefetch del enlace desde la portada; hidratación y baseline de bundle. | A (solo lectura y medición) | Informe con las medidas y la decisión final: confirma el plan B (por defecto) o lo revierte a `pushState`; en ambos casos se ajustan las reglas de §1.3. Si `history.state` no tolera el id, el fallback por URL es el diseño. |
| **O1** Núcleo puro | `lib/os/{window-reducer,window-geometry,window-url,persistence,prefs,events}.ts` (+ `store.ts` solo si hace falta) y tests de §2.4. | A. Solo `lib/os/` y `tests/unit/os-*` | `npm run check` verde; todos los tests de §2.4 pasan; sin importar React. |
| **O2** Visual (paralelo a O1) | Tokens Luna **bajo `.os-root` o en CSS Modules** (no se redefinen tokens globales que el overlay aún usa; el CSS importado por segmento no se retira al salir en navegación suave), escala z, `components/os/os.css`, `xp-icons.tsx`, logo, fondo. | B. Estilos y `components/os/icons/` | Contraste ≥ 4,5:1 (texto) y ≥ 3:1 (no texto); sin hex ni `z-index` literales en `os.css`; el overlay actual se ve igual; revisión visual en Edge. |
| **O3** `ui.ts`, catálogo y rutas | Cadenas `ui.os`; catálogo `osProjectSlugs` (§1.4, por defecto los 13); esqueleto de rutas `os/`, `views/os.tsx`, `osMetadata`, `availablePages`, `CURRENT_PHASE = 4`; **`route-files.test.ts` resuelve la raíz por familia de rutas**; 404 bajo `/os/`. | C. **Solo este agente toca `content/ui.ts`** | `/os/` y `/en/os/` devuelven 200 con `noindex`, canonical propio y sin hreflang; fuera del sitemap; slug excluido → 404; `route-files`, `app-structure` y `sitemap` pasan. |
| **O4** Shell | `os-shell` (`useReducer`), `desktop-surface`, `window-layer`, `window-frame`, `taskbar`, Welcome, banner `<noscript>`. | D (depende de O1 y O2) | HTML de `/os/` con escritorio y Welcome en servidor, sin errores de hidratación (con JS demorado, prefs persistidas y zona horaria distinta); abrir, cerrar, minimizar, restaurar y z-order por teclado y ratón. |
| **O5** Interacción | `use-pointer-drag`, redimensionado, menú de sistema, controles de pasos, modo Mover/Tamaño, gestor de foco, anunciador. | D, tras O4 (en paralelo con O6–O8 una vez fijados los contratos) | Criterios de §3; foco al abrir y devuelto solo si estaba dentro; sin tab stop del tirador; alternativas de un solo puntero. |
| **O6** Menús y atajos | `menu.tsx` (contextual y sistema), **Inicio como Disclosure**, toolbar con roving, bandeja, `use-shortcuts` opt-in. | E (paralelo a O5) | Matriz de teclado de §4 completa. |
| **O7** Apps | Galería, ventana de proyecto (detalle bajo demanda), About, Servicios, Contacto, Multimedia, Terminal y Propiedades. Contrato de suspensión. | Varios agentes en paralelo, uno por app. `projects-gallery` y `project-window` primero | Cada app abre diferida sin romper el presupuesto; galería con filtros y badges (lmilo con enlace, jdicans sin); minimizada no consume (§3); sin literales ES (`i18n-boundaries`). |
| **O8** URL ↔ ventana | `use-os-navigation`, `ROUTE_CHANGED`, reglas de §1.3, deep links. | D | Pruebas CDP de §8 (secuencias de historial); sin bucles; recarga en `/os/proyectos/<slug>/` abre la ventana. |
| **O10** Pocket | Modo ≤768 px, pila local y Atrás, hoja de Inicio. | G | CDP con emulación 390×844 y táctil; Atrás, ✕ y Escape equivalentes; entrada directa cierra al lanzador sin `history.back()`; objetivos ≥ 44 px. |
| **O11** Preferencias, audio, arranque | `prefs`, sonido, efecto de pantalla, arranque no bloqueante, mascota diferida con alternativa sin arrastre y sin tapar el foco. | H | Todo apagado por defecto; `prefers-reduced-motion` respetado; el arranque no roba el foco; descarte de Clippy persiste. |
| **O12** QA y pre-corte | Suite CDP completa, presupuesto de bundle en CI, axe en Edge [S], **CI con smoke ES/EN contra standalone** (HTML inicial, 404, canonical, redirects) y E2E de historial y foco. **Prueba por Traefik + Cloudflare**: HTML y RSC en ambos órdenes de calentamiento; `Content-Type`, `Vary`, `Cache-Control`, `_rsc`, query del redirect. | Todos | Criterios de §8 verdes; CSP en Report-Only sin violaciones nuevas; la prueba de borde pasa (si no, no hay corte). |
| **O9** Corte (último) | Enlaces a `/os/` con `prefetch={false}`, redirect 307 en `next.config.ts`, retirada de `PortfolioExperience`, `desktop-shell.tsx`, `desktop.css`, `crt-overlay.tsx`, `data-os-open`. | F, solo este agente. Archivos: `home.tsx`, `footer.tsx`, `portfolio-experience.tsx`, `globals.css`, `next.config.ts` | `/` ya no descarga el SO ni `ui.os` (cero tráfico del SO antes de interactuar); `/?view=retro` → 307 a `/os/?view=retro`; `npm run check` y `npm run smoke` verdes; snapshot de rutas sin cambios no previstos (documentar en `arquitectura-rutas.md` §10); actualizar `pendientes.md`. |

**Paralelismo.** O1, O2 y O3 a la vez. O4 espera a O1 y O2. O5–O8 se reparten sobre archivos distintos tras O4, con los contratos de dueño único ya fijados. O10–O12 van antes del corte. O9 es el único paso que toca `home.tsx`, `footer.tsx`, `globals.css` y `next.config.ts`.

### 7.1 Riesgos

| Riesgo | Mitigación |
|---|---|
| El router de Next y el estado local se desincronizan al volver atrás | Plan B con rutas reales; `ROUTE_CHANGED` idempotente por origen; spike O0 y E2E de historial. |
| Desajuste de hidratación (reloj, viewport, prefs, arranque) | Snapshot inicial determinista por ruta; reloj con placeholder; prefs con snapshots del mismo tipo y referencias estables; almacenamiento y medidas tras hidratar con `HYDRATE`; arranque solo tras verificar elegibilidad. |
| Salto visual al aplicar posiciones persistidas | Solo afecta a quien movió ventanas; una sola transición tras hidratar; aceptado. |
| Peso del JS y de los datos de `/os` | Presupuesto de datos transferidos en CI; apps diferidas; detalle bajo demanda; `prefetch={false}` en la portada. |
| `Alt+Shift` choca con el cambio de idioma de Windows o con un lector | Atajos opt-in; prueba con NVDA y JAWS; fallback por menús (Q4). |
| Perder el scroll de la portada al entrar al SO | Cambio aceptado (Q1), tras validar el corte. |
| Minimizadas montadas consumen recursos | Contrato de suspensión (§3); límite blando de ventanas de proyecto (p. ej. 8) y aviso. |
| CSS de segmento persiste al salir del SO en navegación suave | Tokens bajo `.os-root` o CSS Modules durante la convivencia (O2). |
| Hex/z-index literales reaparecen | Tests de tokens (§2.4). |
| Conflictos entre agentes | Dueños únicos (§7): `content/ui.ts`, registro de apps, contrato de foco y de historial. |
| Hosting detrás de Traefik y Cloudflare (caché de HTML y de RSC) | Prueba previa al corte en O12; `/os/*` es estático con la misma regla que el resto; la preferencia (F5) la lee el cliente. |
| Mascota tapa el foco | Se aparta o colapsa; prueba con teclado, zoom y viewport corto; si no se resuelve, apagada por defecto. |

## 8. Pruebas

**Vitest** (§2.4): reducer, url, geometría, persistencia, prefs, store, menús, retorno de foco, filtros, créditos, catálogo único, estructura y fronteras. `npm run check` obligatorio en cada paso.

**Edge headless con CDP** (`scripts/os-e2e.mjs`, sin dependencias nuevas; Node 24 trae `WebSocket`; mismo estilo que `scripts/smoke-routes.mjs`), contra el build standalone, ES y EN:
1. Deep link `/os/proyectos/<slug>/` y `/en/os/projects/<slug>/`: ventana abierta en el HTML inicial, sin errores de consola ni de hidratación, foco en el destino de la app y `document.title` (el de Next).
2. Clic o Intro sobre un icono abre y el foco va al contenido; Esc no cierra la ventana; al cerrar con el botón el foco vuelve al icono solo si estaba dentro.
3. Minimizar → foco al botón de la barra, que pasa a ser la parada roving; restaurar → al destino de la app.
4. Inicio (Disclosure): Intro/Espacio abren, Tab recorre, Esc cierra y devuelve el foco; "Todos los programas" con `aria-expanded`.
5. Toolbar con una sola parada de Tab y roving ←/→.
6. Arrastre (§3): cero renders, una escritura por frame, finalización única con `pointerup`, `pointercancel`, `lostpointercapture` y Escape; posición persistida tras recargar.
7. Mover y Tamaño por teclado, por menú de sistema y **con el panel de pasos de un solo puntero**; "Ajustar a la izquierda" y "Restablecer" sin arrastre.
8. **Historial (R1)**: abrir A, abrir Contacto (URL sigue en A), minimizar A (URL a `/os/`), y la secuencia abrir A, abrir B, enfocar A, Atrás, Atrás, Adelante, Adelante, con recarga en cada paso; URL, selección y ventanas coherentes; entradas ajenas.
9. Pocket (`Emulation.setDeviceMetricsOverride` 390×844 y táctil): lanzador, pila local, Atrás/✕/Escape equivalentes, entrada directa sin `history.back()`, Inicio operable, hoja con `inert`, cruce del breakpoint con foco dentro, objetivos ≥ 44 px.
10. `prefers-reduced-motion` (`Emulation.setEmulatedMedia`): sin arranque ni transiciones.
11. Arranque: solo tras verificar elegibilidad, se omite si hubo interacción previa, no roba el foco y no deja `inert`.
12. Estado por defecto: sonido y efecto apagados, sin canvas, atajos desactivados, Clippy visible, descartable y con descarte persistente.
13. Galería: filtros con recuentos, badges (lmilo con enlace, jdicans sin), solo el catálogo autorizado, sin duplicados.
14. `/?view=retro` → 307 con `Location` exacto `/os/?view=retro` (ES y EN, con y sin barra, con parámetros extra, y portada sin `view`); respaldo `<noscript>` visible, localizado y enfocable.
15. **Foco no tapado**: con Clippy visible, el elemento enfocado nunca queda oculto (teclado, zoom 200 %, viewport corto).
16. **Hidratación**: con JS demorado, prefs persistidas, zona horaria distinta, almacenamiento bloqueado o corrupto.
17. **Catálogo**: slug excluido → 404, `noindex`, canonical y idioma correctos en acceso directo, ES y EN.
18. **Presupuesto (§2.3)** medido por separado en red: portada (cero SO), carga fría de `/os/`, deep link, por app y precarga por intención.
19. **Borde**: prueba a través de Traefik y Cloudflare antes del corte (HTML y RSC en ambos órdenes, `Content-Type`, `Vary`, `Cache-Control`, `_rsc`, query del redirect).

CDP cubre DOM, foco, navegación y trazas en Chromium. **Pendiente manual**: lector de pantalla (NVDA, JAWS), atajos del sistema, gesto Atrás en dispositivos reales y comportamiento en WebKit. **axe** [S] en CI o como paso manual documentado.

## 9. Preguntas abiertas (con recomendación)

| # | Pregunta | Recomendación |
|---|---|---|
| Q1 | ¿Eliminar el overlay `?view=retro` en la F4 o mantenerlo hasta la F5? | Eliminarlo en O9 (el último paso), **tras validar el corte** (Pocket, QA y prueba de borde). Coste: se pierde el scroll de la portada. |
| Q2 | ¿Nombre visible? | "EDAV OS". |
| Q3 | ¿Esc cierra ventanas? | No en escritorio (cierra transitorios), sí en Pocket y por `requestClose` con política común de borradores. |
| Q4 | ¿Atajos con Alt+Shift? | **Opt-in** (desactivados por defecto). Tecla = la que muestra la ayuda (`event.code`); fuera de campos editables, IME y repeticiones. Riesgo de interoperabilidad, no de 2.1.4. |
| Q5 | ¿Conservar el WebGL del CRT? | No: CSS estático por defecto. |
| Q6 | ¿Qué proyectos tienen ventana? | **DECISIÓN DEL USUARIO.** Por defecto, solo los 13 autorizados (catálogo único). Si se publican los 4 sin portada, confirmar campos visibles; el diseño no cambia, solo la lista. |
| Q7 | ¿URL para otras apps (`?app=`)? | No: solo proyectos tienen URL. |
| Q8 | ¿Welcome solo o con Reproductor? | Solo Welcome. |
| Q9 | ¿Datos de detalle inline o diferidos? | Índice del catálogo en el layout; **detalle del proyecto solicitado como `children`** de su ruta. Presupuesto sobre datos transferidos. |
| Q10 | ¿Doble clic para abrir iconos? | No: **clic simple abre** (como hoy) o acción "Abrir" visible; el doble clic no es la única vía. |
| Q11 | ¿Mantener un arranque? | Sí, breve, decorativo y sin bloqueo previo a hidratación; solo tras verificar elegibilidad; no roba el foco. |
| Q12 | Barra de título pocket de 36 o 44 px | 44 px. |
| Q13 | Fuente del cromo | Empezar con la pila del sistema; añadir una fuente libre solo si la prueba visual lo justifica. |
| Q14 | ¿Foco en el marco al cargar un deep link? | Foco al destino de la app (contenido por defecto), solo donde haga falta, devuelto solo si estaba dentro de la ventana que desaparece, con `preventScroll`; `/os/` sin deep link no roba el foco. |
| Q15 | Mascota en la F4 | Mantener `RetroClippy` diferido con descarte persistente, **condicionado** a resolver en F4 el foco tapado y la alternativa al arrastre; si no, apagada por defecto. |
| Q16 | Gesto Atrás del sistema en Pocket para apps locales | **DECISIÓN DEL USUARIO (aplazada).** F4: no; botón Atrás local. |
| Q17 | Destino del redirect `?view=retro` | `/os/?view=retro` (reenvío de query de Next) con 307; destino limpio solo con regla explícita. |

### Archivos críticos para la implementación

- `C:\Users\Emman\Documents\edav-portfolio\components\desktop\desktop-shell.tsx` (se descompone y se retira)
- `C:\Users\Emman\Documents\edav-portfolio\components\portfolio-experience.tsx` (se retira en O9)
- `C:\Users\Emman\Documents\edav-portfolio\content\routes.ts` y `C:\Users\Emman\Documents\edav-portfolio\lib\i18n\pages.ts` (rutas `os` y `osProject`, equivalencia de idioma)
- `C:\Users\Emman\Documents\edav-portfolio\app\styles\theme-xp.css` y `C:\Users\Emman\Documents\edav-portfolio\app\styles\tokens.css` (cromo Luna y escala de z-index)
- `C:\Users\Emman\Documents\edav-portfolio\content\ui.ts` (microcopy `ui.os`; un solo propietario)

## 11. Revisión de Codex y cambios al diseño

Codex revisó el diseño y lo aprobó **con cambios** ("aprobar con cambios: conservar ruta real, layout persistente, SSR y reducer puro; corregir los dos contratos de historial y cerrar modalidad, foco y catálogo; la retirada del overlay queda detrás de Pocket, la navegación en standalone y la prueba por Traefik y Cloudflare"). Esta tabla recoge cada hallazgo y el cambio hecho.

| Hallazgo | Cambio al diseño |
|---|---|
| **R1** (bloqueante) Historial de escritorio: `OPEN` de una app → `none` deja `/os/proyectos/a/`; minimizar sin regla; abrir A, B, enfocar A deja entradas idénticas; Atrás desincroniza ventanas | §0 DS2, §1.3: la URL manda sobre el **proyecto seleccionado**, el store sobre ventanas, geometría y borradores; tabla de reglas (abrir, minimizar, enfocar, cerrar); `ROUTE_CHANGED` idempotente con origen; ids de entrada (`openedBy`) para deshacer la apertura con Atrás; se elimina `lastWritten`; fallback por URL para entradas ajenas; tests 20–22 reescritos con la secuencia intermedia |
| **R2** (bloqueante) Pocket: entradas de historial con URL idéntica, `id` sin uso, ✕/Escape sin regla, entrada directa | §0 DS11, §5.4: pila local y botón Atrás (la alternativa que propone Codex, sin segundo protocolo); Atrás, ✕ y Escape comparten `POCKET_BACK`/`requestClose`; entrada directa cierra al lanzador sin `history.back()`; el recorrido por popstate para apps queda como decisión aplazada (Q16) |
| **O1** `pushState` conserva el árbol de segmentos de origen | §0 DS3, §1.3: **plan B como base** (`router.push/replace(href, { scroll: false })`, layout compartido, store solo para ventanas locales, `hrefFor`/`canonicalPath`); se retiran `pushState` y el `document.title` manual; spike O0 ampliado (fría/caliente, Atrás/Adelante, recarga, sin barra, RSC, scroll documento vs ventana) |
| **O2** Hidratación: arranque en SSR, foco robado, snapshots, viewport | §0 DS6–DS7, §2.1, §4, §5.4–5.5: escritorio sin bloqueo en SSR; arranque tras verificar elegibilidad y decorativo; reloj con placeholder; `HYDRATE` tras hidratar (almacenamiento y medidas en una transición); almacenamiento bloqueado o corrupto tolerado; `getSnapshot`/`getServerSnapshot` del mismo tipo y referencias estables; el fin del arranque no mueve el foco; cruce de breakpoint con foco |
| **O3** Pocket modal, foco y menús sin definir | §4, §5.4: Pocket es pantalla activa con encabezado (no diálogo modal); en escritorio, diálogo no modal con `initialFocus` por app (contenido por defecto, así el siguiente Tab entra al contenido); la parada roving pasa al botón enfocado al minimizar; **Inicio = Disclosure**, con "Todos los programas" como Disclosure; Inicio operable en Pocket y retorno de foco definidos |
| **O4** Arrastre sin alternativa de un solo puntero; Clippy y foco tapado; capas | §3.1, §5.2, §5.4b: panel de pasos (`NUDGE`) y botones de esquina; alternativa sin arrastre para Clippy en F4; portal dentro de `.os-root`; se aparta o colapsa si tapa el foco (prueba con teclado, zoom y viewport corto); ventanas acotadas por encima de la taskbar; Q15 condicionado |
| **O5** `?view=retro`: query reenviada, 307/F5, `noscript` recortado | §1.5, Q17: `Location` exacto `/os/?view=retro`, parámetros extra reenviados e ignorados; 307 mientras sea reversible; ES/EN con y sin barra; el redirect de `next.config.ts` pasa a O9 (sin `RetroRedirect`); `<noscript>` visible, localizado y enfocable |
| **O6** Dos catálogos (13 vs 17) y detalles como props | §0 DS10, §1.2, §1.4, Q6, Q9: **un catálogo explícito** (`osProjectSlugs`) en SSG, `knownSlugs`, selector de idioma, galería y detalle; detalle del proyecto solicitado como `children`, sin viajar si no se abre; pruebas de slugs excluidos; 404 bajo `/os/` a verificar en O0; **DECISIÓN DEL USUARIO**: por defecto solo los 13, hasta decidir sobre los 4 sin portada |
| **O7** Presupuesto y prueba de arrastre | §1.5, §2.3, §3, §8: `prefetch={false}` y precarga por intención; mediciones separadas (portada, `/os/` frío, deep link, por app, intención); prueba de arrastre con conteo de renders, marcas del handler y rAF y traza de frames; `finish` única e idempotente que cancela el último rAF; contrato de suspensión de minimizadas (MusicWidget incluido) |
| **O8** Plan: `route-files`, tokens, orden, dueños, CI, borde | §7: `route-files.test.ts` por familia de rutas; orden O0 → O1/O2/O3 → O4 → O5–O8 → Pocket y QA → corte O9; tokens bajo `.os-root` o CSS Modules; dueños únicos (apps, foco, copy, historial); CI con smoke ES/EN y E2E de historial y foco; prueba por Traefik + Cloudflare antes del corte |
| **Q4** Atajos y WCAG 2.1.4 | §4, Q4: opt-in, tecla que coincide con la ayuda (`event.code`), se excluyen campos editables, IME y repeticiones; Alt+Shift es riesgo de interoperabilidad, no 2.1.4; `?` sustituido por `H` |
| **Q10** Doble clic como única apertura | §4, Q10: clic simple abre (como hoy) y acción "Abrir"; globo actualizado |
| **Q14** Restauración de foco | §4, Q14: foco solo donde haga falta, devuelto solo si estaba dentro de la ventana que desaparece, `preventScroll` |
| **Simplificación** `useReducer` primero | §0 DS4, §2.2: `useReducer` + `memo`; store externo solo si la medición lo exige; reducer puro sin cambios |
| **Conservado** | `/os/` y `/en/os/` bajo sus raíces, `noindex, follow`, canonical propio, sin hreflang, fuera de sitemap y `llms.txt`, `os` en `staticKeys` y `osProject` en `refs()`; Q2, Q5 (CSS), Q7, Q8, Q12; Q1 tras validar el corte; Q9 con presupuesto sobre datos transferidos; Q11 sin bloqueo previo a hidratación; Q13 con pila del sistema |

**Decisiones que quedan para el usuario**: (1) Q6, si se publican en el SO los 4 proyectos sin portada (por defecto, solo los 13); (2) Q16, si el gesto Atrás del sistema en Pocket debe recorrer también las apps locales (por defecto, no); (3) Q17, si el redirect de `?view=retro` debe dejar un destino limpio en vez de `/os/?view=retro`; (4) 307 frente a 308, cuando se decida que la retirada es permanente.

## 12. Resultado del spike O0 (confirma el plan B)

Medido con un SO mínimo (SSG, 3 slugs, `dynamicParams=false`, `trailingSlash: true`) en standalone y Edge headless.

| Medición | `pushState` + `usePathname` | `router.push/replace(href, { scroll: false })` |
|---|---|---|
| Shell y estado tras abrir A, B, Atrás×2, Adelante×2 | Sobrevive | Sobrevive |
| `title`, canonical, `og:url`, `children` | **Quedan los del primer render** (sobre `/os/proyectos/civicoin/` seguía `canonical=/os/`) | Correctos en cada paso, también con Atrás/Adelante |
| Red | 0 por navegación | 1 RSC de ~1 KB por `push`/`replace` (también en caliente); 0 con Atrás/Adelante |
| Slug no autorizado | URL y ventana con 200 hasta recargar | Navegación completa y pérdida del shell |
| Salir de `/os` | El shell sigue montado bajo una URL ajena | El layout se desmonta; al volver con Atrás se remonta sin red |
| JS gzip | `/os/` mínimo 141,8 KB frente a `/` 155,6 KB (lo fija la página, no el mecanismo) | igual |

**Decisión: `router.push/replace` con `{ scroll: false }`.** Salvaguardas:
1. Validar el slug contra `osProjectSlugs` **antes** de navegar (un 404 por RSC provoca navegación completa).
2. hrefs siempre con barra final (`hrefFor`/`canonicalPath`); sin barra, la entrada directa sufre un 308.
3. La sincronización URL → store es la transición idempotente `ROUTE_CHANGED` de §1.3 (no un filtro `lastWritten` por pathname, que Codex descartó en R1).
4. **No se escribe `history.state` a mano**: Next controla la entrada. Por tanto el "id de entrada" (`openedBy`) no puede apoyarse en `history.state`; el fallback por URL de §1.3 es el diseño base. Pocket usa su pila local con Atrás propio.
5. Salir de `/os` y volver remonta el shell: el estado que deba sobrevivir (geometría, preferencias) se persiste en `localStorage` (hidratación tras montar), no en memoria del layout.
6. Cuidado con contadores de módulo en el shell: el HTML estático los hornea y provoca el error de hidratación #418 (asignar ids en `useEffect`).
