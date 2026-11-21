# EDAV Desktop 98

Portafolio profesional experimental de Emmanuel Dávila, construido con Next.js 16 y TypeScript, desplegado como contenedor Docker en Coolify (`edav.com.co`). La portada funciona como un sistema operativo retro interactivo inspirado en Windows 98/XP y la estética Y2K.

## Experiencia principal

- Secuencia de arranque BIOS opcional.
- Escritorio responsive con iconos, menú Inicio y barra de tareas.
- Gestor de ventanas con foco, arrastre, minimizar, maximizar y cerrar.
- Selector persistente entre EDAV Desktop 98 y una vista web convencional más accesible.
- Explorador de los 13 proyectos, terminal funcional y asistente de servicios.
- ED Assistant animado, arrastrable y contextual para formularios, terminal y errores 404.
- Reproductor conectado a Last.fm, notificaciones, sonido opcional y shader CRT WebGL.
- Adaptación móvil como launcher, accesibilidad por teclado y reducción de movimiento.

## Desarrollo local

Requisitos: Node.js 24 o superior y npm.

```powershell
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Validación

```powershell
npm run lint
npm run typecheck
npm run build
```

El build genera un servidor autocontenido en `.next/standalone/` (Next.js `output: "standalone"`).

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

Los proyectos se administran en `data/projects.ts`. La identidad, servicios, testimonios y tecnologías se encuentran en `data/site.ts`.
