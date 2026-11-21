# Despliegue en Coolify (Ubuntu Server) — edav.com.co

El proyecto se despliega como **contenedor Docker** usando el `Dockerfile` de la raíz
(Next.js `output: "standalone"`, Node 24 LTS, usuario sin privilegios, `HEALTHCHECK` en `/api/health/`).

La versión de Node se declara en tres sitios que deben ir a la par: `.nvmrc` (`24`), `engines` de
`package.json` (`>=24`) y la imagen base del `Dockerfile` (etiqueta + digest). En local sirve cualquier
Node ≥ 24; producción corre siempre la versión fijada en la imagen.

## 1. Requisitos del servidor

| Recurso | Mínimo recomendado | Nota |
|---|---|---|
| RAM | 2 GB (+ swap 2 GB) | `next build` corre dentro del servidor; sin swap puede fallar por memoria. |
| Disco | 10 GB libres | Capas de imagen, caché de BuildKit (npm y `.next/cache`) y logs. |
| Docker | BuildKit activo | Coolify lo usa por defecto; el `Dockerfile` lo necesita (`RUN --mount=type=cache`). |
| Puertos | 80 y 443 abiertos | Los gestiona el proxy de Coolify (Traefik/Caddy). |

## 2. DNS (en el proveedor de `edav.com.co`)

| Tipo | Nombre | Valor |
|---|---|---|
| A | `@` | IP pública del servidor |
| A | `www` | IP pública del servidor |
| AAAA | `@` / `www` | IPv6 del servidor (solo si la tiene) |

Si el dominio está detrás de Cloudflare, usar el modo **DNS only** (nube gris) hasta que Coolify emita
el certificado de Let's Encrypt; luego puede activarse el proxy con SSL en modo **Full (strict)**.
Con **Cloudflare Tunnel** no hacen falta registros A/AAAA (el túnel crea los CNAME) y los puertos 80/443
pueden cerrarse al exterior; el detalle de cada montaje está en [`seguridad-proxies.md`](./seguridad-proxies.md).

## 3. Crear el recurso en Coolify

1. **Projects → New → Resource → Public/Private Repository (GitHub App)** y elegir `edav404/portfolio`.
2. Rama: `main`.
3. **Build Pack: Dockerfile** (no Nixpacks). Dockerfile location: `/Dockerfile`.
4. **Ports Exposes:** `3000`.
5. **Domains:** `https://edav.com.co,https://www.edav.com.co`.
6. **Redirección www → apex:** en *Configuration → General → Direction*, elegir **Redirect to non-www**.
7. **Health Check:** habilitar, path `/api/health/`, puerto `3000`.
8. Activar **Auto Deploy** para que cada push a `main` despliegue.

## 4. Variables de entorno

En *Environment Variables* (ver `.env.example`):

| Variable | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | **Build Variable** | Sí | `https://edav.com.co` (se incrusta en el bundle). |
| `LASTFM_API_KEY` | Runtime, secreta | Para el reproductor | Clave de https://www.last.fm/api/account/create |
| `LASTFM_USERNAME` | Runtime | No | `edav404` por defecto. |
| `CONTACT_RECIPIENT` | Runtime | Para el formulario | Correo que recibe los mensajes. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Runtime, secretas | Para el formulario | Servidor SMTP (465 = TLS, 587 = STARTTLS). |
| `SMTP_FROM` | Runtime | No | Remitente; por defecto `EDAV OS <SMTP_USER>`. |
| `CLIENT_IP_HEADER` | Runtime | No | De dónde sale la IP del cliente para el rate limit: vacío o `x-forwarded-for` (por defecto), `cf-connecting-ip` (Cloudflare delante y origen solo alcanzable a través de él) o `x-real-ip`. |
| `TRUSTED_PROXY_HOPS` | Runtime | No | Solo con `X-Forwarded-For`: número de proxies de confianza. `1` con solo Coolify/Traefik. `2` **únicamente** si Traefik confía en el salto anterior (`trustedIPs`). |

La combinación correcta de `CLIENT_IP_HEADER` y `TRUSTED_PROXY_HOPS` depende de qué hay delante de la
app (solo Traefik, Cloudflare con nube naranja o Cloudflare Tunnel). Una mala combinación mete a todos los
visitantes en el mismo contador y basta uno para bloquear el formulario. La frontera de confianza y la
tabla por escenario están en **[`docs/seguridad-proxies.md`](./seguridad-proxies.md)**; resumen:

| Montaje | `CLIENT_IP_HEADER` | `TRUSTED_PROXY_HOPS` |
|---|---|---|
| Solo Coolify/Traefik | (vacío) | `1` |
| Cloudflare (nube naranja) o Tunnel → Traefik, con 80/443 cerrados salvo a Cloudflare | `cf-connecting-ip` | — |

Si la app registra en los logs `[client-ip] …`, la configuración no cuadra con el montaje real.

Sin las variables de Last.fm o SMTP el sitio funciona igual: el reproductor muestra modo offline y el
formulario responde con el aviso de WhatsApp (HTTP 503).

> Para que el correo no caiga en spam, el dominio del remitente debe tener **SPF, DKIM y DMARC**
> configurados en el proveedor SMTP.

## 5. Verificación tras el despliegue

```bash
curl -I https://edav.com.co/                 # 200 + cabeceras de seguridad
curl -I https://www.edav.com.co/             # 301/308 → https://edav.com.co/
curl https://edav.com.co/api/health/         # {"status":"ok",...}
curl https://edav.com.co/api/lastfm/         # JSON de la última canción
curl https://edav.com.co/sitemap.xml
curl https://edav.com.co/robots.txt
```

## 6. Notas operativas

- **No exponer el puerto 3000** del contenedor (no usar *Ports Mappings* en Coolify): todo el tráfico
  debe entrar por el proxy, o el rate limit podría evadirse con cabeceras falsificadas
  (ver [`seguridad-proxies.md`](./seguridad-proxies.md)).
- **HSTS** arranca en `max-age=86400` sin `includeSubDomains`. En la Fase 8, tras verificar que todos
  los subdominios de `edav.com.co` tienen HTTPS válido, se sube a un año.
- Producción arranca **solo vía la imagen Docker** (`node server.js`); `npm start` (`next start`) es
  para pruebas locales y no es el modo de producción.
- Las rutas antiguas `/api/lastfm.php` y `/api/contact.php` se reescriben internamente a las nuevas.

- **Rate limit** de `/api/contact` (5 envíos / 10 min por IP) y `/api/lastfm` (30 / min) vive en memoria:
  válido para **una sola réplica**. Si se escala, moverlo a Redis.
- La IP del cliente sale de `CLIENT_IP_HEADER`. Por defecto se lee `X-Forwarded-For` contando
  `TRUSTED_PROXY_HOPS` desde el final (con `1`, el último valor, el que añade Traefik); los valores
  iniciales los puede falsificar el cliente. Detalle en [`seguridad-proxies.md`](./seguridad-proxies.md).
- **Caché de build:** el `Dockerfile` monta como caché de BuildKit la de npm (`/root/.npm`) y la de
  Next (`/app/.next/cache`). Persisten en el servidor entre despliegues y no entran en la imagen.
  Si un build se comporta raro, vaciarla con `docker builder prune` (o desde *Servers → Cleanup* en
  Coolify) y redesplegar.
- **Imagen base:** fijada por etiqueta y digest (`ARG NODE_IMAGE` en el `Dockerfile`). Al subir de
  versión de Node 24, actualizar ambos: `docker buildx imagetools inspect node:<etiqueta>` da el digest.
- **Contexto de build:** `.dockerignore` deja fuera `private/`, todo `content/` que no sea `.ts`,
  `.env*`, `docs/` y la configuración de agentes, con el mismo criterio que `.gitignore`. Importa en
  los builds locales: Coolify clona desde git y esos archivos ya no están.
- Rollback: *Deployments* → elegir un despliegue anterior → **Redeploy**.
- **Logs:** la app solo escribe en stdout/stderr (avisos `[client-ip]`, `[rate-limit]`, errores de
  `[contact]`/`[mailer]`); Coolify los muestra en *Logs*. No hay archivo de log dentro del contenedor.
  La **rotación** la hace el daemon de Docker del servidor: comprobar que `/etc/docker/daemon.json`
  tiene

  ```json
  { "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
  ```

  y reiniciar Docker (`sudo systemctl restart docker`) si se añade; solo afecta a contenedores creados
  después, así que hay que redesplegar. Sin esto, `json-file` crece sin límite.
- Probar la imagen en local: `docker build -t edav-portfolio . && docker run -p 3000:3000 --env-file .env.local edav-portfolio`.
