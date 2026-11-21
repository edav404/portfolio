# 06 — Mascotas (Office Assistants): investigación y estado actual

Fase 1 (auditoría, solo lectura). Prepara la **Fase 6**. Fecha: 2026-11-20.
Convención: **[V]** = verificado (archivo leído, API consultada o fuente citada). **[S]** = suposición o estimación sin verificar.

---

## 0. Resumen ejecutivo

1. **Fuente recomendada de sprites [V]:** `pithings/clippy`, publicado en npm como `clippyjs@0.1.0` (17-feb-2026, último push 14-mar-2026). Es una reescritura ESM sin jQuery ni dependencias en tiempo de ejecución, con **10 agentes**: Clippy, Rover, Merlin, Links, Peedy, Genius, F1, Rocky, Genie y Bonzi. Cada agente trae `agent.ts` (frames, ramas y sonidos), `map.png` (atlas) y `sounds-mp3.ts` (MP3 en base64). La licencia MIT cubre **solo el código**: el texto de la licencia dice que los agentes y sus nombres son propiedad de Microsoft.
2. **Rover sí existe como spritesheet listo [V]:** frames de 80×80, atlas de 2160×2160 (698 KB en PNG) y **29 animaciones**. La cifra coincide con la versión final de XP que documenta Agentpedia. Entre ellas están las categorías de búsqueda de XP: `Travel`, `Cooking`, `Shopping`, `Sports`, `Money`, `Books`, `Celebrity` e `ImageSearching`. **No hay animaciones llamadas "Sleep" ni "Sniff"**. Si existen, van dentro de `Idle` mediante ramas, y hay que verificarlo a ojo [S].
3. **Recomendación:** no usar la librería tal cual. Conviene un **motor propio pequeño** (unas 300–400 líneas de TS) que lea el mismo formato de datos, convertido a JSON estático en `/public/assistants/<id>/`. Así se controlan la cola, los eventos del SO, la i18n, la accesibilidad y la carga diferida. `framer-motion` solo lo usa `RetroClippy.tsx` [V], así que el motor propio permite **eliminar esa dependencia**.
4. **Peso:** cada agente pesa entre 0,7 y 1,9 MB de PNG, más 30–100 KB de MP3. El coste real es la **memoria decodificada**: de 19 MB (Rover) a 66 MB (Peedy) por atlas. Hay que re-empaquetarlos (WebP sin pérdida o atlas por grupo de animaciones) y cargar solo el agente elegido.
5. **El "Clippy" actual no es el original [V]:** es un PNG de 1536×1024 y 2,2 MB con fondo opaco degradado, 5 estados de 6 frames, textos fijos en español y sin persistencia. Se reemplaza entero en la Fase 6.
6. **Bonzi queda DESCARTADO.** BonziBuddy acabó en una multa de la FTC por COPPA en 2004, por recolectar datos de menores, y fue clasificado como adware/spyware. Aunque el paquete lo incluye, no se publica.

---

## 1. Fuentes de sprites y animaciones

### 1.1 Repositorios y paquetes (metadatos consultados por la API de GitHub y el registro de npm el 2026-11-20)

| Proyecto | Agentes | Dependencias | Licencia (código) | Estado | Notas |
|---|---|---|---|---|---|
| **pithings/clippy** → npm `clippyjs` 0.1.0 | Clippy, Bonzi, F1, Genie, Genius, Links, Merlin, Peedy, Rocky, Rover | Ninguna en runtime; ESM (`dist/index.mjs`, subrutas `clippyjs/agents/rover`, etc.) | MIT (© 2012 Fireplace, 2017 Pooya Parsa) + cláusula: "All Microsoft agents, including agent names, the Clippy brand and all resources are the property of Microsoft" | **Mantenido**: push 2026-03-14, 619★, Renovate, no archivado. Paquete npm sin comprimir: 15,9 MB | Datos extraídos con **Double Agent** (Cinnamon Software). API: `initAgent`, `play`, `animate`, `speak({tts,hold})`, `speakStream`, `moveTo`, `gestureAt`, `stop`, `pause`, `dispose`. Demo: https://clippy.pi0.io/ |
| **clippyjs/clippy.js** (antes smore-inc; original 2012) | Los mismos 10 | **jQuery 1.7+** | MIT, misma cláusula | Inactivo: último push 2022-12-01, 2878★ | Formato `agent.js` + `map.png` + `sounds-mp3.js` + `sounds-ogg.js`. Ejemplo Rover: agent.js 58 KB, map.png 698 KB, mp3 29 KB, ogg 68 KB |
| **@react95/clippy** 2.2.3 (2026-07-08) | Envuelve `clippyjs@0.1.0` | peer React ≥16.8 | MIT | Activo (monorepo React95) | Hook de React. El paquete descomprimido pesa **33 MB**. Es una capa más sobre la misma librería; no aporta frente a un motor propio |
| lizozom/clippyts | Fork en TS | — | MIT (NOASSERTION en la API) | Último push 2024-09 | Superado por pithings |
| NavidK0/clippy, ElliotWood/clippyjs, teamcurri/clippy | Forks | — | — | Inactivos (2018–2024) | No usar |
| XP Search Assistant Rewritten (tmafe.com) | Rover con Microsoft Agent real | Ejecutable Windows | Freeware | — | Solo sirve como referencia visual; **no descargar ni ejecutar** |

URLs:
- https://github.com/pithings/clippy · https://raw.githubusercontent.com/pithings/clippy/main/LICENCE · https://www.npmjs.com/package/clippyjs · https://registry.npmjs.org/clippyjs
- https://github.com/clippyjs/clippy.js (README con jQuery) · https://github.com/smore-inc/clippy.js
- https://www.npmjs.com/package/@react95/clippy · https://github.com/React95/React95
- https://github.com/lizozom/clippyts · https://github.com/NavidK0/clippy · https://github.com/ElliotWood/clippyjs
- Double Agent: https://doubleagent.sourceforge.net/_users.htm
- https://tmafe.com/xp-search-rewritten · https://agentpedia.tmafe.com/wiki/Rover (403 al leerla automáticamente; los datos salen del extracto del buscador: final XP = 29 animaciones, `rover.acs` de 1,77 MB, origen en Microsoft Bob en 1995)

### 1.2 Formato de datos (verificado en `src/agents/*/agent.ts` y `src/animator.ts` de pithings)

```ts
{
  overlayCount: 1..3,           // capas superpuestas (boca/ojos en Merlin/Peedy/Genie)
  sounds: ["1","2",...],        // ids → sounds-mp3.ts { "1": "data:audio/mpeg;base64,..." }
  framesize: [w, h],
  tts: { rate, pitch, voice },  // solo pithings
  animations: {
    Nombre: {
      useExitBranching?: true,  // se queda en el último frame hasta exitAnimation()
      frames: [{ duration: 100, images: [[x,y], ...capas], sound?: "6",
                 exitBranch?: n, branching?: { branches: [{ frameIndex, weight }] } }]
    }
  }
}
```
Algoritmo del animador (pithings `src/animator.ts`, unas 230 líneas): avanza un frame tras cada `duration` ms. Si se pidió salir (`exiting`) y el frame tiene `exitBranch`, salta ahí. Si no, aplica `branching` con un número aleatorio ponderado, y si nada aplica pasa al índice+1. Cada capa es un `div` con `background-position: -x -y`. El sonido se reproduce con `new Audio(uri)` y los errores de autoplay se ignoran. **Las ramas son lo que da a los Idle su variedad orgánica**, así que el motor propio debe implementarlas igual para ser fiel.

### 1.3 Tamaños medidos (cabecera PNG leída con petición por rangos; tamaños de la API de árbol de GitHub)

| Agente | Frame | Atlas (px) | map.png | agent.ts | sounds-mp3 | Nº anim. | Nº frames | Memoria decodificada (w·h·4) |
|---|---|---|---|---|---|---|---|---|
| Rover | 80×80 | 2160×2160 | 698 KB | 72 KB | 29 KB | 29 | 1106 | **~18,7 MB** |
| Clippy | 124×93 | 3348×3162 | 1,33 MB | 82 KB | 26 KB | 43 | 1233 | ~42,3 MB |
| Links | 124×93 | 2976×2883 | 819 KB | 77 KB | 46 KB | 50 | 1219 | ~34,3 MB |
| Merlin | 128×128 | 2688×2688 | 1,04 MB | 84 KB | 91 KB | 73 | 945 | ~28,9 MB |
| Genie | 128×128 | 2688×2560 | 986 KB | 83 KB | 31 KB | 76 | 967 | ~27,5 MB |
| Genius | 124×93 | 2852×2883 | 1,18 MB | 117 KB | 78 KB | 47 | 1365 | ~32,9 MB |
| F1 | 124×93 | 3224×3255 | 1,07 MB | 130 KB | 103 KB | 48 | 1560 | ~42,0 MB |
| Rocky | 124×93 | 3472×3348 | 1,24 MB | 175 KB | 67 KB | 37 | 2170 | ~46,5 MB |
| Peedy | 160×128 | 4000×4096 | 1,89 MB | 134 KB | 69 KB | 85 | 1587 | ~65,5 MB |
| ~~Bonzi~~ | — | 3400×3360 | 834 KB | 47 KB | 40 KB | — | — | descartado |

El `agent.ts` comprime bien con gzip/brotli, por ser JSON muy repetitivo [S: estimo un 80–90 %]. El problema real es el atlas: en móviles de gama baja, 40–65 MB de bitmap por agente se notan. Hay que cargar **solo el agente elegido** y nunca precargar la galería completa.

### 1.4 Copyright y mitigaciones razonables

Hechos [V]:
- Los personajes son obra con copyright de Microsoft. Por ejemplo, Microsoft Learn llama al Genie "a copyrighted work of Microsoft Corporation". El uso y alojamiento de los archivos de personajes estaba sujeto al *Microsoft Agent License and Redistribution agreement*, y el FAQ archivado dice que **no podían publicarse en un servidor propio sin una licencia de distribución**. Microsoft Agent quedó obsoleto con Windows 7 y no se actualizará. Ese acuerdo ya no está disponible, de modo que **hoy no hay vía de licencia vigente**.
  - https://learn.microsoft.com/en-us/windows/win32/lwef/microsoft-agent-animations-for-genie-character
  - https://techshelps.github.io/MSDN/MSAGENT/devdoc/good/msagent/agentapiovw2zip_5dro.htm
  - https://learn.microsoft.com/en-us/windows/win32/win7appqual/removal-of-microsoft-agent
  - https://learn.microsoft.com/en-us/windows/win32/lwef/animation-lists-for-the-characters-available-from-microsoft
- Clippy.js lleva más de 13 años en la web pública con estos mismos sprites, sin retiradas conocidas [S: no encontré DMCA, pero no es garantía].

El usuario acepta el riesgo. Mitigaciones propuestas:
1. **No redistribuir `.acs`/`.acf`** ni el paquete npm entero: servir solo los atlas convertidos de los agentes usados, desde `/public/assistants/`.
2. **Crédito visible** en "Acerca de los asistentes" (dentro de la galería y del pie de `/classic`): *"Personajes de Microsoft Agent / Office Assistant © Microsoft Corporation. Uso nostálgico, no comercial y sin afiliación. Datos de animación: Clippy.js (MIT) y Double Agent."* Incluir el MIT de Clippy.js en `THIRD_PARTY_NOTICES` si se reutiliza su código o sus datos.
3. **Sin marcas en metadatos**: no poner "Clippy", "Microsoft" ni "Office" en `<title>`, `description`, OG, JSON-LD, `llms.txt`, nombres de rutas ni alt SEO. En la UI, nombres descriptivos ("Clip", "Perro buscador", "Mago") y el nombre original solo dentro del crédito [decisión de producto].
4. **Interruptor de retirada**: un flag (variable de entorno o constante en `content/assistants.ts`) que desactive los personajes de Microsoft y deje una mascota propia, para atender una reclamación en minutos sin desplegar código nuevo. Conviene diseñar desde ya un **personaje propio de respaldo** (por ejemplo, "ED" en pixel art) con el mismo formato de datos.
5. **`noindex` en las imágenes**: `X-Robots-Tag: noindex` para `/assistants/*` y `Disallow: /assistants/` en robots, para que los sprites no aparezcan en Google Imágenes.
6. **Sin monetización ni uso promocional** del personaje (ni en el CV ni en las capturas OG).
7. **No usar TTS por defecto** con las voces "estilo Microsoft", y no imitar voces.

---

## 2. Animaciones por personaje y mapeo a eventos del SO

### 2.1 Listas verificadas (claves de `animations` en pithings)

- **Rover (29):** Show, Hide, HideQuick, Greet, Idle, RestPose, Searching, ImageSearching, GetAttention, GetAttentionMinor, Thinking, Writing, Acknowledge, Pleased, Surprised, Embarrassed, Congratulate, CharacterSucceeds, ClickedOn, LookUp, LookUpLeft, GestureLeft, Travel, Cooking, Shopping, Celebrity, Sports, Money, Books.
  - Lo que pide el encargo (idle, sniff, search, sleep): `Idle` existe y tiene **110 puntos de rama**, así que seguramente contiene los olfateos y rascados [S]. `Searching` e `ImageSearching` existen. **"Sleep" no existe como nombre**; como "se duerme" tras inactividad usar `Idle` largo o `Hide` [verificar visualmente en la Fase 6].
- **Clippy (43):** Show, Hide, Greeting, GoodBye, RestPose, Idle1_1, IdleAtom, IdleEyeBrowRaise, IdleFingerTap, IdleHeadScratch, IdleRopePile, IdleSideToSide, IdleSnooze, Alert, CheckingSomething, Congratulate, EmptyTrash, Explain, GetArtsy, GetAttention, GetTechy, GetWizardy, Gesture{Up,Down,Left,Right}, Hearing_1, Look{Up,Down,Left,Right,UpLeft,UpRight,DownLeft,DownRight}, Print, Processing, Save, Searching, SendMail, Thinking, Wave, Writing.
- **Links (50):** como Clippy, con Idle de gato propios: IdleTailWagA–D, IdleScratch, IdleBlink, IdleStretch, IdleTwitch, IdleButterFly, IdleCleaning, IdleLegLick, IdleYawn, DeepIdleA y DeepIdleE.
- **F1 (48):** como Clippy, más IdleFallsAsleep, IdleLeansAgainstWall, IdleLooksAtUser, IdleHeadPatting, IdleCuteToeTwist, etc.
- **Genius (47):** como Clippy, más Idle0–Idle9 y DeepIdle1.
- **Rocky (37):** como Clippy, más DeepIdle1.
- **Merlin (73) / Genie (76) / Peedy (85), familia Microsoft Agent 2.0:** Show, Hide, Greet, Wave, Announce, Acknowledge, Pleased, Surprised, Sad, Confused, Uncertain, Decline, DontRecognize, Suggest, Explain, Think/Thinking, Process/Processing, Search/Searching, Read/Reading(+Continued/Return), Write/Writing(+Continued/Return), DoMagic1/2, Congratulate(_2), GetAttention(+Continued/Return), Alert, Gesture*, Look*(+Blink/Return), Move{Up,Down,Left,Right}, Idle1_1…Idle3_x, Hearing_1–4, StartListening, StopListening, RestPose. Lista oficial: https://learn.microsoft.com/en-us/windows/win32/lwef/microsoft-agent-animations-for-merlin-character (y los equivalentes de Genie y Peedy).

Agentes recomendados para el lanzamiento: **Rover** (búsqueda), **Clippy** (icónico), **Links** (gato, muy expresivo) y **Merlin** (más animaciones semánticas, como Confused y Sad). Opcionales: Genius, F1, Rocky, Peedy (el más pesado) y Genie. **Bonzi está descartado.**

### 2.2 Mapeo de eventos del SO → animación

Cada agente declara en su manifiesto un `eventMap: Record<AssistantEvent, string[]>`; si hay varias animaciones, el motor elige una al azar. Si la animación no existe, cae a `Explain` → `GetAttention` → `RestPose`.

| Evento | Clippy / Links / F1 / Genius / Rocky | Merlin / Genie / Peedy | Rover | Globo (opcional) |
|---|---|---|---|---|
| Aparecer (tras el arranque) | Show → Greeting | Show → Greet | Show → Greet | Saludo + menú (§5) |
| Abrir ventana | Explain / GestureUp | Acknowledge | Acknowledge | No (solo animación) |
| Cerrar ventana | EmptyTrash (con cooldown) | Pleased | GetAttentionMinor | No |
| Minimizar | LookDown / LookDownRight | LookDown | LookUpLeft | No |
| Maximizar | GestureUp / Wave | Surprised | Surprised | No |
| Abrir proyecto (`/proyectos/[slug]`) | CheckingSomething | Read → ReadReturn | Por categoría: Shopping (e-commerce), Money (SaaS/fintech), Books (blog), Searching (resto) | "¿Te cuento el reto y la solución?" |
| Búsqueda (escribir o lanzar) | Searching | Search / Searching | Searching (ImageSearching en la galería) | Panel Rover (§4) |
| Resultados encontrados / sin resultados | Congratulate / Thinking | Pleased / Uncertain | CharacterSucceeds / Embarrassed | "Encontré N…" / "No hallé nada…" |
| Inactividad 45 s | Idle* al azar (motor de ramas) | Idle1_* | Idle | No |
| Inactividad 3 min | IdleSnooze (Clippy), IdleFallsAsleep (F1), IdleYawn/DeepIdleA (Links), DeepIdle1 (Genius/Rocky) | Idle3_* | Idle (+ Hide si sigue inactivo) | No |
| Error / 404 / fallo de red | Alert | Confused / DontRecognize / Sad | Embarrassed | Mensaje de ayuda con 2 botones |
| Foco en un formulario | Writing | Write → WriteContinued | Writing | Consejo del formulario (una sola vez) |
| Enviar formulario OK | SendMail → Congratulate | Congratulate | Congratulate | "¡Mensaje enviado!" |
| Descargar CV | Print / Save | DoMagic1 | Books | No |
| Cambiar idioma | GetWizardy | DoMagic1 / DoMagic2 | Travel | "¡Ahora en English!" / "¡Ahora en español!" |
| Cambiar tema/CRT | GetArtsy | DoMagic2 | Celebrity | No |
| Clic en la mascota | Wave / animación aleatoria | Greet / animación aleatoria | ClickedOn | Abre el menú |
| Ocultar | GoodBye → Hide | Wave → Hide | Hide / HideQuick | No |
| Pasar el ratón por un elemento | LookLeft/Right/Up/Down (gestureAt por ángulo) | Look* | LookUp / LookUpLeft | No |

Reglas anti-fastidio: un globo automático como máximo cada 60 s y como máximo 3 por sesión. Los eventos repetidos en menos de 1,5 s se agrupan. Las animaciones de Idle se interrumpen con `exitBranch`, y una animación con prioridad corta la cola.

---

## 3. Arquitectura recomendada (React 19 / Next 16.4.6, sin jQuery)

### 3.1 Por qué un motor propio y no `clippyjs`
- La API de `clippyjs` es imperativa sobre el DOM (crea sus propios nodos y globo). Pelea con React, la i18n, el modelo de accesibilidad y el arrastre que ya tiene el shell.
- Empaqueta los MP3 como data URIs en JS. Eso choca con una CSP estricta (`media-src data:`), que se define en la Fase 2 (ver `next.config.ts:3`), y además engorda el chunk.
- Lo valioso es el **formato de datos** y el algoritmo de ramas, que es pequeño y queda documentado arriba.

### 3.2 Estructura propuesta
```
content/assistants.ts           # manifiesto: id, nombre L<string>, framesize, rutas, eventMap, crédito, enabled
lib/assistant/
  engine.ts                     # Animator puro (sin React): frames, branching, exitBranch, useExitBranching, overlays
  queue.ts                      # cola con prioridad, cooldown y debounce
  bus.ts                        # emit/subscribe tipado (AssistantEvent); sin dependencias
  store.ts                      # preferencias en localStorage + useSyncExternalStore
  search.ts                     # índice y búsqueda sobre content/ (§4)
components/assistant/
  AssistantHost.tsx             # "use client"; se carga con next/dynamic({ ssr:false }) desde el shell /os
  AssistantSprite.tsx           # capas div con background-position (DOM, no canvas)
  Balloon.tsx                   # globo amarillo estilo Office
  AssistantGallery.tsx          # selector "Galería de ayudantes" con < Atrás / Siguiente > como en Office 97/2000
  SearchCompanion.tsx           # panel lateral estilo XP
public/assistants/<id>/map.webp + anim.json + sounds/<n>.mp3
```
- **Conversión única** (un script en `scripts/`, Fase 6): tomar de `clippyjs` solo los agentes elegidos, pasar `agent.ts` a `anim.json`, decodificar los MP3 base64 a archivos y comprimir `map.png` a WebP sin pérdida [S: se espera un ahorro del 20–40 %]. Opcionalmente, partir el atlas en un "core" (Show, Hide, Greet, Idle, RestPose) y un "extras" que se carga después.
- **Carga diferida**: según `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`, `ssr:false` solo funciona en Client Components. `desktop-shell.tsx` ya es cliente, así que el host se monta con `dynamic(() => import(...), { ssr:false })` tras el arranque y dentro de `requestIdleCallback`. Después se hace `fetch` del `anim.json` y se decodifica el atlas con `new Image()` + `img.decode()`, mostrando la mascota solo cuando ya está lista. No va en `/classic` por defecto; allí sería opcional.
- **Bucle**: un único `requestAnimationFrame` que acumula `dt` y avanza mientras `acc >= frame.duration`, así que no se desfasa aunque bajen los fps. Se pausa con `document.hidden`, que rAF ya pausa de forma nativa. Cada frame actualiza `style.backgroundPosition` por ref, **sin pasar por el estado de React**. Escalado a 1× o 2× entero con `image-rendering: pixelated`, porque los sprites tienen bordes duros.
- **Cola**: `play(name, {priority, interrupt})`, `speak(textL, actions?)`, `gestureAt(x,y)` y `moveTo(x,y)` (usa MoveLeft/Right si existen). Una acción de prioridad alta llama `exitAnimation()` sobre la actual para salir limpio por `exitBranch`.
- **Bus de eventos**: el gestor de ventanas de la Fase 4 emite `assistant.emit({ type: "window:open", app })`. El asistente nunca lee el estado de las ventanas directamente; hoy lo deriva de `activeApp` en `components/desktop/desktop-shell.tsx:202`.
- **Globo**: fondo `#FFFFCC` (el que ya usa `app/desktop.css:277`) o `#FFFFE1`, como los tooltips/balloons de Windows [S]. Borde negro de 1 px, radio de 7 px y "cola" orientada hacia el personaje (se recoloca arriba/abajo e izquierda/derecha según el espacio). Lleva botones estilo Office y casillas tipo "No volver a mostrar esta sugerencia". Botón × y cierre con Esc. Texto escrito palabra a palabra solo si no hay `prefers-reduced-motion`.
- **Arrastre**: Pointer Events + `setPointerCapture` (el patrón que ya usa el shell, `desktop-shell.tsx:219-221`), limitado al viewport menos la barra de tareas. Con el foco en la mascota, las flechas la mueven 10 px (con Shift, 50). La posición se guarda. Esto **elimina `framer-motion`**, que hoy solo importa `components/desktop/RetroClippy.tsx:3` [V].
- **Persistencia**: `localStorage["edav.assistant.v1"] = { agent: "rover"|"clippy"|…|"none", hidden, muted, pos:{x,y}, seenTips:[] }`, leído con `useSyncExternalStore` (ver la guía `preventing-flash-before-hydration.md`). Como el host solo se monta en el cliente, no hay riesgo de error de hidratación. Versionar la clave.
- **Sonidos**: **apagados por defecto**. Se encienden con un toggle en el menú de la mascota o en el panel de sonido del SO. Los archivos se cargan solo al activarlos, con `new Audio()` y volumen 0,4, y nunca suenan antes de un gesto del usuario.
- **Accesibilidad**:
  - Con `prefers-reduced-motion: reduce`: frame estático de `RestPose`, sin bucle de Idle, sin movimiento por pantalla y globo sin animación. La mascota sigue siendo útil vía globo y menú.
  - La mascota es un `<button aria-label="Asistente (Rover). Abrir menú">` con `aria-haspopup="dialog"`. El sprite es decorativo (`aria-hidden`).
  - `aria-live="polite"` en una región **única y oculta** que solo anuncia mensajes iniciados por el usuario o resultados de búsqueda, nunca charla de inactividad ni animaciones. No robar el foco; al abrir el menú, el foco entra y vuelve al cerrar.
  - Siempre se puede descartar: "Ocultar", "Elegir otro ayudante" y "Sin ayudante". La elección persiste.
  - Contraste del globo: negro sobre #FFFFCC ≈ 20:1 [S: calculado de memoria].
  - Móvil (<640 px): 1× de escala, oculto por defecto o como botón compacto, para que no tape el contenido.
- **Peso estimado por personaje** (transferencia, WebP + brotli) [S]: Rover ~0,6 MB, Links ~0,7 MB, Merlin/Genie ~0,9 MB, Clippy ~1,1 MB, Peedy ~1,6 MB. A eso se suman ~5–15 KB de motor JS y ~10–20 KB de `anim.json` comprimido. Nada de esto entra en la ruta crítica.

### 3.3 Hallazgos sobre la implementación actual

| ID | Sev. | Evidencia | Impacto | Fix propuesto | Fase | Esf. |
|---|---|---|---|---|---|---|
| MAS-01 | importante | `public/images/edav-clippy-sprites.png` (1536×1024, 2,28 MB, revisado visualmente: ilustración no original con fondo opaco degradado); `app/desktop.css:270,288-295` | No es fiel a las originales (objetivo de la Fase 6). Pesa 2,2 MB para 30 frames, el fondo no es transparente y los offsets de los keyframes son irregulares (-26, -175, -325, -470, -622, -772 px), lo que provoca "saltos" del sprite | Reemplazar por el motor de §3 con los atlas de pithings; borrar el PNG y las reglas `.retro-clippy-sprite` | 6 | M |
| MAS-02 | importante | `components/desktop/RetroClippy.tsx:21-27,63-73`; `desktop-shell.tsx:229` | Textos y aria-labels fijos en español; no hay EN pese a la i18n de la Fase 3 | Copys como `L<string>` en `content/assistants.ts` | 3/6 | S |
| MAS-03 | menor | `RetroClippy.tsx:34` (`useState(true)`) | "Ocultar" no persiste: reaparece en cada carga y en el 404 | Persistir en localStorage (§3.2) | 6 | S |
| MAS-04 | menor | `RetroClippy.tsx:44-49,65` | Cada cambio de estado desmonta y vuelve a montar el globo con `aria-live="polite"`: anuncios repetidos al enfocar formularios (`:51-57`) y parpadeo | Región live única; anunciar solo mensajes iniciados por el usuario | 6 | S |
| MAS-05 | menor | `RetroClippy.tsx:3,64`; `package.json` (`framer-motion ^13.1.1`) | `framer-motion` se usa **solo** para arrastrar la mascota; dependencia pesada para un caso pequeño | Arrastre con Pointer Events y eliminar la dependencia | 6 | S |
| MAS-06 | menor | `RetroClippy.tsx:64,70` | El arrastre solo funciona con puntero; no se puede reubicar con teclado | Flechas con foco en la mascota | 6 | S |
| MAS-07 | menor | `app/desktop.css:266` (`z-index: 2147483000`) | Queda por encima de cualquier modal o diálogo futuro (galería, menú Inicio) | Escala de z-index en los tokens de la Fase 3 | 3 | S |
| MAS-08 | menor | `desktop-shell.tsx:202` | El estado del asistente se deriva de la ventana activa; no hay eventos de abrir, cerrar, minimizar ni maximizar | Bus de eventos (§3.2) emitido por el gestor de ventanas | 4/6 | M |
| MAS-09 | menor | `app/not-found.tsx:3,6` | El 404 monta la mascota también fuera del SO (experiencia clásica) | En `/classic` hacerla opcional y desactivada por defecto; en el 404 de `/os`, animación de error | 5/6 | S |
| MAS-10 | menor | `RetroClippy.tsx:39` (`setTimeout(…,0)` para "mounted") | Truco para evitar el SSR del portal | Con `dynamic({ssr:false})` sobra | 6 | S |
| MAS-11 | importante (legal/SEO) | — (aún no existe) | Si se usan los sprites reales sin mitigaciones, hay riesgo de marca y copyright, y de que se indexen las imágenes | Mitigaciones de §1.4: crédito, sin marcas en metadatos, flag de retirada, `noindex` en /assistants | 6/7 | S |

Positivo [V]: el globo ya usa el amarillo de Office (`desktop.css:277`), hay soporte para `prefers-reduced-motion` (`desktop.css:485-489`) y un botón para restaurar la mascota tras ocultarla.

---

## 4. Búsqueda "estilo Rover" (Search Companion de XP)

### 4.1 Referencia del original [V parcial]
En XP, la búsqueda abría un **panel lateral izquierdo** en el Explorador, con el personaje animado abajo y la pregunta "¿Qué desea buscar?" (*What do you want to search for?*). Las opciones eran enlaces: "Imágenes, música o vídeo", "Documentos", "Todos los archivos y carpetas", "Equipos o personas", etc. El paso siguiente pedía "Todo o parte del nombre" y una "palabra o frase". En "Cambiar preferencias" se elegía *"Con un personaje animado en pantalla"*, *"Sin personaje animado"* o *"Con un personaje diferente"*, con o sin Indexing Service.
- Microsoft KB 307980 (archivo): https://ftp.zx.net.nz/pub/archive/ftp.microsoft.com/MISC/KB/en-us/307/980.HTM
- O'Reilly, *Windows XP Pro: The Missing Manual*: https://www.oreilly.com/library/view/windows-xp-pro/0596008988/ch01s08.html
- GCFGlobal: https://edu.gcfglobal.org/en/windowsxp/searching-for-files-and-folders/1
- La lista exacta de opciones no está verificada al 100 % (la fuente confirma "cuatro tipos de búsqueda").

### 4.2 Diseño para EDAV OS
Es una ventana o panel "Buscar" (Inicio → Buscar, atajo `Ctrl+K` o `/`, o clic en Rover → "Buscar"), con una columna lateral de unos 240 px en el estilo azul de XP y Rover abajo.

Flujo, en pasos como el original:
1. **¿Qué desea buscar? / What do you want to search for?**
   - Proyectos / Projects
   - Artículos del blog / Blog posts
   - Servicios / Services
   - Todo el portafolio / Everything
   - (enlace) Cambiar preferencias → ayudante, sonidos, "sin personaje"
2. **Escriba todo o parte de lo que busca / Type all or part of what you're looking for** + filtros contextuales: tipo de proyecto (`projectKinds`), tecnología (`technologies`), año, estado. Botones: **[Atrás] [Búsqueda]**.
3. Mientras busca: Rover hace `Searching` (o la categoría: `Shopping` para e-commerce, `Books` para blog, `Money` para servicios) durante al menos unos 700 ms para dar el toque nostálgico. Sin espera artificial si hay `reduced-motion`.
4. **Resultados** a la derecha (vista de lista con icono, título, resumen y tipo) y en el panel: "¿Encontró lo que buscaba?" → *Sí, terminé de buscar* / *Refinar la búsqueda* / *Buscar en otro tipo*. Sin resultados: Rover `Embarrassed` más sugerencias, como los 3 proyectos destacados o "Contactar".
5. Al abrir un resultado se abre la ventana o URL compartible (`/proyectos/[slug]`, post localizado `posts[i].slug[locale]`, `servicios#slug`).

### 4.3 Implementación
- **Índice** (`lib/assistant/search.ts`): `buildIndex(locale)` recorre `content/projects.ts` (title `string|L`, summary, challenge, solution, category, services, technologies, client, year), `content/posts.ts` (title, description, tags, texto de `body`) y `content/services.ts` (title, kicker, description, includes, stack). Produce `{ type, id, url, title, snippet, fields: {title, tags, body} }`. Hoy hay 17 proyectos, 2 posts y 5 servicios [V], así que el índice pesa unos pocos KB [S] y puede generarse en el cliente al abrir la búsqueda (import dinámico de `content/*`) o serializarse en el build.
- **Coincidencia**: normalizar con `toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu,"")` ("diseño" = "diseno") y tokenizar. Puntuación: título ×5, tecnología o tag ×3, categoría o cliente ×2, cuerpo ×1. Prefijos para buscar mientras se escribe y tolerancia de 1 error (Levenshtein) en tokens de 5 caracteres o más. Sin dependencias; si el contenido crece mucho, MiniSearch (MIT) [S: no evaluado].
- **Bilingüe**: indexar según el locale activo; si no hay resultados, reintentar en el otro idioma y avisar ("Encontré esto en inglés").
- **Accesibilidad**: `role="search"`, input con label, resultados en `<ul>` y contador anunciado por la región live ("5 resultados"). Navegación con ↑/↓ y Enter. En `/classic`, la misma búsqueda como página o diálogo sin personaje.
- **Compartir**: `?q=` en la URL de la ventana de búsqueda, coherente con las URLs compartibles de la Fase 4.

---

## 5. Navegación asistida: guion para un reclutador (bilingüe)

Principios: es opcional y breve (3–4 globos), siempre con "Ahora no" y "No volver a mostrar", nunca bloquea el contenido y cada paso abre algo real. El texto vive en `content/assistants.ts` como `L<string>`. Las animaciones de la columna son las de Rover; para otros agentes se usa el equivalente de §2.2.

| Paso | Animación (Rover / Clippy) | ES | EN | Botones (ES / EN) → acción |
|---|---|---|---|---|
| 0. Aparece (unos 3 s tras el arranque, solo la primera visita) | Show→Greet / Show→Greeting | "¡Hola! Soy el ayudante de EDAV OS. ¿Vienes a conocer el trabajo de Emmanuel?" | "Hi! I'm the EDAV OS helper. Here to check out Emmanuel's work?" | **Soy reclutador/a** · Solo estoy mirando · Ahora no / **I'm a recruiter** · Just browsing · Not now |
| 1. Reclutador | Searching / CheckingSomething | "Perfecto. En 2 minutos: Emmanuel es desarrollador web full-stack en Medellín. ¿Por dónde empezamos?" | "Great. In 2 minutes: Emmanuel is a full-stack web developer in Medellín. Where should we start?" | Proyectos destacados · CV en PDF · Experiencia / Featured projects · PDF résumé · Experience |
| 2a. Proyectos | Acknowledge / Explain (abre la galería filtrada `featured`) | "Estos son sus proyectos destacados. En cada uno verás el reto, la solución y qué hizo él." | "Here are his featured projects. Each one shows the challenge, the solution and his role." | Buscar por tecnología · Siguiente / Search by tech · Next |
| 2b. CV | Books / Print (abre o descarga `/cv`) | "Aquí tienes su CV. También está en inglés." | "Here's his résumé. It's available in Spanish too." | Ver en inglés/español · Siguiente / Switch language · Next |
| 2c. Experiencia | Thinking / Explain (abre "Sobre mí") | "Aquí está su experiencia y formación, con fechas." | "Here's his experience and education, with dates." | Siguiente / Next |
| 3. Cierre | GetAttention / GetAttention | "¿Te interesa conversar? Puedes escribirle desde aquí; responde en menos de 24 h." [verificar el SLA con el usuario] | "Want to talk? You can message him right here; he usually replies within 24 h." [verify] | **Contactar** · Copiar correo · Terminé / **Contact** · Copy email · I'm done |
| 4. Tras enviar el formulario | SendMail→Congratulate / CharacterSucceeds | "¡Listo! Tu mensaje va en camino." | "Done! Your message is on its way." | Cerrar / Close |
| Rama "Solo mirando" | Wave / Pleased | "Genial. Haz clic en mí cuando quieras buscar algo." | "Cool. Click me any time you want to search for something." | Buscar · Cerrar / Search · Close |
| Inactividad en el paso 1 o 2 (90 s, una vez) | GetAttentionMinor / GetAttention | "¿Te ayudo a encontrar algo?" | "Need help finding something?" | Buscar · No, gracias / Search · No thanks |

Notas: no afirmar en los globos datos que no estén en `content/` (el SLA de respuesta debe confirmarlo el usuario). El rol de "Solo estoy mirando / reclutador" puede guardarse en `localStorage` para no repetir el tour. No se envía analítica sin consentimiento.

---

## 6. Personajes descartados

- **Bonzi (BonziBUDDY): DESCARTADO.** En 2004 la FTC impuso a Bonzi Software 75.000 USD por violar COPPA (recolectaba datos de menores de 13 años). Consumer Reports WebWatch lo calificó de spyware en 2002, Symantec y Trend Micro lo clasificaron como adware, y hubo una demanda colectiva por "interfaces falsas" en sus anuncios. Asociarlo a la marca personal es negativo aunque sea en broma.
  - https://www.ftc.gov/opa/2004/02/bonziumg.htm · https://en.wikipedia.org/wiki/BonziBuddy · https://www.techdirt.com/2004/09/03/scamming-software-company-scams-again/
- **Robby, Courtney y Earl** (Microsoft Agent / XP): no están en clippy.js, así que no hay datos listos. Extraerlos requeriría manipular `.acs`, lo que contradice la mitigación 1.
- **Genie y Peedy:** son técnicamente viables pero los menos icónicos; Peedy es el más pesado (66 MB decodificado). Quedan como opcionales.

## 7. Pendientes y suposiciones a verificar en la Fase 6
- Revisar a ojo el contenido real de `Idle` de Rover (olfatear, rascarse, dormir) y elegir las animaciones de "dormido".
- Medir el ahorro real de WebP sin pérdida frente a PNG y la memoria en un móvil de gama baja.
- Confirmar con el usuario los nombres visibles (¿"Rover" o un nombre propio?) y el texto de crédito.
- Confirmar el SLA de respuesta del guion antes de publicarlo.
- Definir la CSP (Fase 2): `img-src 'self'`, `media-src 'self'`, sin `data:` si se extraen los MP3.
