# Fase 1 — Auditoría de SEGURIDAD e INFRAESTRUCTURA/DESPLIEGUE

Rama: `fase/1-auditoria` · Commit base: `51c8f55` · Fecha: 2026-11-20 · Modo: solo lectura.

Leyenda: **[V]** = hecho verificado en el código, comandos o documentación local de Next. **[S]** = suposición o comportamiento de terceros (Traefik, Coolify, Cloudflare) que hay que confirmar en el servidor real (Fase 8).

---

## 0. Resumen ejecutivo

La base es sólida para un portafolio. La validación del formulario es correcta, no hay inyección de cabeceras en el correo, el cuerpo de la petición tiene límite de tamaño real, el JSON-LD está escapado, el historial de git está limpio de secretos, `npm audit` da 0 vulnerabilidades y la imagen corre sin root con HEALTHCHECK. Los riesgos reales son de **configuración**:

1. **La forma de obtener la IP del cliente se rompe con Cloudflare (proxy o Tunnel) si Traefik no confía en el salto anterior.** Con la configuración que documenta `.env.example` (`TRUSTED_PROXY_HOPS=2`), todos los visitantes pueden acabar en un único bucket (`"untrusted-chain"` o la IP de cloudflared/Cloudflare). Basta un usuario para dejar el formulario y Last.fm en 429 para todos.
2. **Falta la CSP.** Abajo va una CSP estática concreta, compatible con la generación estática de Next 16, con Last.fm y con las mascotas (sprites y audio, incluidos los `data:` de ClippyJS).
3. `.dockerignore` no excluye `private/` ni los archivos no `.ts` de `content/` (hay material privado local en ambos). En un `docker build` local entran al contexto de build.
4. HSTS corto (correcto por ahora), con un plan de ampliación para la Fase 8.
5. Higiene de la imagen: fijar el digest, cachear `.next/cache`, actualizar la imagen base (Renovate o Dependabot) y quitar npm del runtime (opcional).

---

## 1. Hallazgos

### SEC-01 · importante · Resolución de IP del cliente frágil detrás de Cloudflare (proxy o Tunnel)
- **Evidencia [V]:** `lib/server/rate-limit.ts:51-65` toma la IP N-ésima desde el final de `X-Forwarded-For` (N = `TRUSTED_PROXY_HOPS`). Si la cadena es más corta que N devuelve la constante `"untrusted-chain"` (línea 61). `.env.example:9-10` y `docs/despliegue-coolify.md:48` indican "Con Cloudflare delante = 2". `docs/despliegue-coolify.md:79` dice que se usa el "último" valor, lo que solo es cierto con N=1.
- **Comportamiento de Traefik [S, documentado por Traefik, hay que verificarlo en Coolify]:** si la IP del salto anterior **no** está en `entryPoints.<ep>.forwardedHeaders.trustedIPs` (y `insecure` no está activo), Traefik **descarta** el `X-Forwarded-For` entrante y escribe solo la IP que ve.
- **Impacto por escenario:**

| Escenario | XFF que llega a la app | `HOPS=1` | `HOPS=2` |
|---|---|---|---|
| A. Cliente → Traefik → app | `cliente` | ✅ IP real | ❌ `untrusted-chain` (bucket único) |
| B. Cliente → Cloudflare (nube naranja) → Traefik **sin** trustedIPs de CF | `IP_edge_CF` | ⚠️ IP del edge de CF (compartida por muchos usuarios) | ❌ `untrusted-chain` |
| B'. Igual, **con** rangos de CF en `trustedIPs` | `[falsas,] cliente, IP_edge_CF` | ❌ IP de CF | ✅ IP real |
| C. Cliente → CF → **Tunnel (cloudflared)** → Traefik **sin** trustedIPs | `IP_cloudflared` (red Docker/loopback) | ❌ todos = cloudflared | ❌ `untrusted-chain` |
| C'. Igual, con la red de cloudflared en `trustedIPs` | `[falsas,] cliente, IP_cloudflared` | ❌ cloudflared | ✅ IP real |
| D. Tunnel apuntando directo al contenedor (sin Traefik) | `[falsas,] cliente` (lo pone cloudflared) | ✅ IP real | ❌ / falsificable |

  En los casos ❌ con bucket único, 5 envíos cada 10 minutos (contacto) o 30 por minuto (Last.fm) bloquean a **todos** los visitantes.
- **Fix propuesto (Fase 2 el código, Fase 8 la configuración):**
  1. Añadir la variable `CLIENT_IP_HEADER` (valores: `x-forwarded-for` por defecto, o `cf-connecting-ip`). Con `cf-connecting-ip` se lee `CF-Connecting-IP`, que Cloudflare siempre sobrescribe en su edge. Solo es seguro si el origen **no** es alcanzable sin pasar por Cloudflare: Tunnel con 80/443 cerrados al público, o firewall que solo admite los rangos de CF.
  2. Registrar un aviso (una sola vez) cuando la clave sea `untrusted-chain` o `unknown`, para detectar la mala configuración en los logs de Coolify.
  3. Corregir `.env.example` y `docs/despliegue-coolify.md` con la tabla anterior. Recomendación por escenario:
     - **A (solo Coolify/Traefik):** `TRUSTED_PROXY_HOPS=1`.
     - **B (CF proxy sin tunnel):** `CLIENT_IP_HEADER=cf-connecting-ip` + firewall (ufw o iptables) que solo admita los rangos de Cloudflare en 80/443. Alternativa: `trustedIPs` de Traefik con los rangos de CF y `HOPS=2`.
     - **C (Tunnel → Traefik):** `CLIENT_IP_HEADER=cf-connecting-ip` y los puertos 80/443 cerrados al exterior. Alternativa: `trustedIPs` con la subred de cloudflared y `HOPS=2`.
  4. Opcional: agrupar IPv6 por /64 en la clave del limitador (un atacante IPv6 rota direcciones dentro de su /64).
- **Esfuerzo:** S (código) + S (configuración en el servidor).

### SEC-02 · importante · No hay Content-Security-Policy
- **Evidencia [V]:** `next.config.ts:3-11` no incluye CSP. El comentario lo pospone. No existe `proxy.ts` (el antiguo middleware).
- **Contexto Next 16 [V, `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`]:**
  - Una CSP con **nonce** exige `proxy.ts` y **renderizado dinámico en todas las páginas**. Desactiva la generación estática e ISR, y es incompatible con PPR.
  - Sin nonce, la guía propone una CSP estática en `next.config` con `'unsafe-inline'` en `script-src` y `style-src`.
  - Existe `experimental.sri`, que añade hashes a los scripts externos. Es experimental, y no está verificado que cubra los scripts inline de hidratación (`self.__next_f.push`) [S].
  - `'unsafe-eval'` solo hace falta en desarrollo.
- **Inventario que condiciona la CSP [V]:**
  - El JSON-LD se inyecta como `<script type="application/ld+json">` (`components/ui.tsx:44`). Es un bloque de datos que el navegador no ejecuta, así que `script-src` no le afecta.
  - Las portadas de Last.fm llegan en `<img>` directo (`components/music-widget.tsx:34`).
  - `next/image` funciona con `images.unoptimized: true`, así que todo sale del propio origen.
  - El sprite de mascota es local: `public/images/edav-clippy-sprites.png`.
  - framer-motion usa atributos `style` inline, que requieren `'unsafe-inline'` en `style-src`.
  - No hay fuentes, iframes ni scripts de terceros.
- **CSP propuesta (estática, en `next.config.ts` → `headers()`):** el portafolio es casi todo estático y no maneja datos sensibles de usuarios, así que el coste del nonce (todo dinámico) no compensa.

```ts
const isDev = process.env.NODE_ENV === "development";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Portadas de Last.fm (CDN de Fastly). Mantener en sincronía con la allowlist de lib/server/lastfm.ts.
  "img-src 'self' data: blob: https://lastfm.freetls.fastly.net",
  // Mascotas: audio propio; ClippyJS empaqueta los sonidos como data: URI (sounds-mp3.js).
  "media-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",          // /api/lastfm/, /api/contact/, fetch de sprites/audio propios
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");
```

  - **Despliegue gradual:** en la Fase 2 empezar con `Content-Security-Policy-Report-Only`. Revisar la consola en `/`, `/os`, `/classic`, `/proyectos/[slug]` y `/contacto`, y después pasar a `Content-Security-Policy`. Volver a revisarla en la Fase 6 al integrar las mascotas: si se usa Web Audio con `fetch` de archivos propios, ya está cubierto por `connect-src 'self'`; si se carga algo desde un CDN, se añade su host explícitamente y nunca `https:` genérico.
  - **Si más adelante se quiere quitar `'unsafe-inline'` de `script-src`:** probar `experimental.sri` en una rama y comprobar que no aparecen violaciones. Si los scripts inline siguen bloqueados, la única vía es el nonce con `proxy.ts` y renderizado dinámico. No se recomienda en este proyecto.
  - Añadir también `Cross-Origin-Opener-Policy: same-origin` (no afecta a nada del sitio). Mantener `X-Frame-Options: DENY`, que es redundante con `frame-ancestors` pero útil para navegadores antiguos.
- **Fix complementario en `lib/server/lastfm.ts:51`:** hoy acepta cualquier `https://`. Conviene usar una allowlist de hosts (`lastfm.freetls.fastly.net`) que coincida con la CSP. Así una portada de otro host se descarta en el servidor y no aparece como imagen rota.
- **Fase destino:** 2 (Report-Only y luego enforce), 6 (revisión por mascotas), 7 (si se activa la optimización de imágenes con `remotePatterns`). **Esfuerzo:** S–M.

### SEC-03 · menor · El formulario de contacto no comprueba el origen (CSRF/spam desde otros sitios)
- **Evidencia [V]:** `app/api/contact/route.ts:55-60` acepta `multipart/form-data` y `x-www-form-urlencoded`, que son "simple requests" en CORS. Cualquier web puede hacer un POST desde el navegador del visitante. No hay sesión, así que no es un CSRF clásico, pero permite usar navegadores ajenos para enviar spam con IPs distintas (el límite global de 40/h lo acota).
- **Fix:** rechazar con 403 si `Sec-Fetch-Site` existe y vale `cross-site`, o si `Origin` existe y no coincide con `NEXT_PUBLIC_SITE_URL`. **Fase 2 · S.**

### SEC-04 · verificado OK · Validación de entrada y cabeceras del correo
- **[V]** `route.ts:41-53` elimina caracteres de control y CR/LF en los campos de una línea. `service` se valida contra una lista blanca (línea 80). El asunto no contiene datos del usuario salvo `service`, que ya está en la lista blanca (línea 94). `replyTo` pasa por `EMAIL_RE` (`lib/server/mailer.ts:4`), que excluye espacios, `<>`, `,`, `;`, `:` y comillas, y además nodemailer codifica las cabeceras. **No hay inyección de cabeceras.**
- **[V]** El cuerpo se lee con un límite real de 20 KB sin fiarse de `Content-Length` (`route.ts:17-39`). El honeypot está en la línea 75. La configuración SMTP se valida una vez y se exige TLS: `requireTLS` cuando `secure=false` (`mailer.ts:58-59`), con timeouts definidos. El error SMTP se registra sin credenciales (`route.ts:99`).
- **Mejora menor:** el límite global (`route.ts:90`) se consume también si `sendMail` falla. Es aceptable.

### SEC-05 · menor · El rate limiter en memoria acepta inundar claves
- **[V]** `rate-limit.ts:26-30` expulsa las claves más antiguas al superar 10 000. Un atacante que rote muchas IPs (sobre todo IPv6) puede expulsar entradas y saltarse el límite por IP. El límite global del contacto sigue protegiendo el SMTP. Es válido para una sola réplica, como ya documenta el código.
- **Fix:** agrupar IPv6 por /64 (ver SEC-01). **Fase 2 · S.**

### SEC-06 · menor · `/api/health` expone el uptime
- **[V]** `app/api/health/route.ts:6`. Revela cuándo se reinició el proceso. El riesgo es bajo. Opción: devolver solo `{status:"ok"}`, o dejarlo así deliberadamente. Para el healthcheck de Docker no hace falta el uptime. **Fase 2 · S.**

### SEC-07 · verificado OK · JSON-LD y enlaces externos
- **[V]** `components/ui.tsx:44` escapa `<` como `<` dentro del JSON-LD. El contenido sale del repositorio y no del usuario. Es correcto.
- **[V]** Todos los `target="_blank"` llevan `rel="noreferrer"`, que implica `noopener` (`app/ahora/page.tsx:9`, `app/contacto/page.tsx:9`, `components/footer.tsx:16`, `components/music-widget.tsx:33,45`). La URL de pista de Last.fm se fuerza a `https://` (`lib/server/lastfm.ts:52`), así que no puede llegar un `javascript:`. No hay `eval`, `new Function`, `innerHTML` ni `window.open`.
- **Regla para la Fase 4 (ventanas) y la Fase 6 (mascotas):** cualquier enlace o `window.open` nuevo debe llevar `noopener,noreferrer`, y no se debe usar `dangerouslySetInnerHTML` para los globos de las mascotas.

### SEC-08 · verificado OK · Secretos en el repositorio y en el historial
- **[V]** `git log --all -p` (8 commits) filtrado por `api_key|password|token|secret|Bearer|-----BEGIN|AKIA|ghp_|sk-` y por hex de 32 caracteres: sin coincidencias reales (solo hashes de commit y nombres de variables). Nunca se ha versionado un `.env` (solo `.env.example`, con valores vacíos). `scripts/lastfm-proxy.mjs`, ya borrado, leía la clave de `env`.
- **[V]** `.gitignore` cubre `.env*`, `/private/` y lo que no sea `.ts` en `content/`. En local existen `.env`, `.env.local`, `private/` y dos documentos privados en `content/`, todos ignorados (no se leyó su contenido).
- **Menor:** `.claude/` está parcialmente versionado (skills). Conviene ignorar de forma explícita `.claude/settings.local.json` y `.agents/` para evitar commits accidentales. **Fase 2 · S.**
- **Menor:** la carpeta local `WordPress/` está vacía y no se ignora. Si se rellena, aparecerá en `git status`. Añadirla a `.gitignore` (ya está en `.dockerignore`).

### SEC-09 · verificado OK · Dependencias
- **[V]** `npm audit` → `found 0 vulnerabilities` (con y sin `--omit=dev`). Next 16.4.6 ya incluye las correcciones de RCE (commit `a4cb6da`).
- **Recomendación:** activar Dependabot o Renovate para `npm` y `docker` (no existe `.github/`). **Fase 2 · S.**

### INF-01 · importante · `.dockerignore` no excluye material privado
- **Evidencia [V]:** `.dockerignore` no excluye `private` ni los archivos no `.ts` de `content/` (`.gitignore` sí lo hace). El `Dockerfile:20` hace `COPY . .`. En un `docker build` local (`docs/despliegue-coolify.md:82`), los documentos privados de `private/` y `content/*.html|*.md` entran al contexto y a la capa del stage `builder`. No llegan a la imagen final, porque el runner solo copia `public`, `.next/standalone` y `.next/static`, pero quedan en la caché de build local. En Coolify no ocurre porque clona desde git.
- **Fix:** añadir `private`, `content/*` + `!content/*.ts`, `tsconfig.tsbuildinfo` (ya está), `.vscode` y `coverage`. **Fase 2 · S.**

### INF-02 · menor · Caché de build y reproducibilidad de la imagen
- **[V]** `Dockerfile:5` fija la etiqueta `24.22.3-alpine3.24`, pero no el digest. `Dockerfile:21` hace `npm run build` sin caché de `.next/cache`, así que cada despliegue compila desde cero. La caché de npm sí está montada (línea 11).
- **Fix:**
  - `RUN --mount=type=cache,target=/app/.next/cache npm run build`.
  - Fijar `node:24.22.3-alpine3.24@sha256:…` y dejar que Renovate actualice tag y digest.
  - Verificar en el servidor que Coolify construye con BuildKit, necesario para `--mount` y `# syntax=` [S].
- **Fase 2 (Dockerfile) / Fase 8 (verificación) · S.**

### INF-03 · menor · Superficie del runtime
- **[V]** El runner usa `node:alpine` completo, con npm, corepack y yarn incluidos. Usuario `nextjs` (uid 1001) sin root ✅. Archivos con `chown` al mismo usuario, que por tanto podría reescribir su propio código. Es mejor que sean de root y de solo lectura para la app.
- **Fix opcional:**
  - Copiar sin `--chown` (propietario root, legibles por todos).
  - Borrar npm del runner: `rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /opt/yarn*`. O migrar a `gcr.io/distroless/nodejs24-debian12:nonroot`, aunque entonces el HEALTHCHECK con `wget` no funciona y habría que usar `node -e "fetch(...)"`.
  - En Coolify: activar "read-only root filesystem" si lo ofrece [S]. Next standalone no necesita escribir, salvo en `.next/cache` si hubiera ISR, y aquí no lo hay.
- **Fase 8 · S.**

### INF-04 · verificado OK, con un matiz · Señales y apagado
- **[V]** `server.js` de standalone llama a `startServer` (`node_modules/next/dist/build/utils.js:1213`), que registra `SIGINT` y `SIGTERM` (`start-server.js:377-379`) y sale con 143. Node como PID 1 recibe la señal correctamente porque el `CMD` está en formato exec. No se lanzan procesos hijos, así que no hace falta `tini`.
- **Matiz [V]:** la limpieza no espera a que terminen las peticiones en curso (`process.exit` inmediato). Un envío SMTP en marcha durante un redeploy podría cortarse. Coolify arranca el contenedor nuevo y espera al healthcheck antes de parar el viejo, lo que minimiza el problema [S]. Es aceptable.
- **Opcional [S]:** la mantención de conexiones por defecto de Node (5 s) es más corta que el `idleConnTimeout` de Traefik (90 s), lo que puede producir 502 esporádicos. Si aparecen en los logs, definir `KEEP_ALIVE_TIMEOUT=65000` (lo lee `build/utils.js:1207`).

### INF-05 · verificado OK · Healthcheck
- **[V]** `Dockerfile:39-40` usa el `wget` de busybox (presente en alpine) contra `127.0.0.1:3000/api/health/`. La barra final coincide con `trailingSlash: true`, así que no hay redirección 308. La ruta usa `connection()`, por lo que es dinámica y no se prerenderiza.
- **[S]** El healthcheck de la interfaz de Coolify, si se activa, sustituye al del Dockerfile y usa curl o wget dentro del contenedor. Alpine no trae curl. Verificar que Coolify recurre a wget o dejar solo el HEALTHCHECK del Dockerfile.

### INF-06 · verificado OK · `NEXT_PUBLIC_SITE_URL` en build y en runtime
- **[V]** Se lee en `data/site.ts:11`, que importan componentes cliente (`components/music-widget.tsx:7`) y páginas estáticas (`robots.ts`, `sitemap.ts` y metadata). Por tanto **se fija en el build**: cambiarlo en runtime no tiene efecto. El `Dockerfile:17-18` declara `ARG` con valor por defecto `https://edav.com.co`, así que el build es correcto aunque Coolify no pase la variable.
- **Consecuencia:** los despliegues de preview tendrán canonical y sitemap apuntando a producción, lo cual es deseable para SEO. Para cambiar de dominio hay que **reconstruir** la imagen, no basta con reiniciar. Hay que documentarlo en la Fase 8. En Coolify debe marcarse como "Build Variable" (ya documentado en `docs/despliegue-coolify.md:42`).

### INF-07 · importante (si se usa Tunnel) · Redirección www→apex y HTTPS con Cloudflare Tunnel
- **[V]** La documentación delega la redirección www→apex en Coolify ("Redirect to non-www", `docs/despliegue-coolify.md:32`), es decir, en un middleware de Traefik.
- **[S] Riesgos con Tunnel:**
  1. Si el Tunnel apunta directo al contenedor (escenario D), Traefik queda fuera: no hay redirección www ni redirección a HTTPS. Hay que crear una *Redirect Rule* en Cloudflare (`www.edav.com.co/*` → `https://edav.com.co/${1}`, 301) y activar "Always Use HTTPS".
  2. Si el Tunnel apunta a `http://traefik:80` y en Coolify el dominio es `https://…`, Traefik redirige a HTTPS y se produce un bucle (`ERR_TOO_MANY_REDIRECTS`). Opciones: apuntar el Tunnel a `https://localhost:443` con `originServerName: edav.com.co` (o `noTLSVerify`), o declarar el dominio como `http://` en Coolify y dejar el TLS a Cloudflare.
  3. Con Tunnel, Let's Encrypt (HTTP-01) no puede validar si 80/443 están cerrados. Usar DNS-01 o el TLS de Cloudflare.
- **Fix:** añadir a `docs/despliegue-coolify.md` una sección "Escenario Cloudflare Tunnel" con estos tres puntos y la tabla de SEC-01. **Fase 8 · S.**

### INF-08 · menor · HSTS corto: plan de ampliación
- **[V]** `next.config.ts:10` usa `max-age=86400` sin `includeSubDomains`. Es correcto mientras no se hayan verificado los subdominios.
- **Plan para la Fase 8:**
  1. Inventariar los subdominios de `edav.com.co` en DNS (incluidos los de correo, como `mail.` o `autodiscover.`, los de Coolify, como `coolify.`, y los de pruebas).
  2. Comprobar que todos sirven HTTPS válido.
  3. Subir a `max-age=31536000` (1 año).
  4. Añadir `includeSubDomains` solo después del paso 2.
  5. `preload` (requiere `max-age` ≥ 63072000 e `includeSubDomains`) solo si se acepta que no hay vuelta atrás rápida.
- **Ojo:** con Cloudflare se puede activar también HSTS en su panel. No duplicar valores contradictorios; elegir una sola fuente (preferiblemente `next.config.ts`, versionado).

### INF-09 · menor · Logs
- **[V]** Solo hay `console.error` en SMTP (`route.ts:99`) y en la configuración del mailer (`mailer.ts:48`). No hay log de peticiones ni de 429. Coolify muestra el stdout del contenedor.
- **Fix:**
  - Registrar los 429 del contacto y los `untrusted-chain`, con IP truncada para no guardar datos personales completos.
  - **[S]** Verificar la rotación de logs de Docker en el servidor (`/etc/docker/daemon.json` → `"log-opts": {"max-size":"10m","max-file":"3"}`). Sin ella, `json-file` crece sin límite.
- **Fase 2 (logs) / Fase 8 (rotación) · S.**

### INF-10 · menor · Documentación desalineada
- **[V]** `docs/despliegue-coolify.md:79` habla del "último" valor de XFF (solo cierto con HOPS=1). `:48` y `.env.example:9` dan "Cloudflare = 2" sin la condición de `trustedIPs`. `:22-23` describe Cloudflare con nube naranja, pero no el Tunnel.
- **Fix:** reescribir esas secciones con SEC-01 e INF-07. **Fase 2/8 · S.**

### INF-11 · no aplica · Backups
Sin base de datos ni estado persistente: todo el contenido está en git y la configuración en las variables de Coolify. Solo conviene **exportar y guardar fuera del servidor las variables de entorno de Coolify** (SMTP_PASS, LASTFM_API_KEY), ya que no están en el repo.

### Notas varias verificadas
- `allowedDevOrigins` incluye `*.trycloudflare.com` (`next.config.ts:23`). Solo afecta a `next dev` y es aceptable. No dejar túneles de desarrollo abiertos.
- `images.unoptimized: true` hace que no exista el endpoint `/_next/image` y elimina esa superficie de DoS. Si se activa en la Fase 7, usar `remotePatterns` estrictos (solo el host de Last.fm).
- Las rewrites `/api/*.php` (`next.config.ts:28-31`) son internas y no introducen riesgo.
- `/cv/[file]` es estático con `dynamicParams=false` (`app/cv/[file]/route.ts:8-9`): no hay path traversal.
- La respuesta 429 de `/api/lastfm` no lleva `Cache-Control: no-store` (`app/api/lastfm/route.ts:11`). Es menor: un CDN no la cachea por defecto, pero conviene añadirlo por coherencia.

---

## 2. Checklist de verificación en el servidor real (Fase 8)

**Red e IP del cliente**
- [ ] Decidir el escenario (A, B, C o D de SEC-01) y documentarlo.
- [ ] Inspeccionar la configuración del proxy de Coolify: `forwardedHeaders.insecure` o `trustedIPs` en los entrypoints `http` y `https`.
- [ ] Prueba empírica: con un log temporal de la IP calculada, hacer peticiones desde dos redes distintas (móvil y fijo) y confirmar dos claves diferentes y distintas de `untrusted-chain`, `unknown` y la IP de cloudflared o Cloudflare.
- [ ] Prueba de falsificación: `curl -H "X-Forwarded-For: 1.2.3.4" -H "CF-Connecting-IP: 1.2.3.4" https://edav.com.co/api/lastfm/` no debe hacer que la clave sea `1.2.3.4`.
- [ ] El puerto 3000 no está publicado: `docker ps` sin `0.0.0.0:3000` y `ss -tlnp | grep 3000` vacío en la interfaz pública.
- [ ] Con Tunnel: 80/443 cerrados al exterior (o solo rangos de CF) en ufw y en el firewall del proveedor. Recordar que Docker se salta ufw con los puertos publicados.

**TLS, redirecciones y cabeceras**
- [ ] `curl -I http://edav.com.co/` → 301/308 a https.
- [ ] `curl -I https://www.edav.com.co/` → 301/308 a `https://edav.com.co/`, sin bucles.
- [ ] El certificado es válido para apex y www (Let's Encrypt o Cloudflare Full (strict)).
- [ ] Cabeceras presentes: CSP (o Report-Only), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, sin `X-Powered-By`. Que no estén duplicadas por Traefik o Cloudflare.
- [ ] Consola del navegador sin violaciones de CSP en `/`, `/os`, `/classic`, `/proyectos/<slug>/`, `/contacto/`, el widget de Last.fm y las mascotas (con sonido).
- [ ] Inventario de subdominios con HTTPS válido y, después, HSTS a 1 año + `includeSubDomains`.

**Contenedor**
- [ ] `docker inspect` → `User` = `nextjs`/1001 y estado del healthcheck `healthy`.
- [ ] Redeploy sin downtime: Coolify espera al healthcheck antes de parar el contenedor viejo.
- [ ] `docker stop` termina en menos de 10 s con código 143 (SIGTERM atendido).
- [ ] BuildKit activo en los builds de Coolify (la directiva `# syntax=` y los `--mount=type=cache` funcionan).
- [ ] Memoria y swap suficientes para `next build` (2 GB + 2 GB de swap, según la documentación).
- [ ] Rotación de logs de Docker configurada.
- [ ] Coolify y Traefik actualizados. Hay un plan de actualización de la imagen base (Renovate o Dependabot, o revisión mensual).

**Integraciones**
- [ ] SMTP: envío real desde `/contacto/`, el correo llega, `Reply-To` correcto, SPF/DKIM/DMARC en `pass` (revisar las cabeceras del correo recibido).
- [ ] Rate limit: el 6.º envío en 10 minutos devuelve 429 con `Retry-After`, y desde otra IP se sigue pudiendo enviar.
- [ ] Last.fm: `/api/lastfm/` devuelve JSON y la portada carga (host permitido en la CSP).
- [ ] Variables secretas solo en Coolify (no en build args visibles en los logs de build). `NEXT_PUBLIC_SITE_URL` marcada como Build Variable.
- [ ] Copia de las variables de entorno de Coolify guardada fuera del servidor.

---

## 3. Tabla resumen

| ID | Severidad | Fase | Esfuerzo | Título |
|---|---|---|---|---|
| SEC-01 | importante | 2 + 8 | S | IP del cliente frágil con Cloudflare (proxy/Tunnel); TRUSTED_PROXY_HOPS=2 puede crear un bucket único |
| SEC-02 | importante | 2, 6, 7 | S–M | Falta CSP: CSP estática propuesta compatible con Next 16, Last.fm y mascotas |
| INF-01 | importante | 2 | S | `.dockerignore` sin `private/` ni `content/*` no-ts |
| INF-07 | importante (con Tunnel) | 8 | S | www→apex, HTTPS y bucles de redirección con Cloudflare Tunnel |
| SEC-03 | menor | 2 | S | Sin comprobación de Origin/Sec-Fetch-Site en `/api/contact` |
| SEC-05 | menor | 2 | S | Inundación de claves del limitador (IPv6 /64) |
| SEC-06 | menor | 2 | S | `/api/health` expone el uptime |
| SEC-08 | menor | 2 | S | Ignorar `.claude/settings.local.json`, `.agents/` y `WordPress/` en git |
| SEC-09 | menor | 2 | S | Activar Renovate/Dependabot (npm + docker) |
| INF-02 | menor | 2/8 | S | Caché `.next/cache` y pin por digest |
| INF-03 | menor | 8 | S | Runtime sin npm y archivos de propiedad root |
| INF-04 | menor | 8 | S | Apagado sin drenaje; KEEP_ALIVE_TIMEOUT opcional |
| INF-08 | menor | 8 | S | Plan HSTS |
| INF-09 | menor | 2/8 | S | Logs de 429 y rotación de logs de Docker |
| INF-10 | menor | 2/8 | S | Documentación de proxy desalineada |
| SEC-04, SEC-07, INF-05, INF-06 | OK | — | — | Validación/correo, JSON-LD/enlaces, healthcheck y variable de build verificados |
