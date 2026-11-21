# Fase 1 · Auditoría de ACCESIBILIDAD (WCAG 2.2 AA) y RENDIMIENTO

Rama auditada: `fase/1-auditoria` (commit `51c8f55`). Solo lectura.
Alcance: `app/`, `components/`, `data/`, `content/` (solo `alt`), `public/`, `next.config.ts`, `Dockerfile`, build de producción.

> **Nota de proceso (verificado):** `npm run build` **sí modifica un archivo versionado**: reescribe `next-env.d.ts` (cambia `./.next/dev/types/...` por `./.next/types/...`). Lo restauré de inmediato con `git checkout -- next-env.d.ts`; el árbol quedó limpio (`git status --porcelain` vacío). Recomendación (Fase 2, S): o se ignora el archivo en git (Next lo regenera) o se acepta que `dev` y `build` lo alternen, y se documenta. Agentes futuros: tras un build, restaurar `next-env.d.ts`.

Leyenda: **[V]** = verificado leyendo código/artefactos o midiendo · **[S]** = suposición razonable no verificada en navegador (no hubo prueba con lector de pantalla ni Lighthouse en esta fase).

---

## 1. Resumen ejecutivo

1. **Home sin contenido en el HTML del servidor y JS sobredimensionado.** `/` es un único componente cliente con estado inicial `"choice"`: el HTML prerenderizado solo trae el selector; la vista web y el escritorio llegan después por JS. Además, `framer-motion` (~40 KB gz) entra en **todas** las rutas porque `app/not-found.tsx` importa `RetroClippy`.
2. **Imágenes sin optimizar:** 13 PNG de proyecto de 470–760 KB (≈7,4 MB en total) se sirven tal cual (`images.unoptimized: true`), incluso en miniaturas de 120 px. La hoja de sprites del asistente pesa **2,28 MB**.
3. **Escritorio sin semántica de ventanas ni gestión de foco:** las ventanas son `<section aria-label>`, abrirlas no mueve el foco y cerrarlas no lo devuelve. El menú Inicio no tiene `aria-expanded` ni Escape, y el menú contextual solo funciona con el ratón. El orden de tabulación no sigue el z-index.
4. **El indicador de foco y los bordes de formulario no alcanzan 3:1.** El foco rosa da 2,44:1 sobre el fondo claro. El foco punteado del escritorio da 1,39:1 sobre botones azules. Los bordes de `input` dan 1,46:1.
5. **Live regions problemáticas:** la BIOS (`role="status"`) se actualiza cada 45 ms. La notificación y el globo del asistente se montan y desmontan junto con su live region, así que pueden no anunciarse o hacerlo de más.

Puntos positivos [V]: `skip-link` en ambas vistas, `prefers-reduced-motion` cubierto en CSS global, escritorio, CRT (se oculta) y boot (se acorta), labels reales en el formulario, `autocomplete`, iconos SVG con `aria-hidden`, botones de ventana con `aria-label` que incluye el nombre de la app, redimensionado de ventana operable con flechas, asistente ocultable, audio solo tras un gesto del usuario.

---

## 2. Mediciones

### 2.1 Build de producción (Next 16.4.6, Turbopack) [V]
Next 16 ya no imprime el "First Load JS" por ruta. Lo calculé sumando los `<script src>` de cada HTML prerenderizado en `.next/server/app/*.html` (gzip -9). El chunk `0cz1d0mv5g_q7.js` (39,4 KB gz) es de polyfills `core-js` con `noModule`: **los navegadores modernos no lo descargan** y por eso se resta.

| Ruta | JS inicial gz (moderno) | HTML gz |
|---|---|---|
| `/` | **≈208 KB** | 4,6 KB |
| `/ahora` | ≈188 KB | 5,1 KB |
| `/contacto` | ≈185 KB | 5,0 KB |
| `/proyectos`, `/servicios`, `/sobre-mi`, `/proyectos/[slug]`, 404 | ≈184 KB | 4–7,5 KB |

Chunks relevantes (raw / gz):
| Chunk | raw | gz | Contenido identificado |
|---|---|---|---|
| `092r-…js` | 229 KB | 71,5 KB | react-dom + runtime del App Router |
| `0w_…js` | 170 KB | 46,3 KB | runtime del App Router |
| `2snai…js` | 122 KB | **39,6 KB** | **framer-motion + RetroClippy**: presente en TODAS las rutas |
| `0cz…js` | 113 KB | 39,4 KB | polyfills nomodule (no cuenta en modernos) |
| `10de…js` | 64 KB | 19,3 KB | selector + DesktopShell + StandardHome (solo `/`) |
| `1_5i…js` | 15 KB | 4,1 KB | `Header` (cliente) |
| CSS único `3gl4…css` | 70,8 KB | **16,6 KB** | `globals.css` + `desktop.css`, bloqueante en todas las rutas |

Mínimo de framework (sin framer ni componentes propios): ≈145 KB gz. Sobre esa base se construyen los presupuestos de §7.

### 2.2 Imágenes en `public/` [V]
| Archivo | Peso | Dimensiones | Observación |
|---|---|---|---|
| `images/edav-clippy-sprites.png` | **2 277 788 B (2,28 MB)** | 1536×1024 RGBA | se pinta a 960×640 (`background-size`), así que el 61 % de los píxeles sobra |
| `projects/green-holds-mexico.png` | 759 643 B | 1200×630 | PNG truecolor para captura web |
| `projects/zona-work.png` | 710 926 B | 1200×630 | |
| `projects/the-brant.png` | 690 685 B | 1200×630 | |
| `projects/cia-sur.png` | 689 541 B | 1200×630 | |
| `projects/anomaly-studio.png` | 665 524 B | 1200×630 | |
| `projects/erth-wellness.png` | 629 068 B | 1200×630 | |
| `projects/green-holds-shopify.png` | 616 092 B | 1910×1062 | más grande de lo que se muestra |
| `projects/big-vapers-company.png` | 590 066 B | 1200×630 | |
| `projects/green-holds.png` | 570 207 B | 1200×630 | |
| `projects/biogenesis-peptides.png` | 506 593 B | 1200×630 | |
| `projects/tech-byte.png` | 487 245 B | 1200×630 | |
| `projects/vape-friends.png` | 473 575 B | 1200×630 | |
| `projects/civicoin.jpg` | 88 815 B | 2560×1440 | JPG bien comprimido pero sobredimensionado |
| `testimonials/vape-friends.png` | 70 076 B | 300×300 | se muestra a 52×52 |
| `testimonials/green-holds.png` | 16 083 B | 301×301 | |
| `testimonials/pinceladas.png` | 8 704 B | 180×180 | |

Total de proyectos: ≈7,48 MB. [S] Convertidas a AVIF/WebP de 1200 px con calidad 70–75, cada captura quedaría en 60–120 KB (reducción de ~85–90 %), y a 640 px en 25–50 KB.

### 2.3 Contraste (pares reales del CSS) [V]
Calculado con la fórmula de luminancia relativa de WCAG. Con fondos en degradado se evalúa el tramo peor que queda detrás del texto.

| Par (archivo) | Ratio | Uso | Resultado |
|---|---|---|---|
| `--ink #10214f` / `--paper #f7fbff` (globals.css:4,10) | 14,93 | texto base | ✅ |
| `--muted #54658b` / paper | 5,59 | texto secundario | ✅ |
| `--blue #2257e7` / paper | 5,63 | `.eyebrow` (0,72 rem), `.text-link` | ✅ (justo; tamaño pequeño) |
| blanco / `#4c7fff` (tope del degradado de `.button`, globals.css:71) | 3,63 | texto de botón | ⚠️ el texto se centra sobre ~#2257e7 (5,86 ✅); vigilar si cambia el degradado |
| footer `#c8d7fb` / `#0a205e` | 10,55 | ✅ |
| selector `#7186af` / panel `#050d23` (desktop.css:46) | 5,27 | 10 px | ✅ contraste, ⚠️ tamaño mínimo |
| selector `#b8c7e5` / hover `#244f9e` | 4,59 | 12 px | ✅ justo |
| Música `#7891b7` / `#07183b` (globals.css:196) | 5,43 | **0,58 rem ≈ 9,3 px; 0,52 rem ≈ 8,3 px en móvil** | ✅ contraste, ⚠️ legibilidad |
| Etiqueta de icono de escritorio: blanco / wallpaper `#1596b4` (desktop.css:71) | **3,47** | texto de 12 px | ❌ 1.4.3 (la sombra de texto ayuda, pero no computa) |
| Ídem sobre el "sol" `#ffed81` del wallpaper | **1,19** | según posición | ❌ |
| Barra de título activa: blanco / `#6ab6f0` (extremo derecho) | 2,20 | el título está a la izquierda, sobre `#001777`–`#0a67d2` (≥5,41) | ✅ en la práctica |
| Título inactivo `#e9e9e9` / `#5f6880`…`#9298a6` | 4,58 … 2,38 | títulos largos llegan a la zona clara | ⚠️ |
| Explorer, panel lateral: blanco / `#75aaf6` (desktop.css:136, parte baja) | **2,38** | el bloque "SELECCIONADO" queda abajo | ❌ |
| Menú Inicio `small #555` / `#c0c0c0` | 4,10 | 11–12 px | ❌ (necesita 4,5) |
| Marca del menú Inicio `#b1ceff` / `#0b65c1` | 3,60 | 16 px | ❌ (texto normal) |
| Terminal `#56ff91` / `#000` | 16,11 | ✅ |
| Globo del asistente `#000` / `#ffffcc` | 20,43 | ✅ |
| Formulario: éxito / error | 6,07 / 6,48 | ✅ |
| **No textual** foco rosa `#ff6dc8` / paper (globals.css:30) | **2,44** | indicador de foco en toda la vista web | ❌ 1.4.11 |
| **No textual** foco `#050505` punteado / `#001b78` (botón primario o archivo seleccionado) | **1,39** | desktop.css:52 | ❌ |
| **No textual** foco `#050505` / `#000080` (etiqueta de icono en focus) | **1,27** | desktop.css:70 | ❌ |
| **No textual** borde de `input` (rgba azul .25 sobre blanco) | **1,46** | globals.css:287 | ❌ 1.4.11 |
| **No textual** anillo de foco del input (rgba .12) | 1,19 | globals.css:288, con `outline:none` | ❌ (solo el borde de 1 px cambia a azul) |

---

## 3. Hallazgos de accesibilidad

### A11Y-01 · Ventanas sin patrón de diálogo ni gestión de foco
- **Severidad:** importante
- **Evidencia:** `components/desktop/desktop-shell.tsx:234` (ventana = `<section aria-label>`), `:217` (`openApp` no mueve el foco), `:235` (cerrar y minimizar no devuelven el foco), `:234` (las ventanas se pintan en el orden del array, no por z-index). [V]
- **Impacto:** quien usa teclado o lector de pantalla abre "Proyectos" y el foco se queda en el icono. Al cerrar la ventana, el foco cae en `<body>` (2.4.3 Orden del foco). Las ventanas inactivas siguen en la tabulación con un orden arbitrario.
- **Fix:** aplicar el patrón de §5.1: `role="dialog"`, `aria-modal="false"` y `aria-labelledby` hacia el título; foco al abrir; foco de vuelta al invocador al cerrar y al botón de la barra de tareas al minimizar; en móvil (<769 px), modal con `inert` en el resto.
- **Fase:** 4 · **Esfuerzo:** M

### A11Y-02 · Menú Inicio y menú contextual inaccesibles por teclado
- **Severidad:** importante
- **Evidencia:** `desktop-shell.tsx:242` (botón Inicio sin `aria-expanded`, `aria-haspopup` ni `aria-controls`), `:241` (sin Escape, sin foco inicial, sin roles), `:227,:240` (menú contextual solo con `onContextMenu`; sin tecla Menú ni Shift+F10). [V]
- **Impacto:** el teclado no puede cerrar el menú Inicio con Escape (2.1.1). El estado abierto/cerrado no se anuncia (4.1.2). Las acciones del menú contextual (CRT, Actualizar) solo están en el ratón; CRT también está en la bandeja, así que el impacto es parcial.
- **Fix:** patrón de §5.2 y §5.4.
- **Fase:** 4 · **Esfuerzo:** M

### A11Y-03 · Foco no visible o con contraste insuficiente
- **Severidad:** importante
- **Evidencia:** `app/globals.css:30` (rosa, 2,44:1), `app/desktop.css:52` (punteado negro de 2 px y `outline-offset:-4px`: 1,39:1 sobre navy), `app/globals.css:288` (`outline:none` en campos). [V]
- **Impacto:** 2.4.7 Foco visible y 1.4.11 Contraste no textual. El foco se pierde en los botones primarios del escritorio y en los campos del formulario.
- **Fix:** crear un token `--focus-ring` de doble anillo, por ejemplo `outline: 2px solid #001b78; box-shadow: 0 0 0 4px #fff` (o el inverso en fondos oscuros), que garantiza ≥3:1 sobre cualquier fondo. En el escritorio, foco Win98 con punteado blanco y negro alterno (`outline: 1px dotted #fff` + `box-shadow: 0 0 0 1px #000`). Quitar el `outline:none` de los campos y usar `:focus-visible` con 2 px de `--blue-dark`.
- **Fase:** 3 (tokens) y 4 · **Esfuerzo:** S

### A11Y-04 · Bordes de campos con contraste 1,46:1
- **Severidad:** importante
- **Evidencia:** `app/globals.css:287`. [V]
- **Impacto:** 1.4.11: personas con baja visión no ven dónde está el campo.
- **Fix:** borde sólido con ≥3:1, por ejemplo `#6b7fae` (≈4,2:1 sobre blanco, a recalcular al definir tokens).
- **Fase:** 3 · **Esfuerzo:** S

### A11Y-05 · BIOS con live region que cambia cada 45 ms
- **Severidad:** importante
- **Evidencia:** `desktop-shell.tsx:131` (`role="status" aria-live="polite"` envuelve el contador "Memory Test" que `setProgress` actualiza cada 45 ms, `:104`). [V] El efecto real en NVDA/VoiceOver es [S].
- **Impacto:** el lector puede encolar decenas de anuncios ("Memory Test 03449K…") y tapar lo importante (1.3.1, 4.1.3). Además, `aria-label` sobre un `div` sin rol (`:129`) se ignora.
- **Fix:** quitar la live region del bloque animado (`aria-hidden="true"` en el contador) y usar una live region aparte, siempre montada, con 1–2 mensajes: "Iniciando EDAV Desktop…" y "Escritorio listo". Dar `role="dialog" aria-modal="true"` y nombre accesible a la pantalla de boot.
- **Fase:** 4 · **Esfuerzo:** S

### A11Y-06 · Contenido tabulable detrás del boot y del selector
- **Severidad:** importante
- **Evidencia:** `desktop-shell.tsx:228-242` (el escritorio se renderiza debajo de `BootScreen` y queda tabulable). `portfolio-experience.tsx:49-55` (al elegir vista se desmonta el botón enfocado y el foco cae en `body`). [V]
- **Impacto:** 2.4.11 Foco no oculto (el foco puede ir a iconos tapados por el boot) y 2.4.3.
- **Fix:** `inert` en el contenedor del escritorio mientras `booting`. Tras elegir vista, mover el foco al `h1` o `main` de la nueva vista (`tabIndex={-1}` + `focus()`). Con el selector de la Fase 5 en una ruta propia, la navegación nativa lo resuelve.
- **Fase:** 4 y 5 · **Esfuerzo:** S

### A11Y-07 · Notificaciones y globo del asistente montados junto con su live region
- **Severidad:** menor/importante
- **Evidencia:** `desktop-shell.tsx:239` (`{notification && <div role="status">}`, autodescartada a los 5,5 s, `:208`). `RetroClippy.tsx:65` (`{bubbleVisible && <div role="status" aria-live="polite">}` que se vuelve a montar en cada cambio de estado, `:44-49`). [V]
- **Impacto:** en varios lectores, una live region que se inserta ya con contenido no se anuncia [S]. Cuando sí se anuncia, el asistente y la notificación compiten. La notificación desaparece en 5,5 s (2.2.1 si su contenido importara; hoy es informativo).
- **Fix:** un único `<Announcer>` global siempre montado (`aria-live="polite"`, visualmente oculto) con cola y deduplicación. Las notificaciones visuales sin rol se pausan con hover/foco. Ver §6 para el asistente.
- **Fase:** 4 y 6 · **Esfuerzo:** S

### A11Y-08 · `lang` fijo en `es` y fragmentos en inglés sin marcar
- **Severidad:** importante (con i18n)
- **Evidencia:** `app/layout.tsx:30` (`<html lang="es">` fijo). Texto en inglés sin `lang="en"`: `portfolio-experience.tsx:13` ("PORTFOLIO EXPERIENCE SELECTOR"), `desktop-shell.tsx:132-137` (BIOS), `:168` ("WELCOME TO MY PERSONAL COMPUTER"), `music-widget.tsx:45` ("Powered by Last.fm"), `RetroClippy`, etc. [V]
- **Impacto:** 3.1.1 al servir EN con `lang="es"`. 3.1.2 Idioma de las partes: el lector lee el inglés con fonética española.
- **Fix:** ver §8. Rutas bajo `app/[lang]/` con root layout por idioma (guía `node_modules/next/dist/docs/01-app/02-guides/internationalization.md`). Mientras tanto, `lang="en"` en cada fragmento en inglés. El tipo `L<T>` puede emitir `{ text, lang }` para que los componentes lo apliquen.
- **Fase:** 3 · **Esfuerzo:** M

### A11Y-09 · Movimiento automático sin mecanismo de pausa
- **Severidad:** menor
- **Evidencia:** `globals.css:111` (`.ticker`, 35 s infinito, contiene la lista de tecnologías), `:186` (espectro de música infinito), `desktop.css` `.os-wallpaper-ring` (`os-float` infinito). [V]
- **Impacto:** 2.2.2: el ticker muestra información en movimiento durante más de 5 s. `prefers-reduced-motion` lo cubre solo para quien activó esa preferencia (`globals.css:372`, bien hecho).
- **Fix:** pausar con `:hover` / `:focus-within` y añadir un botón "Pausar animaciones" (preferencia global guardada que pone `data-motion="off"` en `<html>`), o dejar el ticker estático con desplazamiento manual.
- **Fase:** 7 · **Esfuerzo:** S

### A11Y-10 · Formulario de contacto: errores y requisitos poco comunicados
- **Severidad:** menor
- **Evidencia:** `components/contact-form.tsx:31` (`noValidate` + `reportValidity()`: solo burbujas nativas efímeras), `:33-37` (no hay marca visual de obligatorio, `minLength 20` no se anuncia, falta `aria-invalid`/`aria-describedby`), `:40` (el error del servidor usa `role="status"`). [V]
- **Impacto:** 3.3.1 / 3.3.2: la persona no sabe de antemano que el mensaje necesita 20 caracteres ni qué campos son obligatorios. El error del servidor se anuncia con baja prioridad.
- **Fix:** texto "(obligatorio)" o `*` con leyenda, ayuda persistente con `aria-describedby` ("Mínimo 20 caracteres"). En el submit, validación propia con `aria-invalid`, mensaje bajo el campo y foco al primer error. `role="alert"` solo para el error y `status` para el éxito. El honeypot ya está bien (`tabIndex -1`, `aria-hidden`, fuera de pantalla).
- **Fase:** 4 o 7 · **Esfuerzo:** S

### A11Y-11 · `aria-label` sobre elementos sin rol, controles falsos y nombres que no coinciden
- **Severidad:** menor
- **Evidencia:** [V]
  - `aria-label` en `div` genérico (se ignora o no está permitido): `desktop-shell.tsx:129` (boot), `:232` (`.os-desktop-icons`), `standard-home.tsx:21` (`.hero-visual`).
  - Botones sin nombre y sin acción: `desktop-shell.tsx:160` (`←`, `→`, `↑`, sin `type` ni `aria-label`).
  - Menú falso "Archivo / Editar / Ver / Ayuda": `:236` (texto no interactivo con primera letra subrayada; sugiere atajos que no existen).
  - 2.5.3 Etiqueta en el nombre: `components/ui.tsx:27`. El `aria-label` "Ver caso de estudio X" reemplaza el texto visible "Abrir caso de estudio" y quien usa control por voz diciendo "abrir caso de estudio" no encuentra el enlace.
  - El doble clic es la única forma de abrir desde la cuadrícula del Explorer (`:161`), aunque existe la alternativa "Abrir caso" (`:162`), que mitiga.
- **Fix:** `role="group"` o `<ul>` con nombre en vez de `div aria-label`. `aria-hidden="true"` en la tira de menú falsa, o convertirla en menú real. Botones de navegación con nombre y función, o eliminarlos. En la tarjeta, quitar el `aria-label` y dejar que el nombre salga del contenido (título + "Abrir caso de estudio"); la imagen queda con `alt` o `alt=""` si es redundante.
- **Fase:** 4 · **Esfuerzo:** S

### A11Y-12 · Tamaño de objetivo < 24×24 px (2.5.8)
- **Severidad:** menor
- **Evidencia:** `desktop.css:92` (botones de ventana 22×21 en escritorio), `:281` (cerrar globo 18×18), `:285` (Ocultar asistente, alto 21 y texto de 9 px), `:229` (bandeja, alto 23 px), `:257` (cerrar notificación, sin tamaño). [V]
- **Fix:** mínimo 24×24 de área clicable (se puede ampliar con padding o un pseudo-elemento sin cambiar la estética Win98) y 44×44 en `pointer: coarse`.
- **Fase:** 4 · **Esfuerzo:** S

### A11Y-13 · Contraste de texto en el escritorio
- **Severidad:** menor
- **Evidencia:** tabla §2.3: etiquetas de iconos (3,47 y 1,19), `small` del menú Inicio (4,10), marca vertical (3,60), panel del Explorer (2,38), título inactivo (2,38). [V]
- **Fix:** etiquetas de icono sobre una "pastilla" `rgba(0,0,40,.55)` o fondo navy fijo al estilo XP (ratio >7). `small` del menú `#3d3d3d` (≥6:1 sobre `#c0c0c0`). Degradado del Explorer hasta `#386acf` como máximo (5,08). Inactivo: degradado uniforme ≤ `#6b7385`.
- **Fase:** 3 (tokens) y 4 · **Esfuerzo:** S

### A11Y-14 · Arrastrar ventanas y asistente sin alternativa de un solo puntero (2.5.7)
- **Severidad:** menor
- **Evidencia:** `desktop-shell.tsx:219-221` (mover solo arrastrando la barra), `RetroClippy.tsx:64` (`drag` de framer). El redimensionado tiene teclado (`:237`), pero 2.5.7 pide alternativa de puntero simple. [V]
- **Fix:** el maximizar/restaurar ya existe. Añadir un "menú de sistema" en el icono de la barra de título (Mover, Tamaño, Minimizar, Maximizar, Cerrar), con "Mover" usando flechas o clics en posiciones predefinidas ("Ajustar a la izquierda/derecha"). En el asistente, un botón "Cambiar de esquina".
- **Fase:** 4 y 6 · **Esfuerzo:** M

### A11Y-15 · Contenido principal y encabezados en `/` y en el escritorio
- **Severidad:** menor
- **Evidencia:** en el escritorio, el único `h1` está en `WelcomeApp` (`desktop-shell.tsx:168`): si se cierra Welcome, la página se queda sin `h1`. `os-skip-link` apunta a `#welcome-content` y la abre (`:231`, bien resuelto). `onContextMenu` con `preventDefault` en todo el escritorio (`:227`) bloquea el menú nativo incluso dentro de `textarea` (corrector ortográfico, pegar). [V]
- **Fix:** `h1` visualmente oculto y permanente ("EDAV OS — Escritorio de Emmanuel Dávila"). Limitar el `preventDefault` del menú contextual al fondo del escritorio (`event.target === event.currentTarget` o `.os-wallpaper`).
- **Fase:** 4 · **Esfuerzo:** S

### A11Y-16 · Preferencia de vista: se guarda pero nunca se lee
- **Severidad:** menor (a11y/UX)
- **Evidencia:** `portfolio-experience.tsx:52` escribe `localStorage["edav-view"]`, pero el `useEffect` (`:41-47`) solo lee `?view=`. Quien elige la "Vista web accesible" vuelve a ver el selector en cada visita. [V]
- **Fix:** en la Fase 5, guardar la preferencia en una cookie (legible en el servidor, sin parpadeo), redirigir en `/` a `/os` o `/classic` y mostrar siempre en ambas un enlace visible "Cambiar experiencia".
- **Fase:** 5 · **Esfuerzo:** S

### A11Y-17 · El asistente puede tapar el foco (2.4.11)
- **Severidad:** menor (crecerá en la Fase 6)
- **Evidencia:** `desktop.css:266` (portal con `z-index: 2147483000`, esquina inferior derecha sobre las ventanas, globo de 268 px). Se ve en el 404 (`app/not-found.tsx:6`) y en el escritorio. [V] Que tape el formulario de contacto en una ventana es [S] y depende de la posición.
- **Fix:** ver §6. Al recibir foco un elemento tapado, apartar o colapsar el asistente (`IntersectionObserver` o una comprobación en `focusin` con `getBoundingClientRect`).
- **Fase:** 6 · **Esfuerzo:** M

---

## 4. Hallazgos de rendimiento

### PERF-01 · `/` es 100 % cliente y su HTML no tiene el contenido
- **Severidad:** crítico (rendimiento, SEO, a11y sin JS)
- **Evidencia:** `components/portfolio-experience.tsx:1,38` (`"use client"`, estado inicial `"choice"`). `grep hero-lead .next/server/app/index.html` → 0 coincidencias: el HTML de `/` solo contiene el selector. `StandardHome` y `DesktopShell` se importan en un árbol cliente y se envían en el chunk `10de…js` (19,3 KB gz). [V]
- **Impacto:** el contenido principal (hero, proyectos, servicios) no está en el HTML. El LCP de la vista web depende de JS y de un clic. Los buscadores y la gente sin JS ven solo el selector, y la vista web pierde el prerender.
- **Fix:** es el plan de la Fase 5. `/` como Server Component ligero (selector con `<a href="/os">` y `<a href="/classic">`, sin JS obligatorio). `/classic` y `/os` como rutas propias. `/classic` 100 % servidor, con islas cliente mínimas (menú móvil, formulario, música). Leer la preferencia desde cookie en `proxy.ts` o en el propio Server Component para redirigir sin parpadeo (verificar el nombre y la API de proxy/middleware en `node_modules/next/dist/docs/` antes de implementar).
- **Fase:** 5 · **Esfuerzo:** M

### PERF-02 · framer-motion + RetroClippy cargados en todas las rutas
- **Severidad:** importante
- **Evidencia:** `app/not-found.tsx:3` importa `RetroClippy` (que importa `framer-motion`, `RetroClippy.tsx:3`). El chunk `2snai78i0mdem.js` (122 KB raw / 39,6 KB gz) aparece en los `<script>` de `/sobre-mi`, `/servicios`, `/proyectos/*`, etc. [V] `framer-motion` solo se usa para `drag` (`RetroClippy.tsx:64`).
- **Impacto:** +40 KB gz (~+27 % sobre la base de ~145 KB) en cada página, sin usarse salvo en el 404.
- **Fix:** sustituir `motion.aside drag` por Pointer Events propios (~1 KB; el escritorio ya lo hace en `beginDrag`) y quitar `framer-motion` de las dependencias (Fase 2 o 6). Como mínimo, cargar el asistente con `next/dynamic` desde un wrapper cliente para que no entre en el grafo del root layout.
- **Fase:** 2 (rápido: dynamic) / 6 (reemplazo) · **Esfuerzo:** S

### PERF-03 · `images.unoptimized: true` con PNG de 470–760 KB
- **Severidad:** importante
- **Evidencia:** `next.config.ts:20`. Tabla §2.2. Con `unoptimized`, `next/image` no genera `srcset` y sirve el original. La miniatura de 120 px del Explorer (`desktop-shell.tsx:161`, `sizes="120px"`) descarga ≈7,4 MB al abrir "Mi trabajo" con 13 archivos. La portada del caso (`app/proyectos/[slug]/page.tsx:25`, `priority`) es el LCP y pesa ~600 KB. [V] El tiempo en 4G es [S] (≈1,5–3 s solo para esa imagen).
- **Impacto:** LCP alto en `/proyectos/[slug]`, consumo de datos móviles y el Explorer lento.
- **Fix (recomendado, sin coste de CPU en el servidor):** pipeline de build que genere AVIF y WebP a 480/800/1200 px desde los originales (los originales fuera de `public/` o en `private/`) y uso de `<picture>`, o un `loader` personalizado de `next/image` que apunte a esas variantes. **Alternativa:** activar el optimizador quitando `unoptimized` y configurando `images.qualities: [70, 75]` (obligatorio en Next 16, ver `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md` §qualities), `formats: ['image/avif','image/webp']`, `localPatterns`, `minimumCacheTTL` alto, y un volumen persistente en Coolify para `/app/.next/cache/images`. `sharp` está en el lockfile como opcional (`package-lock.json:5899`); que el standalone en Alpine lo incluya y funcione está **[S]**: verificar en el contenedor. Además, recortar `green-holds-shopify.png` (1910 px) y `civicoin.jpg` (2560 px) a 1200 px, y los logos de testimonios a 104 px (2× de 52).
- **Fase:** 7 (decisión ya en la 3 por el diseño de la galería) · **Esfuerzo:** M

### PERF-04 · `priority` está deprecado en Next 16 y se usa en sitios sin efecto
- **Severidad:** menor
- **Evidencia:** `components/ui.tsx:29`, `app/proyectos/[slug]/page.tsx:25`. Doc: `image.md:294` ("Starting with Next.js 16, the `priority` property has been deprecated in favor of `preload`") y `:290` (recomienda `loading="eager"` o `fetchPriority="high"`). En `StandardHome` (`standard-home.tsx:43`) `priority` se aplica a tarjetas renderizadas solo en cliente, así que el preload llega tarde. [V]
- **Fix:** `fetchPriority="high"` en la única imagen LCP de cada página y nada en las tarjetas por debajo del primer pliegue.
- **Fase:** 2 · **Esfuerzo:** S

### PERF-05 · Fuentes por `@import` de Google Fonts
- **Severidad:** importante
- **Evidencia:** `app/globals.css:1` (`@import url('https://fonts.googleapis.com/css2?family=DM+Mono…&family=Space+Grotesk…&display=swap')`). [V]
- **Impacto:** cadena bloqueante de 3 saltos (CSS propio → CSS de Google → woff2 de gstatic), con conexiones a otro origen sin `preconnect`. Envía la IP del visitante a Google (privacidad) y obliga a abrir la CSP de la Fase 2 a `fonts.googleapis.com` y `fonts.gstatic.com`. Hay 6 variantes (DM Mono 400/500, Space Grotesk 400–700); Space Grotesk es variable [S]. Riesgo de CLS por el cambio de fuente con `swap`.
- **Fix:** `next/font/google` (se autoaloja en build y no hace peticiones a Google en runtime, `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md:96`) con `subsets: ['latin']`, `display: 'swap'` y `variable: '--sans'/'--mono'`, aplicado en `<html>`. Con fallback métrico automático para reducir CLS. La vista Win98 usa Tahoma/Verdana del sistema (coste cero): mantenerlo.
- **Fase:** 3 · **Esfuerzo:** S

### PERF-06 · CSS único de 70,8 KB, bloqueante en todas las rutas
- **Severidad:** menor/importante
- **Evidencia:** `app/layout.tsx:6-7` importa `globals.css` (33,9 KB) y `desktop.css` (48,8 KB) en el root. Un único chunk de 16,6 KB gz. `desktop.css:345-360` usa `body:not(:has(.desktop-os)):not(:has(.standard-home))` para restilizar las páginas interiores: selectores costosos y acoplamiento entre vistas. [V]
- **Impacto:** `/classic` cargará el CSS del escritorio y viceversa. `:has()` en `body` obliga al navegador a reevaluar el estilo en cada mutación del DOM (coste pequeño pero real durante el arrastre).
- **Fix:** en la Fase 3, tokens en `globals.css`, y CSS de cada experiencia importado en su layout de segmento (`app/os/layout.tsx` y `app/classic/layout.tsx`) o con CSS Modules. Eliminar los selectores `body:has(...)` usando una clase en `<html>`/`<body>` desde el layout de cada segmento.
- **Fase:** 3 y 5 · **Esfuerzo:** M

### PERF-07 · Arrastrar una ventana re-renderiza todo el escritorio en cada `pointermove`
- **Severidad:** importante (INP)
- **Evidencia:** `desktop-shell.tsx:220` (`updateWindow` → `setWindows` en cada `pointermove`), `:218` (`map` sobre todas las ventanas) y `:236` (`WindowContent` no memoizado: `ProjectExplorer` con 13 `<Image>`, `MusicWidget`, formulario). El redimensionado sigue el mismo patrón (`:223`). [V] El jank medible es [S] (sin perfilar).
- **Fix:** durante el arrastre, mover con `style.transform = translate3d()` sobre un ref (sin estado de React) y confirmar `x`/`y` en `pointerup`. `React.memo` en `WindowContent` y en el marco de la ventana, con un store (`useReducer` + contexto partido o `useSyncExternalStore`) para que solo se renderice la ventana afectada. Agrupar los cambios con `requestAnimationFrame`.
- **Fase:** 4 · **Esfuerzo:** M

### PERF-08 · CRT WebGL a pantalla completa, activado por defecto y en bucle continuo
- **Severidad:** menor/importante (batería, GPU de gama baja)
- **Evidencia:** `components/desktop/crt-overlay.tsx:121-127` (`requestAnimationFrame` infinito, DPR hasta 1,5) y `desktop-shell.tsx:191` (`crt` es `true` por defecto). Respeta `reduced-motion` (bien). [V]
- **Impacto:** un canvas compuesto sobre todo el escritorio se redibuja a 60 fps solo para un parpadeo de amplitud 0,012 que casi no se ve. Cuesta batería en móvil. Aumenta el trabajo del compositor durante el arrastre.
- **Fix:** por defecto, scanlines estáticas en CSS (`repeating-linear-gradient` + `pointer-events:none`), con WebGL opcional. Si se mantiene, limitar a ~15 fps, pausar en `visibilitychange` y en `pointer: coarse` / `navigator.connection.saveData`, y renderizar a DPR 1. Cargar el componente con `next/dynamic` solo cuando se activa.
- **Fase:** 4 o 7 · **Esfuerzo:** S

### PERF-09 · Componentes cliente innecesarios o demasiado grandes
- **Severidad:** menor
- **Evidencia (inventario de `"use client"`)** [V]:
  | Componente | Por qué es cliente | Observación |
  |---|---|---|
  | `components/header.tsx` | `usePathname` + `useState` del menú | Puede ser servidor, con una isla `MenuToggle` y `aria-current` calculado en un cliente diminuto (4,1 KB gz hoy) |
  | `components/portfolio-experience.tsx` | estado de vista | Desaparece con la Fase 5 (PERF-01) |
  | `components/desktop/desktop-shell.tsx` | estado de ventanas, audio, drag | Necesario; dividir en apps cargadas con `next/dynamic` |
  | `components/desktop/RetroClippy.tsx` | portal, timers, framer | Cargarlo con dynamic y sin framer (PERF-02) |
  | `components/desktop/crt-overlay.tsx` | WebGL | dynamic opcional (PERF-08) |
  | `components/desktop/services-wizard.tsx`, `terminal-app.tsx` | estado | Cargar al abrir la ventana |
  | `components/contact-form.tsx` | fetch y estado | Correcto; podría usar Server Action + `useActionState` [S: verificar en la doc de Next 16] |
  | `components/music-widget.tsx` | fetch en `useEffect` | Podría pedir los datos en el servidor con `revalidate` corto y streaming con `Suspense`, para no mostrar el estado "cargando" (verificar las APIs de cache de Next 16 en la doc) |
  | `standard-home.tsx` (sin directiva) | se vuelve cliente al importarse desde `portfolio-experience` | En `/classic` debe ser Server Component |
- **Fase:** 4 y 5 · **Esfuerzo:** M

### PERF-10 · Animación de entrada `page-transition` desde `opacity:0`
- **Severidad:** menor
- **Evidencia:** `app/template.tsx:2` + `globals.css:44` (`page-in .45s`, `from { opacity:0 }`). [V]
- **Impacto:** [S] retrasa el LCP percibido hasta ~450 ms en cada navegación y en la carga inicial (el elemento LCP empieza invisible).
- **Fix:** animar solo `transform` o empezar desde `opacity: .01`. Mejor aún, usar View Transitions del navegador si la versión de Next las soporta (consultar la doc) y no animar en la carga inicial.
- **Fase:** 7 · **Esfuerzo:** S

### PERF-11 · Caché de los assets de `public/`
- **Severidad:** menor
- **Evidencia:** las imágenes y sprites de `public/` no llevan hash. [S] Next sirve `public/` con `Cache-Control: public, max-age=0` por defecto (verificar con `curl -I` en el contenedor). Los de `/_next/static` son `immutable`.
- **Fix:** importar sprites e imágenes de forma estática (`import sprite from './clippy.webp'`) para que acaben en `/_next/static/media/<hash>` con caché inmutable, o añadir en `headers()` una regla `Cache-Control: public, max-age=31536000, immutable` para `/images/:path*` con nombres versionados.
- **Fase:** 7 · **Esfuerzo:** S

---

## 5. Patrones ARIA propuestos para la Fase 4 (SO con ventanas)

Principio rector: **cada acción del ratón tiene un equivalente de teclado y de puntero simple; el estado de ventanas y menús se anuncia; el foco nunca se pierde.** Basado en los patrones WAI-ARIA APG (Dialog, Menu Button, Toolbar).

### 5.1 Ventana
```tsx
<div role="dialog" aria-modal={isMobile} aria-labelledby={`win-${id}-title`}
     data-state={active ? "active" : "inactive"} tabIndex={-1} ref={windowRef}>
  <div className="titlebar">
    <button aria-haspopup="menu" aria-label={`Menú de ventana de ${title}`}>{icon}</button> {/* menú de sistema: Mover, Tamaño, Min, Max, Cerrar */}
    <h2 id={`win-${id}-title`}>{title}</h2>
    <button aria-label={`Minimizar ${title}`}/> <button aria-label={`Maximizar ${title}`} aria-pressed={maximized}/> <button aria-label={`Cerrar ${title}`}/>
  </div>
  <div className="content">…</div>
</div>
```
- **Abrir:** foco al primer control de la app o al contenedor (`tabIndex=-1`). Anunciar "Ventana Proyectos abierta" por el `Announcer`.
- **Cerrar:** foco de vuelta al invocador (guardar `document.activeElement` al abrir) o, si ya no existe, a la siguiente ventana por z-index o al escritorio.
- **Minimizar:** foco al botón de la ventana en la barra de tareas.
- **Activar al recibir foco:** `onFocus` (capturing) en la ventana ejecuta `focus(id)`, así Tab y clic quedan sincronizados con el z-index.
- **Orden de tabulación:** no se reordena el DOM (mover nodos con foco dentro lo rompe). La navegación entre ventanas se hace con la barra de tareas y un atajo (5.5). Dentro de una ventana, el Tab es natural.
- **Móvil (<769 px):** la ventana ocupa la pantalla, así que `aria-modal="true"`, `inert` en el escritorio y la barra, y "Atrás"/Escape la cierra o minimiza.
- **Deep link `/proyectos/[slug]`:** abrir el SO con esa ventana activa y el foco en su `h2`. `document.title` con el título del proyecto.
- **No** usar `role="application"` en el escritorio: anula los comandos de lectura del lector de pantalla.

### 5.2 Menú Inicio (Menu Button)
- Botón: `aria-haspopup="menu" aria-expanded aria-controls="start-menu"`, texto visible "Inicio".
- Panel: `role="menu"` con `aria-label="Menú Inicio"`. Apps como `role="menuitem"`. Grupos (`role="group"` + `aria-label`) para "Programas" y "Sistema". Sonido y CRT como `menuitemcheckbox` con `aria-checked`.
- Teclado: Enter/Espacio/↓ abre y enfoca el primer ítem; ↑ abre y enfoca el último; ↑/↓ recorren; Home/End; búsqueda por primera letra; Escape cierra y devuelve el foco a Inicio; Tab cierra y continúa. Roving `tabindex`.
- Alternativa más simple si el esfuerzo apremia: patrón **Disclosure** (`aria-expanded` + lista de botones normales), con Escape y foco inicial. Menos "fiel" pero robusto.

### 5.3 Barra de tareas
- Contenedor `role="toolbar"` con `aria-label="Barra de tareas"` (no `<nav>`: son acciones, no navegación), roving tabindex con ←/→ y una sola parada de Tab. O tres grupos separados: Inicio, ventanas abiertas y bandeja.
- Botón de ventana: nombre con el estado ("Proyectos, minimizada"), `aria-pressed={activa}` y `aria-controls={windowId}`.
- Bandeja: CRT y Sonido con `aria-pressed`, nombre fijo ("Efecto CRT", "Sonido") para que el estado no cambie el nombre. `<time dateTime={iso}>` con `aria-label` de la hora completa. Botón "Vista clásica" en vez de "WEB".
- Iconos del escritorio: `<ul role="list" aria-label="Escritorio">` con botones (un clic abre, como hoy; el doble clic queda como extra). Flechas opcionales en cuadrícula.

### 5.4 Menú contextual
- Abrir también con la tecla Menú (`ContextMenu`) y Shift+F10 sobre el escritorio enfocado. `role="menu"` con el mismo teclado que 5.2. Escape cierra. Solo en el fondo del escritorio (A11Y-15).

### 5.5 Atajos de teclado (2.1.4: siempre con modificador y desactivables)
| Acción | Atajo propuesto | Notas |
|---|---|---|
| Cerrar menú, globo o contextual | `Esc` | No cierra ventanas en escritorio, para no perder datos del formulario; en móvil sí |
| Cambiar de ventana | `Alt+Shift+↑/↓` o la barra de tareas | Evitar `Ctrl+Tab`, `Ctrl+W`, `Alt+F4` y `Alt+Tab` (reservados por el navegador o el SO) |
| Ir a la barra de tareas / escritorio | `Alt+Shift+T` / `Alt+Shift+D` | [S] Comprobar que no chocan con NVDA, JAWS o VoiceOver (VO usa Ctrl+Opt) |
| Abrir Inicio | `Alt+Shift+S` | `Meta` no se puede capturar de forma fiable |
| Mover ventana enfocada | Menú de sistema → "Mover" y luego flechas (Shift = 50 px) y Enter/Esc | Como Alt+Espacio en Windows, sin secuestrar teclas globales |
| Redimensionar | Ya existe con flechas en el tirador (`desktop-shell.tsx:237`) | Añadir anuncio del tamaño |
| Ayuda de atajos | Ventana "Ayuda → Atajos" y `?` solo con foco en el escritorio | Opción "Desactivar atajos" guardada |

---

## 6. Mascota (Fase 6): requisitos de accesibilidad

1. **Opcional y descartable:** selector "Asistente: Ninguno / Clippy / Rover / …" con "Ninguno" válido y recordado (localStorage o cookie). Botón "Ocultar" siempre visible ≥24×24 (hoy hay 21 px y 9 pt, `desktop.css:285`). Escape cierra el globo.
2. **No bloquear contenido:** el contenedor `pointer-events:none` ya está bien (`desktop.css:266`). Además, ceder la posición cuando el foco va a un elemento tapado (A11Y-17), no superar el 25 % del viewport en móvil y no aparecer en pantallas de lectura largas (casos en `/classic`) salvo que se invoque.
3. **Anuncios moderados:**
   - Solo por el `Announcer` global, nunca con una live region propia que se monta y desmonta.
   - Solo anunciar mensajes **provocados por la persona** (buscó, abrió ventana, envió formulario). Los comentarios espontáneos, idle y animaciones van **sin anuncio**.
   - Límite de un anuncio cada ≥10 s, deduplicado.
   - Opción "Silenciar asistente para lectores de pantalla" (`aria-live="off"` en su canal).
4. **Globo:** `role="dialog"` no modal con `aria-labelledby` si contiene acciones (botones), o `role="note"` si es solo texto. No robar el foco al aparecer: la persona llega con Tab o con un atajo ("Alt+Shift+A: ir al asistente").
5. **Búsqueda tipo Rover:** `role="search"` con `<label>`, resultados como lista con `aria-live="polite"` solo para el recuento ("5 resultados").
6. **Movimiento:** con `prefers-reduced-motion`, un fotograma estático por estado, sin entrada animada ni idle loops (hoy el CSS ya anula la animación, `desktop.css:488`). Ninguna animación debe parpadear más de 3 veces por segundo (2.3.1): revisar los sprites originales de "GetAttention" y "Alert".
7. **Personaje:** `role="img"` con `aria-label="Clippy, asistente"` en el sprite. El botón de arrastre no debe nombrarse "Arrastrar…" si el clic muestra la ayuda: mejor "Asistente Clippy: mostrar ayuda".
8. **Sonido:** los sonidos de los agentes, apagados por defecto y ligados al toggle de sonido global.

---

## 7. Presupuesto de rendimiento propuesto

Métricas p75 en móvil (Moto G Power / 4G lenta en Lighthouse) y escritorio. JS y CSS en **KB gzip transferidos en la primera carga en navegador moderno** (sin `nomodule`). Base actual del framework ≈145 KB.

| Métrica | `/` (selector) | `/classic` (y páginas de contenido) | `/os` |
|---|---|---|---|
| JS inicial | **≤ 155 KB** (casi sin JS propio; enlaces normales) | **≤ 165 KB** (islas: menú, formulario, música) | **≤ 215 KB** (shell + barra + iconos). Cada app de ventana en un chunk diferido **≤ 25 KB**. Mascota diferida **≤ 15 KB JS** |
| CSS bloqueante | ≤ 8 KB | ≤ 14 KB | ≤ 16 KB |
| HTML | ≤ 10 KB | ≤ 20 KB | ≤ 15 KB |
| Fuentes | ≤ 2 archivos woff2, ≤ 70 KB, autoalojadas | ídem | 0 (fuentes del sistema estilo Win98) + mono si hace falta |
| Imagen LCP | ninguna (texto) | ≤ 120 KB (AVIF/WebP, ancho según `sizes`) | ninguna (el LCP es el texto del boot o la ventana de bienvenida) |
| Peso total inicial | ≤ 250 KB | ≤ 600 KB | ≤ 700 KB **sin** mascota |
| LCP | ≤ 1,8 s | ≤ 2,5 s | ≤ 2,5 s |
| CLS | ≤ 0,02 | ≤ 0,05 | ≤ 0,05 |
| INP | ≤ 100 ms | ≤ 200 ms | ≤ 200 ms; arrastre sin long tasks > 50 ms y 60 fps en un portátil medio |
| TBT (lab) | ≤ 100 ms | ≤ 150 ms | ≤ 250 ms |

**Cómo hacerlo cumplir (Fase 7):** un script de Node sin dependencias nuevas que, tras `next build`, repita la medición de §2.1 (suma de los `<script>` por HTML prerenderizado, con gzip) y falle si se supera el presupuesto. Lighthouse CI opcional contra el contenedor local. Recordar restaurar `next-env.d.ts` tras el build en CI o aceptarlo en git.

---

## 8. Estrategia de `lang` ES/EN (Fase 3)

1. Rutas: ES sin prefijo (conserva las URLs publicadas) y EN bajo `/en/...`. Internamente, `app/[lang]/…` con `generateStaticParams` para `['es','en']` y el root layout en `app/[lang]/layout.tsx`, que renderiza `<html lang={lang}>` (patrón de la guía `01-app/02-guides/internationalization.md:74-96`; la doc también enlaza `next-root-params`, revisar su API antes de usarla). Reescribir `/x` → `/es/x` en `proxy`/middleware: verificar el nombre del archivo en la doc de Next 16 antes de implementar.
2. `L<T>` puede producir texto y su idioma. Cuando falte la traducción y se caiga al otro idioma, envolver con `<span lang="es">` dentro de la página EN (3.1.2).
3. Términos de marca en inglés dentro de páginas ES ("WELCOME TO MY PERSONAL COMPUTER", BIOS, "Powered by Last.fm"): `lang="en"`, o traducir los decorativos.
4. Metadatos: `alternates.languages` (hreflang) y `openGraph.locale` por idioma (Fase 7). Formateo `Intl` con el locale de la ruta (hoy `es-CO` fijo en `desktop-shell.tsx:205`, `terminal-app.tsx:26`).
5. El conmutador de idioma es un enlace (`<a hreflang="en" lang="en">English</a>`), no un botón JS, para que funcione sin hidratar.

---

## 9. Estrategia para los sprites de mascotas sin penalizar LCP

1. **Formato:** los sprites originales de Office Assistants son pixel art de paleta reducida (fotogramas de ~124×93 px [S]). Exportar a **PNG-8 cuantizado o WebP sin pérdida a 1×** y escalar con `image-rendering: pixelated` en enteros (2×). Hoy se envía una hoja RGBA de 1536×1024 y 2,28 MB que se muestra a 960×640: con 1× y paleta, el objetivo es **≤ 150 KB por personaje en total** y **≤ 40 KB para las animaciones de aparición e idle**.
2. **División:** una tira por animación (`appear`, `idle`, `writing`, `searching`, `confused`…) y un manifiesto JSON (fotogramas, duración, bucle) generado en build. Primero solo se cargan `appear` + `idle`; el resto bajo demanda en `requestIdleCallback`, cuando se espera una reacción.
3. **Cuándo cargar:** nunca antes del LCP.
   - El componente de mascota con `next/dynamic` (sin SSR) se monta tras `window.load` + `requestIdleCallback` (timeout de 3 s) o en la primera interacción, solo si la preferencia guardada no es "Ninguno".
   - Sin `<link rel="preload">`. A lo sumo, `prefetch` de baja prioridad tras el boot.
   - Cargar con `new Image()` + `img.decode()` antes de mostrarla (sin parpadeo ni jank en el hilo principal).
   - Con `navigator.connection.saveData` o `prefers-reduced-data`, no cargar sprites y ofrecer un botón "Mostrar asistente".
4. **Animar:** `background-position` con `steps()` en CSS, o un `<canvas>` pequeño con `drawImage` a 10–15 fps pausado en `visibilitychange`. Nada de framer-motion. Arrastrar con Pointer Events.
5. **Caché:** importación estática o nombres con hash, servidos desde `/_next/static/media` con caché inmutable (PERF-11).
6. **Sin CLS:** contenedor `position: fixed` de tamaño fijo, fuera del flujo, que no desplaza nada.
7. **En `/os`, el boot es el mejor momento:** si el usuario eligió mascota, precargar `appear` en `requestIdleCallback` durante la secuencia de boot, que ya es tiempo "muerto" después del LCP.

---

## 10. Tabla resumen

| ID | Sev. | Fase | Esf. | Tema |
|---|---|---|---|---|
| PERF-01 | crítico | 5 | M | `/` 100 % cliente, HTML sin contenido |
| PERF-02 | importante | 2 / 6 | S | framer-motion (+40 KB gz) en todas las rutas vía `not-found` |
| PERF-03 | importante | 7 (decidir en 3) | M | Imágenes sin optimizar (7,5 MB de PNG); sprite de 2,28 MB |
| PERF-05 | importante | 3 | S | Google Fonts por `@import` |
| PERF-07 | importante | 4 | M | Re-render completo en cada `pointermove` |
| A11Y-01 | importante | 4 | M | Ventanas sin `dialog` ni gestión de foco |
| A11Y-02 | importante | 4 | M | Menú Inicio y contextual sin teclado ni ARIA |
| A11Y-03 | importante | 3 / 4 | S | Foco de 2,44:1 y 1,39:1; `outline:none` en campos |
| A11Y-04 | importante | 3 | S | Bordes de input de 1,46:1 |
| A11Y-05 | importante | 4 | S | Live region de la BIOS cada 45 ms |
| A11Y-06 | importante | 4 / 5 | S | Foco detrás del boot; foco perdido tras el selector |
| A11Y-08 | importante | 3 | M | `lang` fijo; partes en inglés sin marcar |
| PERF-06 | menor / imp. | 3 / 5 | M | CSS único de 70,8 KB; selectores `body:has` |
| PERF-08 | menor / imp. | 4 / 7 | S | CRT WebGL en bucle por defecto |
| A11Y-07 | menor / imp. | 4 / 6 | S | Live regions que se montan y desmontan |
| A11Y-09 | menor | 7 | S | Ticker y animaciones infinitas sin pausa |
| A11Y-10 | menor | 4 / 7 | S | Formulario: obligatorio, errores, `role="alert"` |
| A11Y-11 | menor | 4 | S | `aria-label` en `div`, botones sin nombre, 2.5.3 |
| A11Y-12 | menor | 4 | S | Objetivos < 24 px |
| A11Y-13 | menor | 3 / 4 | S | Contraste de texto en el escritorio |
| A11Y-14 | menor | 4 / 6 | M | Arrastre sin alternativa de un solo puntero |
| A11Y-15 | menor | 4 | S | Sin `h1` estable; menú contextual bloquea el nativo en campos |
| A11Y-16 | menor | 5 | S | La preferencia de vista no se lee |
| A11Y-17 | menor | 6 | M | El asistente puede tapar el foco |
| PERF-04 | menor | 2 | S | `priority` deprecado en Next 16 |
| PERF-09 | menor | 4 / 5 | M | Componentes cliente de más |
| PERF-10 | menor | 7 | S | `page-transition` desde opacidad 0 |
| PERF-11 | menor | 7 | S | Caché de `public/` sin hash |

## 11. Qué no se verificó (pendiente para la Fase 7)
- Pruebas reales con NVDA/JAWS/VoiceOver y Lighthouse/axe en navegador: los anuncios de las live regions y los tiempos LCP/INP están marcados como [S].
- Cabeceras `Cache-Control` reales del contenedor y presencia de `sharp` en el standalone sobre Alpine.
- Contraste de `.project-year` sobre fotos (depende de cada imagen).
- Comportamiento de F6 y otros atajos frente a navegadores y lectores (por eso no se propone F6).
