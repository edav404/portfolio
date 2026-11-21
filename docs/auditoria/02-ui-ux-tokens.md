# Fase 1 · Informe 02 — UI/UX (Windows XP / Y2K) y design tokens

Auditor: UI/UX + design tokens. Modo: solo lectura. Fecha: 2026-11-20. Rama: `fase/1-auditoria`.

## 0. Método y alcance

- Leí completos `app/globals.css` (374 líneas), `app/desktop.css` (489), `app/layout.tsx`, `app/page.tsx`, todas las páginas de `app/*`, `components/*.tsx` y `components/desktop/*.tsx`.
- Arranqué `next dev -p 3107` y Chrome headless (CDP) para capturar 20 pantallas en 1366×768 y 390×844 (gateway, home estándar, arranque, escritorio, menú Inicio, Explorer, /proyectos, caso, /contacto, /sobre-mi). Las capturas están en `…\scratchpad\fase1\shots\` y el script en `…\scratchpad\fase1\shot.mjs`. Al terminar maté ambos procesos por PID (35460 y 25756, con su árbol). El puerto 3107 quedó libre.
- **Efecto secundario que no pude revertir:** `next dev` reescribió `AGENTS.md` (cambió `# This is NOT the Next.js you know` por `## …`, 1 línea; lo advierte el propio AGENTS.md). Intenté `git checkout -- AGENTS.md` y el permiso fue denegado. **El árbol queda con `M AGENTS.md`.** Quien coordine debe decidir si lo revierte o lo commitea, como sugiere el bloque.
- Marco con **[V]** lo verificado (código, captura o comando) y con **[S]** las suposiciones o los valores de referencia que hay que contrastar.

---

## 1. Diagnóstico visual (fidelidad XP / Y2K)

### Resumen
El "SO" actual **no es Windows XP: es Windows 98/2000**, con cromo gris `#c0c0c0`, bordes `outset`/`inset`, barra de título con degradado horizontal navy→celeste y barra de tareas gris. La marca lo dice explícitamente ("EDAV Desktop 98", "EDAV BIOS v98.04.04"). Además conviven **cuatro lenguajes visuales** sin sistema común:

| Superficie | Lenguaje actual [V] | Evidencia |
|---|---|---|
| Selector `/` | Panel navy oscuro, Space Grotesk, labels mono en mayúsculas | `desktop.css:24-47` |
| Home "web normal" | Glassmorphism SaaS: blur, orbes, radios de 13–28px, ticker, degradados violeta | `globals.css:62-220` |
| Páginas secundarias | Híbrido: cabecera gris 98 y botones `outset` encima del fondo glass con radios de 28px | `desktop.css:344-357`, `globals.css:232` |
| Escritorio | Win98 + vaporwave (sol a rayas, rejilla en perspectiva, CRT) | `desktop.css:49-263` |

### Hallazgos

**UI-01 · importante · El escritorio imita Win98, no XP Luna** [V]
- Evidencia: `app/desktop.css:6` (`--os-chrome: #c0c0c0`), `:84` (`border: 2px outset`), `:87` (degradado de título de 90° estilo 98), `:92` (botones de ventana grises cuadrados), `:217-219` (barra de tareas y botón Inicio grises), `:234-237` (menú Inicio con banda vertical "EDAV 98", típica de 95/98). Textos: `components/desktop/desktop-shell.tsx:129,132,150,225` ("Desktop 98", "BIOS"). Capturas `desk-04-desktop.png` y `desk-05-start.png`.
- Impacto: incumple el brief (XP/Luna). Ninguna pieza reconocible de XP: ni barra de tareas azul, ni botón verde "inicio", ni menú Inicio de dos columnas, ni ventanas con esquinas superiores redondeadas, ni botón de cerrar rojo, ni bandeja celeste, ni fondo de diálogo `#ECE9D8`.
- Fix: reescribir el cromo con los tokens `xp` de la §3 (barra de tareas, Inicio, menú de dos columnas, ventanas Luna, botones Luna, bandeja). Cambiar la marca a "EDAV XP" o similar y quitar la BIOS (XP no la mostraba al usuario; el arranque de XP es logo + barra de progreso).
- Fase 4 · L.

**UI-02 · importante · Sin sistema de temas: estilos condicionados con `body:has()`** [V]
- Evidencia: `desktop.css:16-22` oculta header y footer con `body:has(.desktop-os)`. `desktop.css:345-357` re-tematiza las páginas secundarias con `body:not(:has(.desktop-os)):not(:has(.standard-home))` (selectores de especificidad alta repetidos 13 veces). El `<Header/>` y el `<Footer/>` se montan siempre en `app/layout.tsx:30` y luego se esconden.
- Impacto: el tema depende de qué clase aparece en el DOM. Es frágil, difícil de extender a `/classic` y provoca saltos visuales, porque un mismo componente (`.button`, `.window`) tiene dos aspectos según la página. Ejemplo: en `/contacto` móvil, cabecera gris 98 con botón hamburguesa redondeado glass (`mob-09-contacto.png`).
- Fix: grupos de rutas `app/(os)/…` y `app/(classic)/…` con layouts propios y un atributo `data-theme="xp|classic"` en `<html>` o en el wrapper del layout. Los componentes consumen solo tokens semánticos. Eliminar todos los `:has()` de tema.
- Fase 3 (tokens y temas) y 5 (rutas) · M.

**UI-03 · importante · La "vista web normal" se lee como plantilla SaaS/IA, no como Y2K** [V]
- Evidencia (`components/standard-home.tsx`):
  - eyebrows mono en mayúsculas con numeración falsa ("Trabajo seleccionado · 01" … "Now playing · 05", `:169,175,180,184,186`); las secciones no son una secuencia.
  - "TL;DR · Lo esencial" (`:165`).
  - flecha → en todos los CTA (`components/ui.tsx:27`).
  - fila de métricas grandes "13+ / 5+ / 100%" (`:146`).
  - orbes flotantes y etiquetas `<creative />` (`:149,157`).
  - ticker infinito (`:162`).
  - tarjetas idénticas con radio 24px, sombra suave y `translateY(-8px)` al pasar el ratón (`globals.css:129-130,149-150`).
  - degradado azul→violeta en el CTA final (`globals.css:216`).
  - titular con una palabra en contorno (`globals.css:65`).
  - Tipografía Space Grotesk + DM Mono (`globals.css:1`), la combinación por defecto de 2023-25.
- Impacto: contradice "web Y2K/2000s limpia". No diferencia al autor y cae en casi todos los tics que enumera la skill frontend-design.
- Fix: rediseñar `/classic` según la §4. Eliminar eyebrows numerados, flechas automáticas, orbes, ticker y fila de métricas genérica.
- Fase 5 · M.

**UI-04 · importante · Iconos del escritorio por encima de las ventanas (z-index)** [V]
- Evidencia: `.os-desktop-icons { z-index: 5 }` (`desktop.css:68`) y `.os-mobile-label { z-index: 6 }` (`:417`). Las ventanas usan `zIndex: item.z` inline empezando en 1–3 (`desktop-shell.tsx:30-38`, `:234`), y `.os-window-layer` (`:83`) no crea contexto de apilamiento. Las primeras ventanas (z 1–5) quedan **debajo** de los iconos. Captura `mob-04-desktop.png`: el icono "Vista web accesible" tapa la barra de título de Welcome.exe. Lo mismo pasa si se arrastra una ventana sobre la columna de iconos en escritorio.
- Además `focus()` hace `z: maxZ + 1` sin límite (`desktop-shell.tsx:216-217`). Tras unos 9000 enfoques una ventana taparía la barra de tareas (`z-index: 9000`, `desktop.css:217`); es improbable pero estructural.
- Fix: escala de capas por tokens (`--z-desktop-icons:1`, `--z-windows:10` sobre `.os-window-layer` con `isolation:isolate`, `--z-taskbar:100`…; §3.6). Dentro de la capa de ventanas, normalizar z a su orden (0…n-1) en cada foco.
- Fase 4 · S.

**UI-05 · importante · Rejilla de iconos móvil rota** [V]
- Evidencia: `desktop.css:421` usa `grid-template-columns: repeat(6, 70px)` para 7 botones (6 apps y "Vista web accesible", `desktop-shell.tsx:232`). El séptimo salta a una segunda fila que cae sobre la ventana (que empieza en `top:130px`, `desktop.css:427`) y el sexto queda cortado ("C…" en `mob-04-desktop.png`).
- Fix: ver la propuesta móvil de la §2 (lanzador en cuadrícula 4×N a pantalla completa, sin ventanas superpuestas).
- Fase 4 · S.

**UI-06 · importante · Asistente, globo y notificación se solapan y tapan contenido** [V]
- Evidencia: el portal del asistente tiene `z-index: 2147483000` (`desktop.css:266`) en la esquina inferior derecha. La notificación también va abajo a la derecha (`:254`). El globo aparece solo (`RetroClippy.tsx:68-73`). En `desk-04`/`desk-06` el clip pisa la notificación. En `mob-06-explorer.png` globo, clip y notificación tapan media pantalla y la barra "Abrir caso".
- Fix: el asistente vive en una capa propia por debajo de los menús (`--z-assistant`, §3.6). En móvil arranca minimizado como icono de bandeja. Las notificaciones salen como globo de bandeja XP (anclado al reloj) y nunca a la vez que el globo del asistente: una cola única de "globos".
- Fase 6 · M.

**UI-07 · menor · Controles falsos que no hacen nada** [V]
- Evidencia: barra de menús Archivo/Editar/Ver/Ayuda decorativa en todas las ventanas (`desktop-shell.tsx:236`). Botones ←/→/↑ sin `onClick` (`:160`). Las carpetas "Desarrollo web / E-commerce / Identidad visual" son `<li>` no interactivos (`:161`). "Cerrar sesión" solo muestra una notificación (`:241`). Los controles del reproductor son `aria-hidden` y decorativos (`music-widget.tsx:44`).
- Impacto: affordances rotas. El usuario hace clic y no pasa nada, lo que rompe la confianza en la metáfora.
- Fix: o funcionan o no se muestran como botones. Las carpetas del Explorer pasan a ser los filtros de la galería única (Fase 4). "Ver" alterna iconos/detalles. "Ayuda" abre el asistente. "Cerrar sesión" vuelve al selector de `/`. Lo que no tenga función se elimina.
- Fase 4 · M.

**UI-08 · menor · Tipografía: carga bloqueante y fuentes que no existen en móvil** [V]
- Evidencia: `@import` de Google Fonts en `globals.css:1`, que bloquea el render y envía datos a un tercero. El escritorio usa `Tahoma` (`desktop.css:13`), `"Arial Narrow", Impact` (`:114,161`), `Arial Black` (`:58,177`) y `serif` (`globals.css:165`). Tahoma, Impact y Arial Narrow no vienen en Android ni en iOS [S, conocimiento general]: allí cae a la sans del sistema y los titulares condensados en mayúsculas cambian de ancho y de carácter.
- Hay 9 pilas de fuentes distintas y 3 variantes escritas a mano de la pila Tahoma (`desktop.css:13,24,266,283`).
- Fix: `next/font/local` (documentado en `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md`) con fuentes de licencia libre y métricas cercanas a las de la época. No redistribuir Tahoma, Verdana ni Trebuchet (licencia de Microsoft). Pilas de la §3.2.
- Fase 3 (definir) y 7 (rendimiento) · S.

**UI-09 · menor · CRT activo por defecto en un SO que nunca lo tuvo** [V]
- Evidencia: `useState(true)` en `desktop-shell.tsx:191`. Canvas WebGL a pantalla completa con `mix-blend-mode: multiply; opacity:.42` y bucle `requestAnimationFrame` continuo (`crt-overlay.tsx:145-151`, `desktop.css:263`).
- Impacto: oscurece y baja el contraste de todo, gasta batería en móvil y es anacrónico en XP (pantallas LCD/CRT sin escaneo visible).
- Fix: apagado por defecto. Opción "Efectos de pantalla antigua" en Propiedades de pantalla. Pausar el rAF cuando la pestaña está oculta.
- Fase 4 · S.

**UI-10 · menor · Iconografía genérica** [V]
- Evidencia: `desktop-icons.tsx` dibuja iconos de trazo de 1.6px (estilo Lucide) dentro de cuadrados con degradado neón y `clip-path` (`desktop.css:72-81`).
- Impacto: XP se reconoce por iconos a todo color de 32/48px con luz desde arriba a la izquierda, contorno oscuro suave y sombra proyectada. Los actuales parecen una app moderna.
- Fix: set propio de iconos estilo XP (SVG o PNG a 16/32/48px) para Mis proyectos (carpeta amarilla), Sobre mí (tarjeta), Contacto (sobre), Reproductor (CD/nota), Símbolo del sistema, CV.pdf (documento con esquina doblada) y Papelera. Originales, no extraídos de Windows, para limitar el riesgo legal (las mascotas de Fase 6 son otra decisión del usuario).
- Fase 4 · M.

**UI-11 · menor · El logo de 4 cuadrados de colores evoca la marca Windows** [V/S]
- Evidencia: `.os-pixel-logo` (`desktop.css:221-223`), con rojo, azul, verde y amarillo en rejilla 2×2.
- Impacto: el homenaje está bien, pero es la pieza más cercana a una marca registrada. Riesgo bajo y decisión del usuario [S].
- Fix: mantener los colores y cambiar la forma, por ejemplo un monograma "ED" ondeado en 4 colores.
- Fase 4 · S.

**UI-12 · menor · CSS muerto** [V]
- Evidencia: `.music-card`, `.music-icon`, `.music-copy`, `.live-dot`, `.music-fallback`, `.skeleton`, `.album-skeleton` (`globals.css:201-215,361-362,367`) sin uso en TSX. Keyframes sin uso `os-eq` y `os-load` (`desktop.css:379-380`). `shine` solo lo usa `.skeleton`, que también está muerto.
- Fix: borrar al migrar a tokens.
- Fase 3 · S.

**UI-13 · menor · Sonido** [V]
- Evidencia: los pitidos son ondas cuadradas de Web Audio (`desktop-shell.tsx:50-65,210-215`), con sonido desactivado por defecto (correcto). Se crea un `AudioContext` nuevo por cada pitido (`:213`); los navegadores limitan cuántos contextos pueden convivir [S].
- Fix: un único `AudioContext` perezoso. Set de sonidos originales cortos (clic, abrir, minimizar, error, notificación y arranque/cierre de sesión) en OGG/MP3 de unos 10 KB. No usar los .wav de Windows. Interruptor en la bandeja.
- Fase 4 · S.

---

## 2. UX

**UX-01 · crítico · "/" no tiene contenido indexable ni recuerda la elección** [V]
- Evidencia:
  - `PortfolioExperience` arranca en `"choice"` (`components/portfolio-experience.tsx:38`). El HTML del servidor de `/` solo contiene el selector: `fetch("/")` devuelve el H1 "¿Cómo quieres explorar el portafolio de Emmanuel?".
  - La home real solo aparece tras un clic en el cliente; `?view=standard` usa el mismo canonical (`app/layout.tsx:17`).
  - `localStorage.setItem("edav-view", …)` (`:52`) **nunca se lee**: el selector sale en todas las visitas y también al pulsar "Atrás" desde un caso de estudio.
- Impacto: SEO pobre en la URL principal (el H1 no dice quién es ni qué hace). Fricción en cada visita y sin JS no hay nada útil.
- Fix: rutas reales `/os` y `/classic`.
  - `/` = selector estilo XP (§5) con contenido mínimo rastreable: nombre, rol, enlaces a ambas vistas y a CV/contacto.
  - Guardar la elección en una **cookie** (no en localStorage) y redirigir en el servidor con `proxy.ts`. En Next 16 Middleware pasó a llamarse Proxy (`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`). Así no hay parpadeo del selector.
  - Opción "Cambiar experiencia" visible en ambas vistas, que borra la cookie.
  - Canonical: `/classic` como versión canónica del contenido; `/os` con canonical propio y `noindex` opcional (decidir en Fase 7).
- Fase 5 · M.

**UX-02 · importante · El reclutador no encuentra CV, correo ni LinkedIn** [V]
- Evidencia: `/cv/emmanuel-davila-cv-{es,en}.pdf` existe (`app/cv/[file]/route.ts:12-13`), pero **ningún componente lo enlaza** (grep `/cv/` sin resultados en `components/`). `email`, `linkedin` y `github` solo están en `content/profile.ts:56-62` y no se renderizan. `/contacto` ofrece formulario y WhatsApp (`app/contacto/page.tsx:9`).
- Impacto: el flujo "reclutador con prisa" (≤10 s hasta CV y canal de contacto) falla en las tres superficies.
- Fix: definir un "kit de contacto" único que aparezca en todas partes: Descargar CV (ES/EN según idioma), correo `mailto:`, LinkedIn, GitHub y WhatsApp.
  - Selector `/`: pie con "Descargar CV · LinkedIn · Correo".
  - `/os`: icono de escritorio `CV_Emmanuel_Davila.pdf` (abre visor o descarga), anclado en la columna izquierda del menú Inicio y en "Mis documentos".
  - `/classic`: botón "Descargar CV" en la cabecera, junto a Contacto, y bloque de contacto directo en la home.
- Fase 5 · S.

**UX-03 · importante · Tres pasos y ~5 s antes de ver algo en el modo escritorio** [V]
- Evidencia: selector → pantalla BIOS que exige clic o Enter ("Iniciar con sonido") → secuencia de 4,7 s (`desktop-shell.tsx:104-109`) → escritorio. En la captura `mob-03-boot.png` el texto del botón "Iniciar con sonido" se ve muy lavado [V visual; la causa exacta del contraste está sin aislar].
- Fix: elegir "Escritorio" en el selector ya es el gesto del usuario (sirve para desbloquear el audio). Mostrar "Bienvenido" de XP (≤1,2 s, saltable con cualquier tecla o clic) una vez por sesión. Nunca en enlaces profundos (`/proyectos/[slug]` abre directamente el SO con la ventana). Quitar la BIOS o dejarla como huevo de pascua (por ejemplo, F2 durante el arranque).
- Fase 5 · S.

**UX-04 · importante · Abrir un proyecto saca al usuario del SO** [V]
- Evidencia: el doble clic o "Abrir caso" hace `router.push('/proyectos/slug')` (`desktop-shell.tsx:161-162`) y carga una página web con cabecera, perdiendo todas las ventanas. Al volver con "Atrás" aparece de nuevo el selector (ver UX-01).
- Fix: el plan de Fase 4 (ventana con URL compartible). Recomiendo que `/proyectos/[slug]` resuelva por cookie: tema `os` → escritorio con la ventana del proyecto abierta; tema `classic` o sin cookie → página clásica del caso.
- Fase 4 · M.

**UX-05 · importante · Comportamiento del SO en móvil: propuesta** [V estado actual / propuesta]
- Hoy (≤768px): las ventanas se fuerzan a `inset:130px 7px 5px` (`desktop.css:427`) con iconos en carrusel horizontal encima, barra de tareas de 44px, asistente y notificaciones sobre el contenido. Arrastrar y redimensionar está desactivado (correcto). Resultado: unos 560px útiles, solapes (UI-04, UI-05, UI-06) y cromo que ocupa mucho para poco.
- Propuesta "XP Pocket" (≤768px):
  1. **Escritorio = lanzador**: cuadrícula 4 columnas de iconos 48px con etiqueta debajo (7–8 elementos, incluido CV.pdf), sin superposición de ventanas.
  2. **Ventanas a pantalla completa en pila**: solo una visible. Barra de título Luna de 36px con "‹ Atrás" a la izquierda y ✕ a la derecha (botones de 44×44 como mínimo). Minimizar y maximizar se ocultan.
  3. **Historial**: cada ventana abierta añade una entrada (`/os/proyectos/slug`), así el gesto de atrás del sistema la cierra.
  4. **Barra de tareas inferior de 48px**: botón inicio verde (solo logo), título de la ventana activa y reloj. El "cambio de tareas" es una hoja con miniaturas.
  5. **Menú Inicio** como hoja a pantalla completa con las dos columnas XP apiladas.
  6. **Asistente** minimizado en la bandeja por defecto; globos solo si el usuario lo invoca.
  7. Sin CRT, sin BIOS y con animaciones reducidas.
  8. El selector `/` muestra "Recomendado en móvil" sobre Clásico (ya existe, `desktop.css:392`), pero el escritorio debe seguir siendo usable.
- Fase 4 · M.

**UX-06 · menor · Botón flotante "Abrir EDAV Desktop 98" solapa el hero en móvil** [V]
- Evidencia: `.experience-switch { position: fixed; top: 86px }` (`desktop.css:359`, `:474`). Captura `mob-02-standard.png`: tapa la píldora "Disponible…".
- Fix: mover a la cabecera o al pie de `/classic` como enlace "Ver en modo escritorio XP" (con un icono de monitor de 16px).
- Fase 5 · S.

**UX-07 · menor · Cifras hardcodeadas e inconsistentes** [V]
- Evidencia: "13+ proyectos / 5+ años / 100% hecho a la medida" (`standard-home.tsx:146`), "Ver los 13 proyectos" (`:171`), BIOS "13 ITEMS" (`desktop-shell.tsx:137`), About "5+ años / 13 documentados" (`:175`), frente a `content/profile.ts:63-66` ("12 proyectos web para clientes", 3 países, 3 productos en equipo).
- Impacto: credibilidad ante un reclutador; el "5+ años" no está respaldado por `content/` [S].
- Fix: derivar siempre de `content/` (`projects.length`, `profile.stats`). Quitar "100%".
- Fase 3 · S.

**UX-08 · importante · Accesibilidad del cromo del SO** [V]
- Evidencia:
  - El menú Inicio y el menú contextual no tienen `role="menu"`, ni navegación con flechas, ni cierre con Escape, ni gestión ni retorno del foco (`desktop-shell.tsx:240-241`; el único Escape está en el arranque, `:116`).
  - El menú contextual solo se abre con clic derecho (sin Shift+F10 ni tecla de menú).
  - Las ventanas son `<section aria-label>` sin anuncio al abrirse. Tras cerrar una ventana el foco se pierde.
  - El enfoque de la `os-desktop` es `outline: 2px dotted #050505; outline-offset:-4px` (`desktop.css:52`), invisible sobre la barra de título azul oscuro.
  - El texto de los iconos es blanco sobre un fondo de degradado variable.
- Fix: patrón de menú WAI-ARIA para Inicio y contextual; foco al primer control de la ventana al abrir y devolución al botón de la barra de tareas al cerrar; indicador de foco con token `--focus-ring` de doble anillo (blanco + `#316AC5`) visible sobre cualquier fondo.
- Fase 4 (implementación) y 7 (auditoría) · M.

**UX-09 · menor · La marca "EDAV OS / creative system 1.0" no dice quién es** [V]
- Evidencia: `components/header.tsx:25-26`.
- Impacto: en `/classic` el reclutador debe ver "Emmanuel Dávila — Desarrollador web" en la cabecera.
- Fix: logo-texto con el nombre; "EDAV" queda como marca del SO.
- Fase 5 · S.

**UX-10 · menor · Idiomas mezclados en el SO** [V]
- Evidencia: "Welcome.exe", "Project Explorer", "Services Wizard", "New Message", "Command Prompt", "WELCOME TO MY PERSONAL COMPUTER" en modo ES (`desktop-shell.tsx:20-28,168`); "PORTFOLIO EXPERIENCE SELECTOR" (`portfolio-experience.tsx:13`).
- Fix: XP en español usaba "Mi PC", "Mis documentos", "Explorador de Windows", "Símbolo del sistema", "Panel de control", "inicio" (en minúscula), "Cerrar sesión", "Apagar equipo". Pasar todo a `content/` con `L<T>`.
- Fase 3 · S.

**UX-11 · menor · Descubribilidad en el escritorio** [V/S]
- Bien: la ventana Bienvenido con botones "Explorar mi trabajo" e "Iniciar proyecto" abierta al inicio, y una notificación inicial.
- Falta:
  - icono de CV;
  - un "¿Qué es esto?" para quien no vivió XP: el globo de bandeja "Sugerencia: haz doble clic en Mis proyectos";
  - doble clic real: hoy los iconos abren con un clic (`desktop-shell.tsx:232`), lo que es más accesible pero menos fiel. Recomiendo un clic para seleccionar y doble clic o Enter para abrir en escritorio, y un toque para abrir en táctil [S, decisión de diseño].
- Fase 4 · S.

---

## 3. Design tokens

### 3.1 Inventario actual [V]

Medido sobre `app/globals.css` y `app/desktop.css` con grep (ver los comandos en la §0).

| Categoría | Usos | Valores únicos | Notas |
|---|---|---|---|
| Colores hex | 514 | **264** | `#fff`×130, `#001b78`×27 (existe `--os-blue:#001b78`, pero **0 usos**), `#000`×26, `#64ff8d`×8, `#f6ff00`×7, `#ff2db2`×6, `#ffffcc`×5, `#c0c0c0`×4 (+13 vía var) |
| Colores rgba | 126 | **103** | casi todos son variaciones de `rgba(34,87,231,x)` y `rgba(31,64,139,x)` con alfas distintas |
| Custom properties declaradas | — | 26 (15 base + 11 `--os-*`) | **7 de 11 `--os-*` sin uso** (`--os-blue`, `--os-blue-bright`, `--os-sky`, `--os-light`, `--os-dark`, `--os-yellow`, `--os-magenta`); `--radius` usado 1 vez; `--surface` 1; `--paper` 1 |
| `var()` más usados | — | — | `--mono` 32, `--blue` 23, `--line` 22, `--os-chrome` 13, `--ink` 11, `--muted` 10 |
| Familias tipográficas | — | 9 pilas | Space Grotesk, DM Mono, Tahoma (3 variantes de pila), Arial, Arial Black, Arial Narrow/Impact, serif. DM Mono se escribe literal 8 veces en vez de `var(--mono)` |
| Tamaños de fuente | 102 (`font-size` 50, shorthand `font` 52) | ~60 | mezcla de px (8–25px), rem y 7 `clamp()` distintos; sin escala |
| Border-radius | 61 | **21** | 0×11, 50%×12, 10px×8, 999px×3, 14/16px×3, y 4,5,7,8,9,11,12,13,17,18,20,22,28px |
| Box-shadow | 65 | **52** | solo 3 usan `var(--shadow)` |
| z-index | 35 | **22** | de −2 a **2147483000**: 1,2,3,4,5,6,20,21,30,40,100,250,1000,8999,9000,9100,9200,9500,10001,20000,30000; más el z dinámico de las ventanas (1…∞) inline |
| Espaciado (gap/padding/margin) | — | >45 | 1rem×26, 5px×23, 3px×22, 10px×21, 2px×20, 8px×18, 7px×17, 9px×16, 6px×16… mezcla px/rem sin rejilla |
| Breakpoints | 4 | 4 | 900 y 640 (globals) frente a 768 y 430 (desktop): dos sistemas distintos |
| Keyframes | 29 | 29 | 2 sin uso (`os-eq`, `os-load`) |
| Duplicados notables | — | — | el botón primario azul aparece 4 veces con degradados distintos (`globals.css:57,71`, `desktop.css:108,194,352`); el "botón 98" `outset` existe dos veces (`.os-98-button` `desktop.css:105` y `.win-outset` `:283`); la barra de título azul existe tres veces (`.window-bar` `globals.css:89`, `.os-titlebar` `desktop.css:87`, `.music-player-titlebar` `globals.css:172`) |

### 3.2 Arquitectura propuesta

Tres niveles, en CSS puro (sin dependencia nueva):

```
tokens/
  base.css      → primitivas compartidas (escala de espacio, tipo, movimiento, z, foco)
  xp.css        → [data-theme="xp"]       semánticos para /os
  classic.css   → [data-theme="classic"]  semánticos para /classic
```

Los componentes solo leen tokens semánticos (`--surface`, `--text`, `--accent`…), nunca hex. Los dos temas comparten `base.css` y nombres semánticos, así que un componente como `ProjectCard` o `ContactForm` funciona en ambos sin `:has()`.

### 3.3 `base.css` (compartido)

```css
:root {
  /* Espaciado: rejilla de 4px (XP era denso; classic usa los pasos altos) */
  --space-0: 0; --space-1: 2px; --space-2: 4px; --space-3: 6px; --space-4: 8px;
  --space-5: 12px; --space-6: 16px; --space-7: 24px; --space-8: 32px; --space-9: 48px; --space-10: 64px; --space-11: 96px;

  /* Tipo: escala modular 1.2 sobre 13px para UI y 16px para lectura */
  --text-2xs: 11px;   /* tamaño UI de XP (8pt Tahoma) */
  --text-xs: 12px;
  --text-sm: 13px;    /* títulos de ventana XP */
  --text-md: 16px;    /* cuerpo de lectura */
  --text-lg: 19px;
  --text-xl: 23px;
  --text-2xl: 28px;
  --text-3xl: clamp(28px, 4vw, 40px);
  --text-4xl: clamp(34px, 6vw, 56px);
  --leading-ui: 1.3; --leading-body: 1.6; --leading-tight: 1.1;

  /* Familias: fuentes libres autoalojadas con next/font/local y respaldo de sistema [S: elegir archivos concretos] */
  --font-ui: "UI Sans", Tahoma, Verdana, "DejaVu Sans", system-ui, sans-serif;     /* p. ej. DejaVu Sans / Bitstream Vera: métricas tipo Verdana/Tahoma, licencia libre */
  --font-display: "Display Sans", "Trebuchet MS", "Fira Sans", sans-serif;          /* titulares XP/2000s; buscar humanista libre de cuerpo estrecho */
  --font-mono: "Mono", "Lucida Console", Consolas, "DejaVu Sans Mono", monospace;

  /* Radios: pocos y con significado */
  --radius-none: 0; --radius-xs: 3px; /* botones XP */ --radius-sm: 4px; --radius-md: 8px; /* ventanas XP arriba */ --radius-lg: 12px; --radius-pill: 999px;

  /* Movimiento */
  --dur-fast: 120ms; --dur-base: 200ms; --dur-slow: 320ms;
  --ease-out: cubic-bezier(.2,.8,.2,1);

  /* Capas (sustituye los 22 valores actuales) */
  --z-base: 0; --z-desktop-icons: 1; --z-windows: 10; /* contexto aislado; dentro, 0..n */
  --z-taskbar: 100; --z-start-menu: 110; --z-context-menu: 120; --z-tray-balloon: 130;
  --z-assistant: 140; --z-overlay: 200; --z-boot: 300; --z-skip-link: 400;

  /* Foco: doble anillo visible sobre azul, gris o blanco */
  --focus-ring: 0 0 0 2px #fff, 0 0 0 4px #316ac5;

  /* Breakpoints (para documentar; en CSS se repiten como literales o con @custom-media vía PostCSS) */
  /* sm 480 · md 768 · lg 1024 · xl 1280 */
}
@media (prefers-reduced-motion: reduce) { :root { --dur-fast: 0ms; --dur-base: 0ms; --dur-slow: 0ms; } }
```

### 3.4 Tema `xp` (/os): Luna azul

Valores de referencia de Luna tomados de memoria visual de XP **[S: contrastar con capturas reales de XP antes de cerrar]**.

```css
[data-theme="xp"] {
  /* Escritorio */
  --desktop-bg: #3a6ea5;                 /* respaldo sin fondo de pantalla */
  --desktop-icon-text: #fff;
  --desktop-icon-text-shadow: 1px 1px 1px #000;
  --desktop-selection: #316ac5;

  /* Superficies */
  --surface: #ece9d8;                    /* "3D face" de Luna: diálogos, barras de menú */
  --surface-raised: #f5f4ea;             /* botones */
  --surface-content: #fff;               /* área cliente */
  --surface-sunken: #fff;
  --border-control: #003c74;             /* borde de botón Luna */
  --border-subtle: #aca899;
  --text: #000; --text-muted: #6d6d6d; --text-disabled: #aca899;
  --link: #0000ff; --link-visited: #800080;

  /* Ventana */
  --window-frame: #0831d9;
  --window-radius: var(--radius-md) var(--radius-md) 0 0;
  --titlebar-h: 30px;
  --titlebar-bg: linear-gradient(180deg, #0997ff 0%, #0053ee 8%, #0050ee 40%, #06f 88%, #06f 93%, #005bff 95%, #003dd7 96%, #003dd7 100%);
  --titlebar-bg-inactive: linear-gradient(180deg, #7a96df 0%, #9db9eb 10%, #7a96df 100%);
  --titlebar-text: #fff; --titlebar-text-shadow: 1px 1px #0f1089;
  --titlebar-font: 700 var(--text-sm)/1 var(--font-display);
  --caption-btn: linear-gradient(180deg, #fff 0%, #a7c6ff 30%, #3c80f4 100%);  /* minimizar y maximizar */
  --caption-close: linear-gradient(180deg, #f8a98a 0%, #e0461c 40%, #c03010 100%);
  --caption-border: #fff;

  /* Barra de tareas */
  --taskbar-h: 30px;
  --taskbar-bg: linear-gradient(180deg, #3168d5 0%, #4993e6 3%, #2157d7 6%, #2663e0 10%, #245edc 90%, #1941a5 100%);
  --taskbar-btn: #3c81f3; --taskbar-btn-active: #1e52b7;
  --start-bg: linear-gradient(180deg, #3c9d29 0%, #56b33d 12%, #3c9d29 80%, #2f8a1f 100%);
  --start-text: #fff; --start-font: italic 700 var(--text-lg)/1 var(--font-display);  /* "inicio" en minúscula */
  --tray-bg: linear-gradient(180deg, #0c59b9 0%, #139ee9 6%, #18b5f2 50%, #139beb 94%, #0c59b9 100%);
  --tray-border: #095bc9;

  /* Menú Inicio */
  --start-menu-header: linear-gradient(180deg, #1f5fcd 0%, #3b86e6 100%);
  --start-menu-left: #fff;
  --start-menu-right: #d3e5fa;
  --start-menu-footer: var(--start-menu-header);
  --menu-hover: #316ac5; --menu-hover-text: #fff;

  /* Explorer: panel de tareas izquierdo */
  --taskpane-bg: linear-gradient(180deg, #7ba2e7 0%, #6375d6 100%);
  --taskpane-group-head: linear-gradient(90deg, #fff 0%, #c6d3f7 100%);
  --taskpane-group-text: #215dc6;
  --taskpane-group-body: #d6dff7;

  /* Globo de bandeja / asistente */
  --balloon-bg: #ffffe1; --balloon-border: #000;

  --accent: #316ac5;
  --success: #2f8a1f; --danger: #c03010;
  --shadow-window: 2px 2px 6px rgba(0,0,0,.35);
  --shadow-menu: 2px 2px 4px rgba(0,0,0,.4);
  --body-font: var(--text-2xs)/var(--leading-ui) var(--font-ui);
}
```

Reglas de uso XP:
- UI a 11px con `--font-ui`. Los títulos de ventana y "inicio" usan `--font-display` en negrita.
- Radios: 8px solo en las esquinas superiores de ventanas y del menú Inicio; 3px en botones; el botón inicio va redondeado a la derecha (`0 10px 10px 0`).
- Nada de neón, vaporwave ni rejilla en perspectiva dentro del SO. La nota Y2K se pone en el fondo de pantalla (colina verde y cielo azul **original**, no la foto *Bliss*) y en contenidos como el reproductor tipo Winamp, que sí es de época.

### 3.5 Tema `classic` (/classic): web limpia de 2003-2006

```css
[data-theme="classic"] {
  --page-bg: #e9eef5;                    /* gris azulado de fondo, fuera de la "hoja" */
  --sheet-bg: #fff;                      /* columna central de contenido */
  --sheet-border: #b7c4d6;
  --surface: #f4f7fb; --surface-raised: #fff; --surface-sunken: #eef2f8;
  --text: #1d2733; --text-muted: #58667a;
  --link: #1a4fb5; --link-hover: #c2410c; --link-visited: #6b3fa0;
  --accent: #2a64c5;                     /* azul "aqua" mate */
  --accent-2: #6aa121;                   /* verde lima de la época (badges "nuevo", OK) */
  --accent-3: #f29f05;                   /* naranja RSS/estrella, de uso puntual */
  --header-bg: linear-gradient(180deg, #4d87d9 0%, #2a64c5 55%, #1f4fa3 100%);  /* barra brillante 2.0 */
  --header-gloss: linear-gradient(180deg, rgba(255,255,255,.45), rgba(255,255,255,0) 50%);
  --nav-tab-bg: linear-gradient(180deg, #fdfefe, #dfe8f5);
  --nav-tab-active: #fff;
  --btn-primary: linear-gradient(180deg, #7fb6f2 0%, #3f86de 50%, #2a6fcc 51%, #2f78d6 100%);  /* botón "gel" de 2005 */
  --btn-primary-border: #1f4fa3;
  --btn-secondary: linear-gradient(180deg, #fff, #e4e9f0);
  --radius-control: var(--radius-sm);    /* 4px: los botones de 2000s no eran pastilla */
  --radius-panel: var(--radius-sm);
  --shadow-panel: 0 1px 0 #fff inset, 0 1px 2px rgba(29,39,51,.15);
  --rule: 1px dotted #b7c4d6;            /* separadores punteados, de época */
  --body-font: var(--text-md)/var(--leading-body) var(--font-ui);
  --heading-font: 700 var(--text-3xl)/var(--leading-tight) var(--font-display);
  --content-max: 960px;                  /* la "web de 960px" de la época, centrada */
}
```

### 3.6 Mapa de migración (clase actual → token)

| Actual | Token |
|---|---|
| `#001b78` ×27, `--os-blue` | `--accent` (xp) o `--titlebar-*` |
| `#c0c0c0`, `--os-chrome` | `--surface` (xp = `#ece9d8`) |
| `rgba(34,87,231,.2)` y similares | `--sheet-border` / `--border-subtle` |
| 21 radios | `--radius-{none,xs,sm,md,lg,pill}` |
| 52 sombras | `--shadow-{window,menu,panel}` (3–4) |
| 22 z-index | `--z-*` (12 capas) |
| `.os-98-button`, `.win-outset`, `.button` ×4 variantes | un `Button` con `variant` que lee `--btn-*` / `--surface-raised` |
| `.window-bar`, `.os-titlebar`, `.music-player-titlebar` | un `TitleBar` que lee `--titlebar-*` |

---

## 4. Dirección para `/classic` (web Y2K/2000s limpia)

### Plan de diseño (primera pasada y revisión)

- **Tema:** la página personal de un desarrollador de Medellín en 2005, bien hecha: columna central de 960px sobre fondo gris azulado, cabecera con brillo, pestañas de navegación, barra lateral con "Sobre mí" y contacto. Es el lenguaje de la web 2.0 temprana (Flickr, Delicious, blogs de Blogger y WordPress 2.x), coherente con un SO XP sin ser un disfraz.
- **Color:** `#2a64c5` azul gel, `#6aa121` verde lima, `#f29f05` naranja puntual, `#e9eef5` fondo, `#fff` hoja, `#1d2733` texto.
- **Tipo:** una sans humanista tipo Verdana/Tahoma para el cuerpo a 16px y una humanista de titulares tipo Trebuchet en negrita, sin tracking negativo. Las dos libres y autoalojadas.
- **Revisión contra los tics:** descarté glass, blur, orbes y el degradado violeta (ya están en la home actual y son el default SaaS). Descarté también el look "broadsheet" con líneas finas y radio 0. La apuesta que queda es la **columna de 960px con barra lateral y los botones gel**: es específica de la época y del estilo Windows, y nadie la confunde con una plantilla de 2024.

### Estructura (una sola página de scroll + páginas de detalle)

```
┌──────────────── cabecera brillante 960px ────────────────┐
│ Emmanuel Dávila · Desarrollador web     [CV ⇩] [ES|EN]   │
│ [Inicio][Proyectos][Servicios][Sobre mí][Contacto]  ← pestañas
├──────────────────────────────────────┬───────────────────┤
│ HOLA. Soy Emmanuel…  (2 líneas)      │ ┌ Foto/avatar ──┐ │
│ [Ver proyectos] [Escríbeme]          │ │ Disponible ●  │ │
│                                      │ │ Medellín, CO  │ │
│ Proyectos destacados                 │ │ correo        │ │
│ ┌────┐ título · año · rol            │ │ LinkedIn      │ │
│ │img │ 1 línea de resultado          │ │ GitHub        │ │
│ └────┘ [ficha →]  (lista, no cards)  │ │ CV ES / EN    │ │
│ … ×4, "ver los N proyectos"          │ └───────────────┘ │
│                                      │ Ahora suena ♪     │
│ Servicios (definición, no tarjetas)  │ (mini Last.fm)    │
│ Experiencia (línea de tiempo real)   │ Stack (tag cloud  │
│ Testimonios (citas con logo)         │  de época, sin    │
│                                      │  tamaños falsos)  │
├──────────────────────────────────────┴───────────────────┤
│ pie: © · "Ver en modo escritorio XP" · RSS(blog) · arriba │
└───────────────────────────────────────────────────────────┘
```

- **Alineación:** texto alineado a la izquierda; nada centrado salvo el pie.
- **Móvil:** la barra lateral pasa a ir **después del hero** (el contacto y el CV quedan en la primera pantalla y media); las pestañas se convierten en un menú desplegable con aspecto de `<select>` de la época o en una fila desplazable.

### Rasgos visuales concretos

1. Cabecera con degradado azul y brillo superior (`--header-gloss`) y pestañas blancas con borde de 1px y esquinas superiores de 4px.
2. Botones gel (`--btn-primary`) con texto blanco, `text-shadow` de 1px, radio de 4px y un estado `:active` que se hunde 1px. Sin flechas → automáticas.
3. Separadores punteados (`--rule`) y cabeceras de sección con un icono de 16px estilo XP (carpeta, sobre, nota). Sin eyebrows en mayúsculas.
4. Proyectos como **lista con miniatura de 160×100** y metadatos en línea (cliente, año, rol, stack), no como rejilla de tarjetas idénticas.
5. Badges de época solo donde aportan información: "nuevo" (proyecto de 2026), créditos de equipo (lmilo y jdicans sin enlace, Fase 4) y botones 88×31 en el pie ("Hecho con Next.js", "Valid HTML") como guiño, en una sola línea.
6. Enlaces azules subrayados, con visitados en violeta (sí, en serio: es lo que más "2000s" se siente y además es accesible).
7. Un único momento de movimiento: al cargar, la "hoja" aparece con un fundido de 200 ms. Nada más se anima solo. El hover cambia el color, sin desplazamientos.

### Qué evitar (para no parecer plantilla)
- Tarjetas con radio de 16-28px, sombras `rgba(0,0,0,.1)` y `translateY` al pasar el ratón.
- Eyebrows mono en mayúsculas, numeración "· 01" que no es una secuencia, "TL;DR", flechas → en cada CTA, separadores " · ".
- Métricas grandes genéricas ("100% hecho a la medida").
- Glass/blur, orbes, tickers, degradado violeta, texto en contorno.
- Imitar la estética Geocities chillona (GIFs de "en construcción", marquee): la dirección es "2000s **limpia**".
- Space Grotesk + DM Mono.

---

## 5. Pantalla selectora en `/`: "Bienvenida" de XP

### Referencia
La pantalla de inicio de sesión de XP: fondo azul medio, banda superior e inferior azul oscuro separadas por una línea fina con degradado naranja-blanco, logo y frase a la izquierda, divisor vertical luminoso y, a la derecha, la lista de "usuarios" con avatar cuadrado de esquinas redondeadas. Abajo a la izquierda, "Apagar el equipo" en rojo; abajo a la derecha, un texto de ayuda. **[S: colores aproximados]**

### Propuesta (ES)

```
┌──────────────────────────── banda #00309c ────────────────────────────┐
├──────────────── línea degradada naranja/blanca ───────────────────────┤
│                                     │                                 │
│   [logo EDAV]                       │  ┌──┐ Emmanuel — Escritorio XP  │
│   Emmanuel Dávila                   │  │🖥│ Ventanas, Explorer, música │
│   Desarrollador web Full Stack      │  └──┘ "Recomendado en PC"       │
│                                     │                                 │
│   Para comenzar, elige cómo         │  ┌──┐ Emmanuel — Web clásica    │
│   quieres ver el portafolio.        │  │📄│ Lectura rápida y scroll    │
│                                     │  └──┘ "Recomendado en móvil"    │
│                                     │                                 │
├──────────────── línea degradada ──────────────────────────────────────┤
│ [⏻ Solo el CV]     Descargar CV · LinkedIn · Correo     [ES | EN]     │
└──────────────────────────── banda #00309c ────────────────────────────┘
```

- **Fondo:** `#5a7edc` con un leve viñeteado radial a la izquierda; bandas `#00309c` de 64-80px.
- **Tipografía:** `--font-display` en blanco; el nombre de cada "usuario" a 20px y la descripción a 13px en `#d6e4ff`.
- **Interacción:**
  - pasar el ratón o enfocar un "usuario" ilumina el avatar (borde amarillo `#ffcc33`, como en XP);
  - clic o Enter fija la cookie `edav-theme=os|classic` (1 año), arranca un "Bienvenido" de 1 s solo para `os` y navega;
  - las teclas ↑/↓ recorren los usuarios (patrón `radiogroup` o lista de botones);
  - "Recordar mi elección" va marcado por defecto, con una casilla visible.
- **"Apagar el equipo"** se convierte en el atajo honesto **"Solo quiero el CV"**, que descarga el PDF del idioma actual. Es el CTA del reclutador con prisa, al alcance de un clic.
- **Contenido rastreable:** el HTML del servidor incluye el H1 "Emmanuel Dávila — Desarrollador web Full Stack en Medellín" (puede ir visualmente en la columna izquierda), los enlaces `<a href="/os">` y `<a href="/classic">` reales (no botones con estado) y los enlaces de contacto. Funciona sin JS.
- **Móvil:** las dos columnas se apilan: logo y frase arriba, usuarios como filas táctiles de 64px y el pie con CV y contacto fijo abajo. Ocupa una sola pantalla.
- **Vuelta atrás:** "Cerrar sesión" en el menú Inicio de `/os` y "Cambiar experiencia" en el pie de `/classic` llevan a `/` y borran la cookie (o abren `/?elegir=1`).
- **Proxy** (`proxy.ts`, `matcher: '/'`): si la cookie existe y no hay `?elegir=1`, redirige con 307 a `/os` o `/classic`. Los bots sin cookie ven el selector con contenido; el canonical de la home apunta a `/classic` [S: decisión SEO de Fase 7].

---

## 6. Priorización

| ID | Sev. | Fase | Esf. | Tema |
|---|---|---|---|---|
| UX-01 | crítico | 5 | M | `/` sin contenido indexable; elección no recordada |
| UI-01 | importante | 4 | L | El SO es Win98, no XP Luna |
| UX-02 | importante | 5 | S | CV, correo y LinkedIn no enlazados en ninguna UI |
| UI-02 | importante | 3/5 | M | Temas por `body:has()`; sin `data-theme` ni layouts por ruta |
| UI-03 | importante | 5 | M | La vista "normal" es plantilla SaaS, no Y2K |
| UI-04 | importante | 4 | S | Iconos sobre ventanas; z sin límite |
| UI-05 | importante | 4 | S | Rejilla móvil de iconos rota |
| UI-06 | importante | 6 | M | Asistente y notificación solapados, tapan contenido |
| UX-03 | importante | 5 | S | 3 pasos y ~5 s hasta el escritorio |
| UX-04 | importante | 4 | M | Abrir un proyecto saca del SO |
| UX-05 | importante | 4 | M | Modelo móvil "XP Pocket" |
| UX-08 | importante | 4/7 | M | Menús y ventanas sin semántica ni gestión de foco |
| UI-07 | menor | 4 | M | Controles falsos |
| UI-08 | menor | 3/7 | S | `@import` de Google Fonts; fuentes ausentes en móvil |
| UI-09 | menor | 4 | S | CRT activado por defecto |
| UI-10 | menor | 4 | M | Iconos genéricos de trazo |
| UI-11 | menor | 4 | S | Logo de 4 cuadros con forma de marca registrada |
| UI-12 | menor | 3 | S | CSS y keyframes muertos |
| UI-13 | menor | 4 | S | Un AudioContext por pitido; sonidos propios |
| UX-06 | menor | 5 | S | Botón flotante solapa el hero móvil |
| UX-07 | menor | 3 | S | Cifras hardcodeadas e inconsistentes |
| UX-09 | menor | 5 | S | La marca de la cabecera no dice el nombre |
| UX-10 | menor | 3 | S | Mezcla ES/EN en el SO |
| UX-11 | menor | 4 | S | Descubribilidad (CV, sugerencias, doble clic) |

Inventario de tokens: 264 hex únicos, 103 rgba únicos, 21 radios, 52 sombras, 22 z-index y 9 pilas tipográficas, frente a una propuesta de unos 12 radios/sombras/capas y unos 25 colores semánticos por tema.
