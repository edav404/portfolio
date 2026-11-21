# Pendientes

Lista viva de correcciones derivadas de la auditoría (`docs/auditoria.md` y anexos en `docs/auditoria/`).
Se actualiza al cerrar cada fase: marcar `[x]`, anotar el commit y mover lo que cambie de fase.

Severidad: 🔴 crítico · 🟠 importante · 🟡 menor. Los IDs remiten al anexo correspondiente.

## Decisiones tomadas (2026-11-21)

| # | Tema | Decisión |
|---|---|---|
| 1 | Rutas en inglés | Traducidas: `/en/projects/`, `/en/about/`…, mapeadas en `content/routes.ts` |
| 2 | URL de proyectos | `/proyectos/<slug>/` = página pública estable; `/os/proyectos/<slug>/` = ventana del escritorio compartible. La cookie solo recuerda la preferencia |
| 3 | Blog | Se publican los 2 artículos bilingües, **previa auditoría SEO propia de cada artículo** y aplicando sus mejoras |
| 4 | framer-motion | Se elimina; arrastre propio con Pointer Events (más alternativa sin arrastre, WCAG 2.5.7) |
| 5 | Años de experiencia | Contar desde 2020 (Dávila & Trujillo Abogados); preferir "desde 2020" a una cifra |
| 6 | Posicionamiento | "Desarrollador Full Stack y de automatización" en todo el sitio (sustituye "diseño web") |
| 7 | Mascota | Clippy por defecto; descartable y el descarte persiste; sonidos apagados |
| 9 | "Diseño web y UX/UI" | Se mantiene como uno de los servicios; no es el posicionamiento |
| 10 | Cifras de `content/profile.ts` | Derivarlas de `content/` (p. ej. nº de proyectos de cliente) en la Fase 3 |
| 8 | MCP | Context7 y Firecrawl solo cuando sea estrictamente necesario (consumo de créditos). Perplexity no instalado |

## Fase 2 — Dependencias y fixes críticos

Cerrada en la rama `fase/2-dependencias-fixes` (commits `a172005`…). Notas: la CSP sigue en Report-Only hasta revisar la consola en todas las vistas (pasar `CSP_ENFORCE` a `true`); también se resolvieron SEC-08 (`.gitignore`), UX-06 (botón flotante) y se quitó `app/loading.tsx` (ocultaba la portada sin JS).

- [x] 🟡 DEP-01 Actualizaciones minor/patch (React 19.3.x, `@types/*`). Majors fuera (DEP-02)
- [x] 🟡 DEP-03 / MAS-05 Quitar framer-motion (arrastre propio provisional en `RetroClippy`)
- [x] 🟡 DEP-04 `engines` + `.nvmrc` (Node 24)
- [x] 🟠 PERF-02 / MAS-09 Sacar `RetroClippy` del 404
- [x] 🟠 COD-01 Servicios por slug desde `content/services.ts`; leer `?servicio=`; añadir "Automatización"
- [x] 🔴 SEO-01 / UX-01 / ARQ-01 / PERF-01 Portada `/` con contenido real en el HTML inicial; el selector deja de bloquear
- [x] 🟠 UX-02 CV (ES/EN), correo, LinkedIn y GitHub visibles
- [x] 🟠 SEO-04 Sitemap con barra final · SEO-05 sin `lastModified` inventado
- [x] 🟠 SEO-06 Publicar el blog (2 artículos) con auditoría SEO por artículo y mejoras aplicadas
- [x] 🟠 Redirecciones 301 del WordPress antiguo (anexo 07; ojo `/portfolio/green-holds/` → CIA SUR)
- [x] 🟠 CNT-01 Posicionamiento "Full Stack y automatización" · CNT-02 / COD-02 / UX-07 cifras desde `content/` y "desde 2020"
- [x] 🟠 SEC-01 IP del cliente tras Cloudflare (`CLIENT_IP_HEADER`) + frontera de confianza documentada
- [x] 🟠 SEC-02 CSP en Report-Only (probar hidratación, JSON-LD, imágenes, audio) y restringir hosts de Last.fm
- [x] 🟡 SEC-03 Comprobar `Origin` / `Sec-Fetch-Site` en `/api/contact`
- [x] 🟡 SEC-05 / SEC-06 Rate limiter (inundación de claves) y uptime en `/api/health`
- [x] 🟡 Formulario: `Retry-After` en 429, no gastar cuota global si falla SMTP, sanear log SMTP, timeout de lectura, `localStorage` en `try/catch`
- [x] 🟠 INF-01 `.dockerignore`: excluir `private/` y `content/*` que no sean `.ts`
- [x] 🟡 INF-02 / INF-09 / INF-10 Caché de build, logs y documentación de despliegue
- [x] 🟠 A11Y-03 / A11Y-04 Foco visible y bordes de campo con contraste suficiente
- [x] 🟠 A11Y-05 Quitar la live region de la BIOS
- [x] 🟡 PERF-04 `priority` deprecado en Next 16
- [x] 🟡 DX-03 Ignorados · `next-env.d.ts` cambia al compilar: decidir si se versiona

## Revisiones pendientes del usuario (de la Fase 2)

- [ ] Portada `/` (vista web + botón "Abrir EDAV Desktop 98") y `/?view=retro`
- [ ] `docs/seo-blog.md`: mejoras aplicadas a los 2 artículos; títulos con sufijo "| edav"
- [ ] `docs/seguridad-proxies.md`: elegir escenario Cloudflare/Traefik (se cierra en la Fase 8)
- [ ] CSP: revisar consola en todas las vistas y pasar `CSP_ENFORCE` a `true`
- [ ] Formulario: honeypot, 422 y envío SMTP real; escritorio completo en navegador

## Fase 3 — Arquitectura compartida, tokens e i18n

- [ ] 🟡 Derivar las cifras de `content/profile.ts` (decisión 10)

- [ ] 🟠 Árbol de rutas concreto (idioma × variante × caché) antes de tocar layouts
- [ ] 🟠 ARQ-02 / UI-02 Route groups con layouts propios y `data-theme`; eliminar `body:has()`
- [ ] 🟠 ARQ-05 / SEO-09 / A11Y-08 i18n: ES sin prefijo, EN bajo `/en/` con slugs traducidos, `lang` correcto, `content/ui.ts`, `content/routes.ts`
- [ ] 🟠 CNT-03 / COD-06 `/sobre-mi` y demás vistas desde `content/`; migrar `data/` → `content/`
- [ ] 🟠 UI-03 Tokens: base + temas `xp` y `classic` (264 hex, 52 sombras, 22 z-index a consolidar) · COD-11 · UI-12 CSS muerto
- [ ] 🟠 PERF-05 / COD-10 / UI-08 `next/font` en lugar de `@import`
- [ ] 🟠 SEO-02 / SEO-03 Helper `buildMetadata` (OG, canonical, alternates) e imagen social por defecto
- [ ] 🟠 DX-01 Tests (Vitest) + CI (GitHub Actions) + Renovate/Dependabot · DX-02 scripts
- [ ] 🟡 COD-03 `featured` · COD-04 duplicación · COD-05 código muerto · COD-12 README · UX-10 mezcla ES/EN
- [ ] 🟡 PERF-06 CSS único de 70 KB bloqueante · A11Y-13 contraste de texto

## Fase 4 — SO con ventanas

- [ ] 🟠 ARQ-03 Dividir `desktop-shell.tsx`; `lib/os/window-reducer.ts` puro
- [ ] 🟠 ARQ-04 / UX-04 URL ↔ ventana (`/os/proyectos/<slug>/`), proyectos como ventana
- [ ] 🟠 UI-01 Cromo XP Luna real (hoy es Windows 98)
- [ ] 🟠 A11Y-01 / A11Y-02 / UX-08 Ventanas `dialog` no modal, Menu Button, `toolbar`, foco al abrir y al cerrar, Escape
- [ ] 🟠 A11Y-06 Contenido tabulable detrás del boot y del selector
- [ ] 🟠 PERF-07 Arrastre sin re-renderizar el escritorio
- [ ] 🟠 UI-04 Escala de z-index · UI-05 rejilla móvil · UX-05 modo "XP Pocket"
- [ ] 🟡 A11Y-14 Alternativa al arrastre (mover/restablecer) · A11Y-11 / A11Y-12 / A11Y-15
- [ ] 🟡 UI-07 controles falsos · UI-09 / PERF-08 CRT desactivado por defecto · UI-10 iconos · UI-11 logo · UI-13 audio
- [ ] 🟡 COD-07 / COD-08 / COD-09 / PERF-09 límites server/client, `template.tsx`
- [ ] 🟡 UX-11 Descubribilidad · galería única con filtros y badges de crédito (lmilo con enlace, jdicans sin enlace)

## Fase 5 — Selector y `/classic`

- [ ] 🟠 UX-03 Selector estilo XP como overlay; elección en cookie (solo preferencia)
- [ ] 🟠 UI-03 `/classic` Y2K/web 2000s limpia (anexo 02)
- [ ] 🟠 `/os` con `noindex` justificado; páginas públicas indexables
- [ ] 🟡 A11Y-16 Preferencia leída · UX-06 botón flotante · UX-09 nombre en la cabecera
- [ ] 🟡 CNT-04 Servicios con URL propia

## Fase 6 — Mascotas

- [ ] 🟠 MAS-01 Reemplazar el Clippy actual por sprites de `clippyjs` (JSON + WebP, solo el agente elegido)
- [ ] 🟠 MAS-02 Textos bilingües · MAS-03 descarte persistente · MAS-04 live region moderada
- [ ] 🟠 UI-06 / A11Y-17 La mascota no tapa contenido ni el foco · MAS-07 z-index
- [ ] 🟡 MAS-06 Mover con teclado y sin arrastre · MAS-08 bus de eventos de ventanas · MAS-10
- [ ] 🟡 A11Y-07 Globo y notificaciones · búsqueda estilo Rover (ES/EN) · guion para reclutadores
- [ ] 🟠 MAS-11 Mitigaciones legales: crédito, sin marcas en SEO, interruptor de retirada, mascota propia de respaldo. Bonzi descartado
- [ ] 🟡 Confirmar plazo de respuesta "menos de 24 h" del guion

## Fase 7 — Pulido rendimiento / accesibilidad / SEO

- [ ] 🟠 PERF-03 Optimización de imágenes (quitar `unoptimized`, `sharp` en Docker)
- [ ] 🟠 SEO-07 Quitar FAQ plantillada · SEO-08 JSON-LD completo (Person `@id`, WebSite, BreadcrumbList)
- [ ] 🟠 SEO-10 `llms.txt` y `llms-full.txt` bilingües generados desde `content/`
- [ ] 🟠 Hreflang recíprocos y sitemap con alternates
- [ ] 🟡 SEO-11 robots · SEO-12 404 · SEO-13 autoría en The Brant · SEO-14 estado fijo
- [ ] 🟡 CNT-05 meta descriptions · CNT-06 títulos de posts · CNT-07 enlazado interno · CNT-09 keywords
- [ ] 🟡 CNT-08 Revisar si se autoriza nombrar el programa y el área de Servicios Nutresa
- [ ] 🟡 A11Y-09 pausa de movimiento · A11Y-10 formulario · PERF-10 / PERF-11 transiciones y caché

## Fase 8 — Despliegue y cierre

- [ ] 🟠 INF-07 Cloudflare Tunnel hacia HTTPS de Traefik; DNS-01 si 80/443 cerrados
- [ ] 🟠 SEC-01 Traefik `trustedIPs` o `CLIENT_IP_HEADER` verificados en el servidor real
- [ ] 🟡 INF-03 superficie del runtime · INF-04 · INF-08 HSTS a 1 año y luego `includeSubDomains`
- [ ] 🟡 DNS, SMTP, Last.fm y checklist del anexo 05

## Fuera de fases

- [ ] Perplexity MCP no instalado (opcional)
