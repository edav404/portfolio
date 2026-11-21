# Auditoría del portafolio (Fase 1)

Fecha: 2026-11-21 · Rama: `fase/1-auditoria` · Modo: solo lectura (no se cambió código).
Documento interno del repositorio: no se publica como página del sitio.

Seis auditores trabajaron en paralelo, cada uno en un área. Codex hizo después una revisión
independiente del consolidado (ver §6). Los informes completos, con evidencia `ruta:línea`, están en `docs/auditoria/`:

| Anexo | Área | Hallazgos |
|---|---|---|
| [01-arquitectura.md](auditoria/01-arquitectura.md) | Arquitectura, código, dependencias, DX | 24 |
| [02-ui-ux-tokens.md](auditoria/02-ui-ux-tokens.md) | Estética XP/Y2K, UX, design tokens, propuestas de `/classic` y del selector | 24 |
| [03-a11y-rendimiento.md](auditoria/03-a11y-rendimiento.md) | Accesibilidad (WCAG 2.2 AA) y rendimiento | 28 |
| [04-seo-contenido.md](auditoria/04-seo-contenido.md) | SEO técnico, plan bilingüe, `llms.txt`, contenido | 23 |
| [05-seguridad-infra.md](auditoria/05-seguridad-infra.md) | Seguridad, Docker, Coolify, Cloudflare | 20 |
| [06-mascotas.md](auditoria/06-mascotas.md) | Office Assistants: fuentes, licencias, motor, búsqueda estilo Rover | 11 |
| [07-redirecciones-wordpress.md](auditoria/07-redirecciones-wordpress.md) | URLs del WordPress antiguo → 301 | — |

Severidad: **crítico** (bloquea un objetivo o daña SEO/seguridad), **importante**, **menor**.

## 1. Estado general

| Área | Estado | Resumen |
|---|---|---|
| Compilación y calidad | ✅ | `tsc`, lint y `npm audit` sin errores; no hay paquetes sin usar. |
| Seguridad | 🟡 | Sin secretos en el historial y `npm audit` limpio (no prueba ausencia de fallos propios). Falta CSP y la IP del cliente es frágil detrás de Cloudflare. |
| Arquitectura | 🟠 | El escritorio es un solo archivo gigante; la URL no está conectada a las ventanas; hay texto en español escrito en el JSX. |
| SEO | 🔴 | `/` entrega a Google solo el selector; OG heredado por error; sitemap con URLs que redirigen; blog sin ruta. |
| UI/UX | 🟠 | El "XP" es en realidad Windows 98; la vista normal parece plantilla SaaS; el CV no está enlazado. |
| Accesibilidad | 🟠 | Ventanas y menús sin gestión de foco; foco y bordes con contraste insuficiente. |
| Rendimiento | 🟠 | `/` arranca en el selector y carga ~208 KB gz de JS; framer-motion en todas las rutas; imágenes sin optimizar (~7,5 MB). |
| Mascotas | 🟠 | El Clippy actual no es el original (2,28 MB, fondo opaco); existe una fuente fiel y mantenida (`clippyjs`). |

## 2. Hallazgos críticos e importantes, transversales

| # | Hallazgo | IDs | Fase |
|---|---|---|---|
| 1 | **`/` sin contenido sustancial indexable.** El HTML del servidor solo trae el selector (H1 "¿Cómo quieres explorar…?"), porque el estado inicial es `choice` (Next sí prerenderiza componentes cliente). La elección se guarda en localStorage pero nunca se lee. | SEO-01, UX-01, PERF-01, ARQ-01, A11Y-16 | 5 |
| 2 | **Proyectos sacan al usuario del SO** (`router.push`); no hay URL ↔ ventana. | ARQ-04, UX-04 | 4 |
| 3 | **Escritorio monolítico** (`desktop-shell.tsx`, 7 componentes, líneas de >1 200 caracteres) y arrastre que re-renderiza todo el escritorio. | ARQ-03, PERF-07 | 4 |
| 4 | **Sin i18n**: `data/` solo ES y texto fijo en páginas; `lang="es"` fijo. | ARQ-05, SEO-09, A11Y-08, CNT-03 | 3 |
| 5 | **El SO es Windows 98, no XP Luna**; cuatro estilos visuales; temas por `body:has()`; 264 colores hex sueltos. | UI-01, UI-02, UI-03 | 3–4 |
| 6 | **Ventanas y menús inaccesibles por teclado**; foco con contraste 2,44:1 y 1,39:1; live region de la BIOS cada 45 ms. | A11Y-01…05 | 2 (contraste) / 4 |
| 7 | **framer-motion + RetroClippy en todas las rutas** vía `not-found.tsx` (+39,6 KB gz). | PERF-02, MAS-05 | 2 |
| 8 | **Imágenes sin optimizar** (`images.unoptimized`), PNG de 470–760 KB servidos en miniaturas. | PERF-03 | 7 |
| 9 | **Metadata**: OG `url`/título heredados de la home; sin imagen social; sitemap sin barra final (308); `lastModified` inventado; FAQ plantillada. | SEO-02…07 | 3 / 7 |
| 10 | **Bug del formulario**: `?servicio=` no se lee; servicios triplicados por título; "Automatización" no se puede elegir. | COD-01 | 2 |
| 11 | **IP del cliente tras Cloudflare** puede agrupar a todos en una sola clave de rate limit (429 global). | SEC-01 | 2 / 8 |
| 12 | **Sin CSP.** Propuesta estática compatible con Next 16, Last.fm y audio de mascotas; empezar en Report-Only. | SEC-02 | 2 |
| 13 | **`.dockerignore` no excluye `private/` ni documentos privados de `content/`** (en builds locales). | INF-01 | 2 |
| 14 | **CV, correo, LinkedIn y GitHub no aparecen en ninguna UI.** | UX-02 | 3 / 5 |
| 15 | **Contenido inconsistente**: "diseño web" vs "Full Stack y automatización"; "5+ años" no cuadra; cifras escritas a mano. | CNT-01, CNT-02, UX-07 | 3 |
| 16 | **Sin tests ni CI.** | DX-01 | 3 |
| 17 | **Cloudflare Tunnel** puede romper www→apex/HTTPS y la emisión del certificado si se configura mal. | INF-07 | 8 |
| 18 | **Riesgo legal de los sprites** de Microsoft: requiere mitigaciones (crédito, sin marcas en SEO, interruptor de retirada, mascota propia de respaldo). | MAS-11 | 6 |

## 3. Plan de trabajo por fase (derivado de la auditoría)

### Fase 2 — Dependencias y fixes críticos
- Actualizaciones minor/patch (React 19.3.x, `@types/*`, framer-motion si se conserva). Majors fuera de alcance.
- COD-01: servicios por slug desde `content/services.ts`; leer `?servicio=`; añadir "Automatización".
- PERF-02: sacar `RetroClippy` del 404 (y con él framer-motion del bundle común).
- SEC-01: `CLIENT_IP_HEADER` opcional (`cf-connecting-ip`) + tabla de escenarios en la guía de despliegue.
- SEC-02: CSP estática en `Content-Security-Policy-Report-Only`; restringir hosts de portadas de Last.fm.
- SEC-03: comprobar `Origin` / `Sec-Fetch-Site` en `/api/contact`.
- INF-01: excluir `private/` y `content/*` no-`.ts` en `.dockerignore`.
- A11Y-03/04: foco visible y bordes de campo con contraste ≥ 3:1. A11Y-05: quitar la live region de la BIOS.
- `next-env.d.ts` cambia al compilar: decidir si se versiona.
- **Adelantado por la revisión de Codex:** portada `/` con contenido real en el HTML inicial (el selector deja de bloquear), CV y vías de contacto visibles, sitemap con barra final y sin `lastModified` inventado, redirecciones 301 del WordPress antiguo con destino equivalente.
- Endurecimiento del formulario: `Retry-After` en 429, no consumir cuota global si el SMTP falla, sanear el log de errores SMTP, timeouts de lectura del cuerpo, `localStorage` en `try/catch`.
- Documentar la frontera de confianza de proxies (quién sobrescribe cada cabecera) y cerrar el origen a todo lo que no sea el proxy antes de publicar.

### Fase 3 — Arquitectura compartida, tokens e i18n
- **Primero, un árbol de rutas concreto** (idioma × variante × caché) antes de tocar layouts: los route groups no crean URLs y varios layouts raíz implican recarga completa al cruzar entre ellos.
- Route groups con layouts propios y `data-theme`; eliminar `body:has()`.
- i18n: ES sin prefijo y EN bajo `/en/`, con `proxy.ts` (antes "middleware" en Next 16) y layouts raíz por idioma para `lang` correcto; microcopy en `content/ui.ts`; tabla `content/routes.ts`.
- Migrar `data/` → `content/`; `/sobre-mi` y cifras desde `content/`.
- Tokens: base compartida + temas `xp` y `classic` (propuesta en anexo 02).
- `next/font` en lugar de `@import` de Google Fonts.
- Helper `buildMetadata` por página (OG, canonical, alternates).
- Tests mínimos (Vitest) + CI en GitHub Actions + Renovate/Dependabot.

### Fase 4 — SO con ventanas y proyectos como ventanas
- `lib/os/window-reducer.ts` puro; shell del SO en un layout que persiste; `history.pushState` para URL ↔ ventana.
- Cromo XP Luna real (barra de título, botones, barra de tareas, menú Inicio, bandeja).
- Patrones ARIA: ventanas como `dialog` no modal, Menu Button para Inicio, `toolbar` para la barra de tareas, atajos con modificador; foco al abrir y devolución al cerrar.
- Escala de z-index acotada; modo móvil "XP Pocket" (ventanas a pantalla completa en pila).
- Galería única con filtros y badges de crédito (lmilo con enlace, jdicans sin enlace).

### Fase 5 — Selector y `/classic`
- Selector como overlay sobre contenido real; la cookie solo recuerda la preferencia (no decide qué HTML sirve una URL pública, para no mezclar variantes en caché).
- `/classic` con dirección Y2K/web 2000s limpia (anexo 02); `/os` como aplicación con `noindex` justificado (las páginas públicas son las indexables).
- CV y contacto visibles en todas las vistas.

### Fase 6 — Mascotas
- Motor propio (~300–400 líneas TS) sobre el formato de datos de `clippyjs` convertido a JSON + WebP; solo se carga el agente elegido.
- Bus de eventos del gestor de ventanas → animaciones; globo amarillo; arrastre con Pointer Events y teclado; persistencia; sonidos apagados por defecto; `prefers-reduced-motion`.
- Búsqueda estilo Rover sobre `content/` en ES/EN; guion bilingüe para reclutadores.
- Mitigaciones MAS-11; Bonzi descartado (adware histórico).

### Fase 7 — Pulido rendimiento / accesibilidad / SEO
- Optimización de imágenes (quitar `unoptimized`, `sharp` en la imagen Docker), presupuestos por ruta.
- Sitemap con barra final, alternates hreflang + `x-default`, `lastModified` real.
- `llms.txt` y `llms-full.txt` bilingües generados desde `content/` (estructura en anexo 04).
- JSON-LD completo (Person, WebSite, CreativeWork con autoría, BreadcrumbList); quitar FAQ plantillada.
- Blog publicado y redirecciones 301 del WordPress antiguo (anexo 07).

### Fase 8 — Despliegue y cierre
- Checklist del servidor (anexo 05): Traefik `trustedIPs` o `CLIENT_IP_HEADER`, Tunnel apuntando a HTTPS de Traefik, DNS-01 si 80/443 cerrados, rotación de logs, HSTS a 1 año y luego `includeSubDomains`.

## 4. Redirecciones del WordPress antiguo

Verificado en la base de LocalWP (`permalink_structure = /%postname%/`, proyectos en `/portfolio/<slug>/`).
Tabla completa en el anexo 07. Trampa: la antigua `/portfolio/green-holds/` era **CIA SUR** → `/proyectos/cia-sur/`.
La carpeta `WordPress/` del repo está vacía; conviene contrastar la tabla con Search Console o Wayback antes de implementarla.

## 5. Decisiones abiertas para el usuario

| # | Decisión | Recomendación |
|---|---|---|
| 1 | Rutas en inglés: `/en/proyectos` o `/en/projects` | Traducidas (`/en/projects`) vía `content/routes.ts`, por claridad para el visitante |
| 2 | URL de un proyecto abierto en el SO | `/proyectos/<slug>/` como página pública estable y `/os/proyectos/<slug>/` como estado compartible del escritorio (cambiado tras la revisión de Codex: evita servir variantes distintas en la misma URL) |
| 3 | Blog | Publicarlo (2 posts ya bilingües) para conservar URLs antiguas |
| 4 | framer-motion | Eliminarla; arrastre propio con Pointer Events |
| 5 | Posicionamiento principal | "Desarrollador Full Stack y de automatización" en todo el sitio |
| 6 | "5+ años" | Confirmar desde cuándo contar: `content/experience.ts` empieza en 2020 (bufete), el freelance en 2023 |
| 7 | Mascota por defecto | Ninguna automática en `/classic`; en `/os` Clippy aparece, se puede descartar y el descarte persiste; sonidos apagados |

## 6. Revisión independiente (Codex)

Codex revisó el consolidado con el código clave pegado (sin acceso al repo). Correcciones aplicadas arriba:

| Observación de Codex | Verificación | Cambio |
|---|---|---|
| "`/` 100 % cliente" es engañoso: Next prerenderiza componentes cliente; la causa es el estado inicial `choice` | Correcta | Redacción corregida (§1, §2) |
| El canonical `"/"` del layout raíz puede heredarse a páginas sin override | Verificado: todas las páginas lo sobrescriben salvo `/` (correcto) y el 404 (menor) | Sin cambio de prioridad |
| Quitar Clippy del 404 podría no sacar framer-motion de todas las rutas | Verificado: solo `RetroClippy` importa framer-motion, y solo lo usan el 404 y el escritorio | Se mantiene PERF-02 en Fase 2 |
| URL única cuyo HTML depende de una cookie complica caché (Next, Traefik, Cloudflare) y RSC | Correcta | Decisión 2 cambiada; la cookie solo recuerda la preferencia |
| Route groups no crean URLs; varios layouts raíz implican recarga completa | Correcta | Fase 3 empieza por un árbol de rutas concreto |
| CSP sin nonce exige `'unsafe-inline'` en scripts; Report-Only no protege | Correcta | La CSP se probará y luego pasará a modo bloqueante |
| `CLIENT_IP_HEADER` sin cerrar el origen permite falsificar la IP | Correcta | Fase 2 documenta la frontera de confianza |
| Adelantar portada con contenido, CV/contacto, sitemap y redirecciones | De acuerdo | Movido a Fase 2 |
| Accesibilidad y rendimiento como requisito de cada fase, no solo de la 7 | De acuerdo | Criterio de aceptación en cada fase |
| WCAG 2.5.7 pide alternativa de puntero simple, no solo teclado | Correcta | Botones para mover/restablecer ventanas y mascota (Fases 4 y 6) |
| La licencia de los sprites no está demostrada; las mitigaciones no son permiso | Correcta | Riesgo asumido por el usuario; se mantiene el interruptor de retirada y la mascota propia de respaldo |

Informe completo de Codex: no se versiona (contenía solo la revisión de este documento).
