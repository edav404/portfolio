# QA del SO antes del corte (O12)

Fecha: 2026-11-21. Rama `fase/4-os-ventanas`, **HEAD aa25602**. Todo se midió sobre un standalone servido desde una copia de `git archive HEAD` (no el árbol de trabajo, que tenía cambios sin commitear de otros revisores), `PORT=3123`, `NODE_ENV=production`, Edge headless por CDP (Windows 11). Sin credenciales de Last.fm ni SMTP.

Los scripts de medición viven fuera del repo (scratchpad de la sesión: `qa/o12-visual.mjs`, `o12-budget.mjs`, `o12-axe.mjs`, `o12-perf.mjs`, `o12-states.mjs`). Lo reutilizable ya está en el repo: `npm run smoke`, `npm run e2e:os`, `npm run e2e:pocket` y el job `os-e2e` de CI.

## Resumen

| Área | Resultado |
|---|---|
| Axe (wcag2a/aa, 21a/aa, 22aa, best-practice) | **0 violaciones** en 10 estados de escritorio y 4 de Pocket, ES y EN (28 ejecuciones). |
| Smoke de rutas (HEAD) | OK: 44 URLs del sitemap, redirecciones, 404, 22 páginas EN, 4 páginas del SO, 6 cambios de idioma. |
| `e2e:os` (HEAD) | 924 correctas, 0 fallidas. |
| `e2e:pocket` (HEAD) | 75/75 **solo tras** ignorar el 503 de `/api/lastfm/` (ver D9). |
| Presupuesto JS | Núcleo del SO 27,7 KB gz (límite 45); apps de 1,1 a 6,8 KB gz (límite 20). **Cumple.** |
| Presupuesto de datos | **No cumple** por imágenes: ver D1 y D2. |
| Portada `/` | No descarga ningún chunk del SO. |

## 1. Visual (tarea 1)

Capturas en `<scratchpad>\qa\shots\o12-*.png` (ES y EN; 1440x900, 1024x768, 768x1024, 390x844, 1440x900 a zoom 200 % = 720x450 con DPR 2, y viewport corto 1280x480). Sufijos: `-0-inicial`, `-1-ventanas` (Mi trabajo, proyecto, Contacto), `-2-inicio`, `-3b-contextual`, `-4b-pasos`, `-5b-ayuda`, `-6-crt-mascota`, `-7-arranque-a/b`, `-8-deeplink-proyecto`; en 390: `-1-galeria`, `-2-proyecto`, `-3-contacto`, `-4-lanzador-final`, `-5-crt`, `-6-inicio`; `-axe-*` son los estados de la tarea 3.

Comprobado sin hallazgos: marco de ventana sobre el fondo, ventanas dentro del viewport (ninguna fuera de pantalla en 1440/1024/corto), sin scroll horizontal en ningún viewport, barra de tareas a 30 px (48 px en Pocket), scroll interno de proyecto y galería, ventanas pegadas arriba y con scroll interno en viewport corto (480 px), Pocket a pantalla completa en 768 y a zoom 200 %, menú contextual, menú de sistema, Inicio, ayuda de atajos, CRT (activo en escritorio; **sin efecto en Pocket por diseño**, `os.css:990`).

**Iconos SVG con `fill="var()"`**: hay 207 nodos SVG con `fill="var(--c-ico-*)"` (197 en Pocket). En Edge los resuelve (`getComputedStyle(...).fill` devuelve colores reales) y los iconos se ven bien. Ese soporte es el de Chromium; en WebKit y Firefox no se pudo verificar (ver "Lo que CDP no cubre"). Riesgo bajo, pero es el único punto del SO que depende de `var()` en un atributo de presentación.

## 2. Presupuesto (tarea 2, §8/§9)

Cargas en frío, caché desactivada, ventana 1440x900 (390 para móvil), prefs con mascota salvo donde se indica. "gz" = gzip nivel 9 del archivo servido; "transf." = `transferSize` del navegador (Next ya sirve gzip).

| Escenario | JS (n chunks) | JS gz | JS transf. | CSS transf. | Documento (transf.) |
|---|---|---|---|---|---|
| Portada `/` | 11 | 159,8 KB | 163,4 KB | 12,0 KB | HTML 21,5 KB |
| Portada tras abrir el overlay actual | 12 (+16,1 KB gz) | 175,9 KB | 179,8 KB | 22,5 KB | igual |
| `/os/` frío, sin mascota | 9 | 171,6 KB | 174,7 KB | 20,8 KB | HTML 15,4 KB |
| `/os/` con mascota (por defecto) | 10 (+1,9 KB gz) | 173,6 KB | 177,0 KB | 20,8 KB | 15,4 KB |
| `/os/` con arranque (primera visita) | 10 | 173,6 KB | 177,0 KB | 20,8 KB | 15,4 KB |
| `/os/` en 390 (Pocket) | 10 | 173,6 KB | 177,0 KB | 20,8 KB | 15,4 KB |
| Deep link `/os/proyectos/civicoin/` y `/en/os/projects/civicoin/` | 9 (mismo conjunto que `/os/`) | 171,6 KB | 174,7 KB | 20,8 KB | 16,3 KB / 15,7 KB |

- **Portada sin SO**: los 11 chunks de `/` y los 9 de `/os/` comparten 7 (143,9 KB gz: runtime de Next y React). Los 2 chunks exclusivos del SO (9,8 + 17,9 = **27,7 KB gz**) no aparecen en `/`; los 4 exclusivos de la portada (15,9 KB) no aparecen en `/os/`. Además `/os/` añade CSS del SO (`os.css` 7,2 KB y un módulo de 1,6 KB). Durante la carga de la portada y el scroll hasta el pie solo hubo prefetch de rutas del sitio (`/proyectos/<slug>/?_rsc=...`, 6 de ellas); **ninguna petición a `/os`**. La portada **todavía no enlaza al SO** (no hay `a[href*="/os"]`; el acceso es el botón del overlay, O9 pendiente), así que la comprobación de `prefetch={false}` en los enlaces portada→SO queda por repetir cuando O9 los cree. El overlay actual sí carga +16,1 KB gz de JS y +10,5 KB de CSS solo al pulsar el botón.
- **Núcleo del SO**: 27,7 KB gz frente a 45 KB. La mascota es un chunk aparte de 1,9 KB gz. Cumple.
- **Por app** (chunk diferido que aparece al abrirla tras la carga fría, gz): Bienvenida 0 (en el núcleo), Mi trabajo 1,6 KB, Acerca de 6,8 KB (+1,3 KB CSS), Servicios 3,3 KB, Contacto 4,8 KB, Multimedia 4,0 KB (+1,0 KB CSS), Terminal 4,1 KB (+1,1 KB CSS), Propiedades 1,1 KB. Máximo 6,8 KB frente a 20 KB. La ventana de proyecto (detalle bajo demanda) no añade JS.
- **HTML y RSC (gzip, bytes en crudo entre paréntesis)**:

| URL | HTML | RSC (`RSC: 1`) |
|---|---|---|
| `/` | 21,1 KB (113,5 KB) | 13,9 KB (66,9 KB) |
| `/en/` | 20,1 KB (110,7 KB) | 13,3 KB (64,6 KB) |
| `/os/` | **15,0 KB (81,8 KB)** | 9,2 KB (29,9 KB) |
| `/en/os/` | 14,4 KB (79,3 KB) | 8,6 KB (27,7 KB) |
| `/os/proyectos/civicoin/` | 15,9 KB (87,2 KB) | 9,6 KB (33,0 KB) |
| `/proyectos/civicoin/` | 8,6 KB (42,5 KB) | 5,9 KB (24,7 KB) |

  El copy de todas las apps no encarece el HTML del SO: es un 29 % menor que el de la portada. Un proyecto añade ~0,9 KB gz sobre `/os/`.
- **Cabeceras** (HTML y RSC, todas las rutas): `Cache-Control: s-maxage=31536000` y `Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding`; HTML `text/html; charset=utf-8`, RSC `text/x-component`. Relevante para la prueba de borde (ver el último apartado).
- **Imágenes y otros** (fuera del límite de JS pero dentro de "datos transferidos"):
  - Al abrir **Mi trabajo** se descargan **las 13 miniaturas a tamaño completo, 7,48 MB** (de 89 KB a 760 KB cada una, PNG/JPG originales). Ver D1.
  - La mascota descarga `/images/edav-clippy-sprites.png` (**2,28 MB**) en cada carga fría de escritorio. En Pocket el chunk de la mascota se descarga pero la hoja de sprites no. Ver D2.
  - Fuentes: 3 woff2 (40,6 KB) en todas las rutas.

## 3. Accesibilidad (tarea 3)

**Axe** (el de `node_modules/axe-core`) con las etiquetas wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa y best-practice: **0 violaciones** en todos los estados siguientes, en ES y EN.
- Escritorio 1440x900: inicial (Bienvenida), proyecto abierto, Contacto, ventana maximizada, ventana minimizada, menú de sistema abierto, panel de pasos, ayuda de atajos, menú contextual, menú Inicio (todos con ventanas, mascota y CRT activos).
- Pocket 390x844: inicial, galería+proyecto, Contacto, hoja de Inicio.

**Revisión manual**
- **2.4.11 Foco no oculto**: recorrido con Tab de 45 pasos (escritorio, con 3 ventanas, mascota y CRT) y 30 (Pocket), comprobando con `elementFromPoint` que el elemento enfocado no queda tapado. Pocket: sin solapes. Escritorio: el centro de todo elemento enfocado queda visible; solo se detectó que una esquina de las casillas "Seleccionar ..." de la galería queda bajo el `xp-resize` de otra ventana y que el botón "Ocultar" de la mascota tapa una esquina del personaje (ambos son del propio diseño y no ocultan el foco). La evasión de la mascota ante el foco funcionó (se movió de esquina). Resultado: **cumple**, con la salvedad de D6.
- **2.5.7 Movimientos de arrastre**: mover y redimensionar tienen alternativa sin arrastre: menú de sistema (Mover, Tamaño, Ajustar a izquierda/derecha, Centrar, Restablecer), panel de pasos ("Mover y cambiar tamaño…" con flechas, Más ancho/estrecho/alto/bajo, Hecho/Cancelar, verificado abierto y operativo) y "Cambiar de esquina" para la mascota. **Cumple.** Nota D7 (rótulo del panel solapado).
- **2.5.8 Tamaño de objetivo (mín.)**: sobre todos los botones, enlaces, campos, `menuitem` visibles de cada estado, solo hay un objetivo < 24 px: la casilla nativa 13x13 de la ayuda de atajos, cuyo `label` la envuelve (objetivo efectivo mayor). Pocket: el e2e ya exige >= 44 px. **Cumple.**

## 4. Rendimiento (tarea 4)

Traza por CDP (`PerformanceObserver` de LCP, `layout-shift` y `longtask`) con CPU 4x y red de 1,6 Mb/s, 150 ms de RTT, caché desactivada. Mediana de 3 ejecuciones. TBT aprox. = suma de (duración - 50 ms) de las tareas largas desde FCP; es una aproximación, no la métrica de Lighthouse.

| Escenario | FCP | LCP (elemento) | CLS | TBT aprox. |
|---|---|---|---|---|
| Portada `/` | 1,84 s | 3,03 s (h1) | 0 | 0 ms |
| Portada `/en/` | 1,33 s | 3,08 s (h1) | 0 | 0 ms |
| Portada, **clic en el overlay** (solo la acción) | n/a | n/a | 0 | **598 ms** (3 ejecuciones: 598, 744, 0) |
| `/os/` frío, sin arranque | 1,21 s | **1,30 s** (texto de Bienvenida) | 0,029 | 167 ms |
| `/os/` con arranque | 1,32 s | 1,43 s | 0,026 | 299 ms |
| `/en/os/` | 1,26 s | 1,42 s | 0,029 | 212 ms |
| Deep link de proyecto | 1,49 s | 2,24 s (imagen de portada del proyecto) | 0,037 | 241 ms |
| `/os/` en 390 | 1,06 s | 1,06 s | 0,001 | 98 ms |

Lectura: el SO en `/os/` pinta antes que la portada actual (LCP 1,3 s frente a 3,0 s) porque su HTML sale renderizado y la ventana Bienvenida es texto; abrirlo desde la portada con el overlay cuesta ~600 ms de hilo bloqueado a 4x. CLS bajo el umbral de 0,1 en todos los casos, pero distinto de 0 en el escritorio (no se identificó la fuente; D8). El LCP del deep link lo marca la imagen de 89 KB de CiviCoin. Las 3 ejecuciones varían bastante (TBT 65-412 ms) porque el equipo no es dedicado.

## 5. CI (tarea 5)

Cambios (sin commit):
- `.github/workflows/ci.yml`: nuevo job `os-e2e` ("E2E del SO (standalone)"), independiente de `check` (no lo toca). Pasos: checkout y Node fijados por SHA como el resto, `npm ci`, `npm run build`, copia de `public` y `.next/static` al standalone, **smoke** (arranca el standalone en 3111 y lo detiene aunque falle), `npm run e2e:os` y `npm run e2e:pocket` (ambos con `--serve`, cada uno levanta y detiene su servidor). YAML validado con `yaml.safe_load` (jobs: `check`, `os-e2e`); no se ha ejecutado en un runner real.
- `package.json`: script `e2e:pocket` (`node scripts/os-e2e-pocket.mjs --serve`).
- `scripts/os-e2e.mjs` y `scripts/os-e2e-pocket.mjs`: `E2E_NO_SANDBOX` añade `--no-sandbox` a Chrome (los runners recientes limitan los user namespaces) y el E2E Pocket ignora el 503 de `/api/lastfm/` (ver D9).

Variables (comentadas en el propio job):

| Variable | Uso |
|---|---|
| `E2E_BROWSER` | Ruta del navegador. En CI `/usr/bin/google-chrome`; en local se autodetecta Edge/Chrome. |
| `E2E_NO_SANDBOX` | Cualquier valor añade `--no-sandbox`. En CI vale `1`. |
| `E2E_ROOT` | Raíz con `.next/standalone` a servir (por defecto este repo). Útil para servir una copia y no pisar el build. |
| `E2E_VERBOSE` | (pocket) imprime cada comprobación, no solo los fallos. |
| Puertos | smoke y `e2e:os` 3111; `e2e:pocket` 3121. |

Nota: el árbol de trabajo tenía `scripts/os-e2e.mjs` con cambios de otros revisores (+160 líneas) que esperan el código también sin commitear; contra un build de HEAD falla en `openProject` ("La galería no expone `[data-slug]`"). Los resultados de este informe usan los scripts de HEAD contra el build de HEAD.

## 6. Defectos

Severidad: Alta = bloquea o contradice el presupuesto/criterio; Media = defecto visible o de experiencia; Baja = pulido.

| # | Sev. | Defecto | Archivo(s) sospechoso(s) |
|---|---|---|---|
| D1 | **Alta** | Abrir "Mi trabajo" descarga las 13 miniaturas a tamaño completo: **7,48 MB** (PNG de 0,47 a 0,76 MB para tarjetas de 160 px). `images: { unoptimized: true }` desactiva el redimensionado de `next/image` y el `loading="lazy"` no lo evita (las 13 se piden aunque solo se ven ~9). Contradice el presupuesto de datos transferidos (§2.3). Fix: miniaturas precomputadas (p. ej. 320 px WebP/AVIF) o `unoptimized` solo donde corresponda y `src` dedicado al listado. | `components/os/apps/projects-gallery.tsx:35`, `next.config.ts:66`, `content/projects.ts` |
| D2 | Media | La mascota descarga una hoja de sprites de **2,28 MB** en cada carga fría de escritorio (el JS del SO entero son 174 KB). Fix: recomprimir/WebP, o cargarla solo al mostrar el personaje tras interacción o `requestIdleCallback`. | `public/images/edav-clippy-sprites.png`, `components/desktop/RetroClippy.tsx` |
| D3 | Media | Pocket 390: en "Mi trabajo" la columna de filtros ocupa ~187 px y deja una columna derecha **vacía**; las tarjetas arrancan debajo de los filtros, con un hueco en blanco enorme. El listado debería ocupar el ancho completo o los filtros colapsarse. Visible en `o12-*-390-2-proyecto.png`/`-1-galeria.png`. | `components/os/apps/gallery.module.css`, `components/os/apps/projects-gallery.tsx` |
| D4 | Media | Arranque: el título y el aviso "Cualquier clic o tecla omite el inicio" se pintan en `rgb(84,101,139)` sobre `rgb(0,61,215)` (contraste ~1,6:1). El `color` del `.os-boot` no llega a los `<p>` (otra regla los pisa). El bloque es `aria-hidden` y decorativo, pero el aviso es información para el usuario con visión. Fix: fijar `color` en `.os-boot__title` y `.os-boot__hint`. | `components/os/os.css:1157,1174`, regla global de `p` en `app/styles/` |
| D5 | Media | El globo de la bandeja "Bienvenido a EDAV OS / Haz clic en un icono para abrirlo" se solapa con los botones y el personaje de la mascota al cargar (visible en deep link a 1440, `o12-es-1440-8-deeplink-proyecto.png`): tapa "Cambiar de esquina"/"Ocultar". | `components/os/balloon.tsx`, `components/os/assistant.tsx`, capas en `components/os/os.css` |
| D6 | Baja | Tras la evasión del foco (p. ej. al abrir la ayuda de atajos abajo a la derecha) la mascota se queda en la otra esquina al cerrarla y su globo tapa los iconos "Propiedades" y "CV.pdf" del escritorio. | `components/os/assistant.tsx` (esquina de evasión) |
| D7 | Baja | Panel de pasos: el botón "Paso grande"/"Large step" se pinta en el centro de la cruz de flechas y se solapa con ↑/↓ (EN 1024). Fix: el control de paso fuera de la rejilla de flechas o ancho mínimo/`white-space`. | `components/os/steps-panel.tsx`, `.xp-nudge` en `components/os/os.css` |
| D8 | Baja | CLS 0,026-0,037 en `/os/` y deep link (bajo 0,1, pero no 0). Origen sin identificar; sospecha: aparición de la mascota/globo o el reloj de la bandeja tras hidratar. | `components/os/assistant.tsx`, `components/os/taskbar.tsx` |
| D9 | Baja | Sin credenciales de Last.fm, `/api/lastfm/` responde 503 y deja un `error` en consola al cargar `/os/` (visto en deep link y en el E2E Pocket; origen exacto de la petición sin confirmar). Rompía `e2e:pocket` (74/75) en CI, donde no hay secretos. Mitigado en el script; conviene decidir si la consola de producción debe quedar limpia sin la clave. | `app/api/lastfm/route.ts`, `components/os/apps/media.tsx`, `scripts/os-e2e-pocket.mjs` |
| D10 | Baja | Copy: en Pocket el globo dice "Haz clic en un icono para abrirlo" cuando la primera pantalla es la ventana Bienvenida sin iconos visibles. | `content/ui.ts` (clave del globo) |
| D11 | Info | Contacto en Pocket enfoca el primer campo al abrir (anillo de foco grueso en las capturas): en táctil abre el teclado virtual. A confirmar en dispositivo real. | `components/os/apps/contact.tsx` |
| D12 | Info | La portada aún no enlaza a `/os/`; al hacerlo (O9) hay que repetir la medición de prefetch: los enlaces deben ir con `prefetch={false}`. | `components/views/home.tsx`, `components/footer.tsx` |

## Lo que CDP no cubre

- **Lector de pantalla** (NVDA, JAWS, VoiceOver, TalkBack): anuncios del `Announcer`, roles `menu`/`dialog`/`toolbar`, orden de lectura y foco con ventanas y Pocket. Axe solo detecta lo automatizable.
- **WebKit y Firefox**: `fill="var()"` en atributos SVG, `inert`, `:focus-visible`, `touch-action`, `overscroll-behavior`, gestos de Safari iOS (barra dinámica, `100dvh`), `Page Visibility` en segundo plano.
- **Gesto Atrás físico** (Android) y el botón Atrás del navegador móvil: el E2E emula `history.back()`, no el gesto del sistema ni el predictivo de Android 14+.
- **Atajos del sistema**: `Alt+Shift+…` puede chocar con el cambio de distribución de teclado de Windows o con atajos de lectores de pantalla y extensiones; CDP los inyecta sin pasar por el sistema operativo. Tampoco prueba teclados reales (ISO/ANSI, `event.code` por posición física).
- **Táctil real**: teclado virtual, rotación física, zoom por pellizco, objetivos con el dedo (solo se emula con `setTouchEmulationEnabled`).
- **Caché Traefik/Cloudflare, HTML frente a RSC**: HTML y RSC comparten URL y se distinguen por `RSC: 1` y `Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding`, con `Cache-Control: s-maxage=31536000`. Falta la prueba de §7 O12 por el borde real: ambos órdenes de calentamiento (HTML primero y RSC primero), que Cloudflare respete el `Vary` (o no cachee la variante RSC en la URL del HTML), `Content-Type` correcto en cada caso, `_rsc` en el query y que las redirecciones conserven el query, y una **purga** posterior (por URL y por etiqueta) que renueve ambas variantes. Sin esa prueba no hay corte, según el propio plan.
- **Carga real**: la red lenta simulada no equivale a la de un móvil de gama baja; CPU 4x tampoco sustituye un perfil real. El TBT es aproximado.
- **Producción**: CSP en Report-Only, cabeceras de Cloudflare/Coolify y las credenciales reales de Last.fm/SMTP (el entorno de pruebas no las tenía).
