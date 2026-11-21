# syntax=docker/dockerfile:1.7
# Imagen de producción para Coolify (Ubuntu Server). Next.js en modo standalone.
# Requiere BuildKit (Coolify lo usa por defecto) por los `RUN --mount=type=cache`.

# Node 24 LTS (igual que `.nvmrc` y `engines`). Etiqueta + digest para builds reproducibles:
# al actualizar, cambiar ambos (`docker buildx imagetools inspect node:<etiqueta>` da el digest).
ARG NODE_IMAGE=node:24.22.3-alpine3.24@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5

# 1) Dependencias (capa cacheable mientras no cambie el lockfile)
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --loglevel=error

# 2) Build
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Variables públicas: se incrustan en el bundle en tiempo de build.
ARG NEXT_PUBLIC_SITE_URL=https://edav.com.co
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# La caché de Next (.next/cache) persiste entre despliegues en la caché de BuildKit del servidor;
# no entra en la imagen. `next build` sin caché sigue funcionando (solo tarda más).
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# 3) Runtime mínimo, usuario sin privilegios
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
# Logs: la app escribe en stdout/stderr (Coolify los muestra); la rotación es del daemon de Docker
# en el servidor (ver docs/despliegue-coolify.md). npm no interviene en el arranque.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health/ >/dev/null || exit 1

CMD ["node", "server.js"]
