import "server-only";

/**
 * Comprobación anti cross-site para endpoints que reciben formularios (SEC-03).
 *
 * `multipart/form-data` y `x-www-form-urlencoded` son "simple requests" de CORS: cualquier web
 * puede hacer que el navegador del visitante envíe un POST. No hay sesión (no es un CSRF clásico),
 * pero permitiría usar navegadores ajenos para mandar spam desde IP distintas.
 *
 * Reglas:
 * 1. `Sec-Fetch-Site: cross-site` → rechazar.
 * 2. Si llega `Origin`, debe ser el del sitio (`NEXT_PUBLIC_SITE_URL`) o coincidir con el host al que
 *    se hizo la petición (cubre `next dev` en localhost, túneles de prueba y previews). `Origin: null`
 *    (iframes sandbox, `data:`, redirecciones opacas) → rechazar.
 * 3. `Sec-Fetch-Site: same-site` (otro subdominio) solo se acepta con un `Origin` válido.
 * 4. Sin ninguna de las dos cabeceras → aceptar: navegadores antiguos y clientes no navegador
 *    (curl, scripts), que no sirven para abusar del navegador de un tercero. El rate limit los acota.
 *
 * El navegador fija `Origin`, `Host` y `Sec-Fetch-Site` y una página ajena no puede cambiarlos, así que
 * comparar con `Host` es seguro frente a CSRF. Un cliente no navegador puede falsificarlos todos, pero
 * eso no es lo que esta comprobación intenta impedir.
 */
export function isSameOriginRequest(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (origin === null) return fetchSite !== "same-site";
  if (origin === "null") return false;

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }
  if (originUrl.protocol !== "https:" && originUrl.protocol !== "http:") return false;

  return allowedHosts(request).has(originUrl.host.toLowerCase());
}

function allowedHosts(request: Request): Set<string> {
  const hosts = new Set<string>();
  // Mismo valor por defecto que data/site.ts. NEXT_PUBLIC_* se fija en el build.
  try {
    hosts.add(new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://edav.com.co").host.toLowerCase());
  } catch {
    // URL mal formada: se ignora; queda la comparación con Host.
  }
  // Traefik y Cloudflare conservan Host por defecto. No se usa X-Forwarded-Host: no hace falta y
  // depende de que cada proxy lo sobrescriba.
  const host = request.headers.get("host")?.trim().toLowerCase();
  if (host) hosts.add(host);
  return hosts;
}
