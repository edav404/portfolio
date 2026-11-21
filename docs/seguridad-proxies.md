# Seguridad de proxies: IP del cliente y frontera de confianza

Cómo obtiene la app la IP del visitante (para el rate limit de `/api/contact/` y `/api/lastfm/`), en qué
proxies confía y qué hay que cerrar en el servidor para que esa IP no se pueda falsificar.
Código: `lib/server/rate-limit.ts` (`clientIp`, `clientKey`). Hallazgo de origen: SEC-01 en
`docs/auditoria/05-seguridad-infra.md`.

## 1. Frontera de confianza

```
Visitante ──► Cloudflare (edge) ──► [cloudflared] ──► Traefik (Coolify) ──► Node (contenedor :3000)
   no fiable        fiable si el origen solo           fiable                     la app
                    es alcanzable a través de él
```

- **El visitante no es de confianza.** Puede enviar cualquier cabecera: `X-Forwarded-For`,
  `CF-Connecting-IP`, `X-Real-IP`, `Origin`…
- **Un proxy solo es de confianza si no se puede rodear.** Si alguien llega a Traefik sin pasar por
  Cloudflare, cualquier cabecera "de Cloudflare" puede venir del atacante. Si alguien llega a Node sin
  pasar por Traefik, todo lo que diga `X-Forwarded-For` puede ser inventado.
- La app no ve la topología: confía en lo que le indican `CLIENT_IP_HEADER` y `TRUSTED_PROXY_HOPS`.
  Si esas variables no cuadran con el montaje real, la clave del limitador es falsificable o todos los
  visitantes comparten un único contador.

### Quién escribe cada cabecera

| Cabecera | Quién la escribe | ¿El cliente puede falsificarla? |
|---|---|---|
| `CF-Connecting-IP` | El edge de Cloudflare la **sobrescribe** siempre con la IP que ve. | Sí, si el origen es alcanzable sin pasar por Cloudflare. No, si solo se entra por Cloudflare. |
| `X-Forwarded-For` | Cada proxy **añade** al final la IP del salto anterior. Cloudflare añade la del cliente; Traefik, la del salto que ve. Traefik **descarta** el XFF entrante si el salto anterior no está en `forwardedHeaders.trustedIPs` (y `insecure` no está activo) [verificar en Coolify]. | Los valores del **principio** sí; los que añaden los proxies de confianza al final, no. |
| `X-Real-IP` | Traefik la **sobrescribe** con la IP del salto anterior (no la del cliente si hay Cloudflare delante). | No, si todo pasa por Traefik. |
| `Host` | El navegador; Cloudflare y Traefik la conservan. | Sí desde fuera de un navegador; un navegador no deja cambiarla (relevante para `Origin`, ver §5). |

## 2. Configuración

| Variable | Valores | Efecto |
|---|---|---|
| `CLIENT_IP_HEADER` | vacío o `x-forwarded-for` (por defecto) | Lee `X-Forwarded-For` y toma la IP N-ésima **desde el final** (N = `TRUSTED_PROXY_HOPS`). Si la cadena es más corta que N, devuelve `untrusted-chain`. |
| | `cf-connecting-ip` | Lee `CF-Connecting-IP` tal cual. Requiere que el origen solo sea alcanzable a través de Cloudflare. |
| | `x-real-ip` | Lee `X-Real-IP` tal cual. Solo útil si el proxy que la escribe ve directamente al cliente. |
| | otro valor | Se ignora, se registra un aviso y se usa `X-Forwarded-For`. |
| `TRUSTED_PROXY_HOPS` | `1`–`5` (por defecto `1`) | Solo con `X-Forwarded-For`. Fuera de rango → `1` y aviso. |

Comportamiento adicional:

- **IPv6 se agrupa por /64** en la clave del limitador (un cliente IPv6 controla normalmente su /64
  entero y podría rotar direcciones). Las IPv4 mapeadas (`::ffff:1.2.3.4`) se tratan como IPv4.
- Si no hay una IP fiable, la clave es `untrusted-chain` o `unknown` y todos esos clientes comparten
  contador. La app lo registra **una vez por proceso** con el prefijo `[client-ip]`. Si ese aviso
  aparece en los logs de Coolify, la configuración no cuadra con el montaje.
- El limitador tiene un tope de 10 000 claves. Si se llena (inundación con muchas IP), no expulsa las
  existentes: las claves nuevas comparten un bucket de desbordamiento y se registra `Capacidad agotada`.

**Por defecto (sin `CLIENT_IP_HEADER`, `TRUSTED_PROXY_HOPS=1`)** la app solo confía en el último salto
de `X-Forwarded-For`, el que añade Traefik. Es la opción segura: en el peor caso (Cloudflare delante sin
configurar) la clave es la IP del edge de Cloudflare o de cloudflared, compartida por muchos usuarios
(límite demasiado estricto), pero nunca una IP elegida por el atacante.

## 3. Escenarios

| Escenario | XFF que llega a la app | Configuración recomendada | Requisito de red |
|---|---|---|---|
| **A.** Cliente → Traefik → app | `cliente` | `CLIENT_IP_HEADER` vacío, `TRUSTED_PROXY_HOPS=1` | Puerto 3000 no publicado. |
| **B.** Cliente → Cloudflare (nube naranja) → Traefik | `IP_edge_CF` (Traefik descarta el resto si no confía en CF) | `CLIENT_IP_HEADER=cf-connecting-ip` | 80/443 **solo** abiertos a los [rangos de Cloudflare](https://www.cloudflare.com/ips/) (firewall del proveedor y/o iptables; ojo: Docker se salta ufw en puertos publicados). |
| **B'.** Igual que B con los rangos de CF en `trustedIPs` de Traefik | `[falsas,] cliente, IP_edge_CF` | Alternativa: `CLIENT_IP_HEADER` vacío, `TRUSTED_PROXY_HOPS=2` | Mantener `trustedIPs` al día con los rangos de CF. |
| **C.** Cliente → Cloudflare → Tunnel (cloudflared) → Traefik | `IP_cloudflared` | `CLIENT_IP_HEADER=cf-connecting-ip` | 80/443 **cerrados** al exterior: solo se entra por el túnel. |
| **C'.** Igual que C con la red de cloudflared en `trustedIPs` | `[falsas,] cliente, IP_cloudflared` | Alternativa: `TRUSTED_PROXY_HOPS=2` | Igual que C. |
| **D.** Tunnel directo al contenedor (sin Traefik) | `[falsas,] cliente` | `CLIENT_IP_HEADER=cf-connecting-ip` | Puerto 3000 accesible solo desde cloudflared. Sin Traefik no hay redirección www→apex ni a HTTPS (ver INF-07). |

Combinaciones que **no** hay que usar:

- `TRUSTED_PROXY_HOPS=2` sin `trustedIPs` en Traefik: la cadena llega con un solo valor y todos los
  visitantes caen en `untrusted-chain` (un solo usuario bloquea el formulario para todos).
- `CLIENT_IP_HEADER=cf-connecting-ip` con 80/443 abiertos a Internet: cualquiera puede llamar al origen
  directamente con `CF-Connecting-IP: <lo que quiera>` y rotar su clave a voluntad.

## 4. Antes de publicar (obligatorio con `cf-connecting-ip`)

1. **Cerrar el origen** a todo lo que no sea el proxy de confianza:
   - Tunnel: 80/443 cerrados en el firewall del proveedor y en el host.
   - Nube naranja sin túnel: 80/443 abiertos solo a los rangos IPv4 e IPv6 de Cloudflare.
   - En todos los casos: el puerto 3000 del contenedor sin publicar (`docker ps` sin `0.0.0.0:3000`).
2. **Prueba de falsificación** desde fuera:
   `curl -H "X-Forwarded-For: 1.2.3.4" -H "CF-Connecting-IP: 1.2.3.4" https://edav.com.co/api/lastfm/`
   no debe producir la clave `1.2.3.4` (comprobar con un log temporal de `clientKey`).
3. **Prueba de origen directo:** `curl --resolve edav.com.co:443:<IP_del_servidor> https://edav.com.co/`
   debe fallar (timeout o conexión rechazada).
4. **Dos redes distintas** (móvil y fijo) deben dar dos claves distintas y ninguna debe ser
   `untrusted-chain`, `unknown` ni una IP de Cloudflare o de cloudflared.
5. Los logs de Coolify no muestran avisos `[client-ip]`.

Sin el paso 1, `cf-connecting-ip` hace la IP **falsificable**: es peor que el valor por defecto.

## 5. Comprobación de origen en `/api/contact/` (SEC-03)

`lib/server/same-origin.ts` rechaza con 403 los POST que un navegador envía desde otra web:

- `Sec-Fetch-Site: cross-site` → 403.
- `Origin` presente: se compara el origen completo (esquema + host + puerto). Debe ser el de
  `NEXT_PUBLIC_SITE_URL` o `https://<Host de la petición>` (túneles y previews); `http://` solo se
  admite en `localhost`/`127.0.0.1`/`[::1]` (desarrollo). Así `Origin: http://edav.com.co` no pasa.
  `Origin: null` → 403.
- `Sec-Fetch-Site: same-site` (otro subdominio) solo pasa con un `Origin` válido.
- Sin `Origin` ni `Sec-Fetch-Site` (navegadores antiguos, curl) → se acepta; el rate limit lo acota.

Depende de que los proxies conserven `Host` (Traefik y Cloudflare lo hacen por defecto). Si un proxy lo
reescribe, el formulario seguirá funcionando en el dominio de `NEXT_PUBLIC_SITE_URL`, pero no en otros.
