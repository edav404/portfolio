# EDAV Desktop 98

Portafolio profesional experimental de Emmanuel Dávila, construido con Next.js 16 y TypeScript, desplegado como contenedor Docker en Coolify (`edav.com.co`). La portada funciona como un sistema operativo retro interactivo inspirado en Windows 98/XP y la estética Y2K.

## Experiencia principal

- Secuencia de arranque BIOS opcional.
- Escritorio responsive con iconos, menú Inicio y barra de tareas.
- Gestor de ventanas con foco, arrastre, minimizar, maximizar y cerrar.
- Portada web accesible con contenido real; EDAV Desktop 98 se abre bajo demanda.
- Explorador de proyectos, terminal funcional y asistente de servicios.
- ED Assistant animado, arrastrable y contextual para formularios, terminal y errores 404.
- Reproductor conectado a Last.fm, notificaciones, sonido opcional y shader CRT WebGL.
- Adaptación móvil como launcher, accesibilidad por teclado y reducción de movimiento.

## Desarrollo local

Requisitos:

- Node.js 24 (la versión de `.nvmrc`; `nvm use` o `fnm use` la selecciona) y npm.
- Solo para construir la imagen: Docker con BuildKit (el `Dockerfile` usa `RUN --mount=type=cache`).

```powershell
npm ci
npm run dev
```

Abre `http://localhost:3000`.

### Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` / `npm start` | Build de producción (servidor autocontenido en `.next/standalone/`) y arranque. |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` (genera los tipos de rutas antes de comprobar). |
| `npm run lint` | ESLint (`eslint-config-next`). |
| `npm test` | Tests unitarios con Vitest, una sola pasada. |
| `npm run test:watch` | Vitest en modo observación. |
| `npm run check` | `typecheck` + `lint` + `test`: lo mínimo antes de subir cambios. |

### Tests

Viven en `tests/` (`*.test.ts`) y cubren lógica pura: rate limit e IP del cliente, la comprobación de
mismo origen, la resolución de servicios del formulario, las redirecciones de WordPress, la integridad
de los posts y el sitemap. La configuración está en `vitest.config.mts` (alias `@/` y un sustituto de
`server-only`). No renderizan componentes: para eso harían falta tests E2E.

### Integración continua

`.github/workflows/ci.yml` ejecuta typecheck, lint, tests y `next build` en cada push y PR a `main` y a
las ramas `fase/**`. Dependabot (`.github/dependabot.yml`) propone cada semana las actualizaciones
minor/patch de npm agrupadas; los majors de Next, React, ESLint y TypeScript se hacen a mano.

## Variables de entorno

Copia `.env.example` como `.env.local` y completa solo lo necesario. Nunca confirmes `.env.local` en Git.
Con `npm run dev`, Last.fm (`/api/lastfm/`) y el formulario (`/api/contact/`) funcionan directamente como Route Handlers; no hace falta un proxy aparte.

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL canónica del sitio (build). |
| `LASTFM_API_KEY`, `LASTFM_USERNAME` | Reproductor EDAV.FM. |
| `CONTACT_RECIPIENT`, `SMTP_*` | Envío del formulario de contacto por SMTP. |

## Despliegue

Producción: **Ubuntu Server + Coolify** con el `Dockerfile` de la raíz. Guía paso a paso en
[`docs/despliegue-coolify.md`](docs/despliegue-coolify.md).

```powershell
docker build -t edav-portfolio .
docker run -p 3000:3000 --env-file .env.local edav-portfolio
```

## Contenido

Todo el contenido vive en `content/` (bilingüe ES/EN): proyectos en `content/projects.ts`, perfil, contacto y tecnologías en `content/profile.ts`, servicios y testimonios en `content/services.ts`, artículos en `content/posts.ts`, datos del sitio y CV en `content/site.ts`, y cifras derivadas en `content/stats.ts`. Guía editorial en `docs/contenido.md`.
