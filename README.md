# EDAV Desktop 98

Portafolio profesional experimental de Emmanuel Dávila, construido con Next.js, TypeScript y una salida estática compatible con hosting cPanel. La portada funciona como un sistema operativo retro interactivo inspirado en Windows 98/XP y la estética Y2K.

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

El build genera la versión publicable en `out/`.

## Variables de entorno

Copia `.env.example` como `.env.local` y completa solo las variables necesarias. Nunca confirmes `.env.local` en Git.

- `LASTFM_API_KEY`: clave creada en la cuenta de API de Last.fm.
- `LASTFM_USERNAME`: `edav404` por defecto.
- `CONTACT_RECIPIENT`: correo que recibirá el formulario en producción.
- `NEXT_PUBLIC_LASTFM_ENDPOINT`: ruta pública del proxy PHP.
- `NEXT_PUBLIC_CONTACT_ENDPOINT`: ruta pública del formulario PHP.

Los secretos usados por PHP deben configurarse en el servidor; no deben incorporarse a los archivos publicados.

## Publicación en cPanel

1. Ejecuta `npm run build`.
2. Haz una copia de seguridad del sitio actual y valida el cambio primero en un subdominio de pruebas.
3. Sube el contenido de `out/` a `public_html`.
4. Configura `LASTFM_API_KEY`, `LASTFM_USERNAME` y `CONTACT_RECIPIENT` mediante el mecanismo de variables aprobado por el hosting.
5. Comprueba `/robots.txt`, `/sitemap.xml`, `/llms.txt`, el formulario y la integración con Last.fm.
6. Valida redirecciones desde las URLs antiguas antes de cambiar el dominio principal.

## Contenido

Los proyectos se administran en `data/projects.ts`. La identidad, servicios, testimonios y tecnologías se encuentran en `data/site.ts`.
## Last.fm en localhost

El frontend consulta `http://127.0.0.1:8787/api/lastfm.php` durante el desarrollo. En una terminal, ejecuta `npm run lastfm:dev` y, en otra, `npm run dev`. El proxy Node lee `LASTFM_API_KEY` y `LASTFM_USERNAME` desde `.env` sin enviarlos al navegador. En producción se puede utilizar `public/api/lastfm.php` desde un hosting con PHP.
