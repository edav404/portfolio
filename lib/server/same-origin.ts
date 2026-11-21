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

  return allowedOrigins(request).has(originUrl.origin.toLowerCase());
}

/** Hosts locales en los que se admite `http:` (next dev / next start en la máquina). */
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Orígenes completos (esquema + host + puerto) admitidos. Comparar solo el host aceptaría
 * `Origin: http://edav.com.co` en una petición HTTPS (degradación de esquema).
 */
function allowedOrigins(request: Request): Set<string> {
  const origins = new Set<string>();
  // Mismo valor por defecto que data/site.ts. NEXT_PUBLIC_* se fija en el build.
  try {
    origins.add(new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://edav.com.co").origin.toLowerCase());
  } catch {
    // URL mal formada: se ignora; queda la comparación con Host.
  }
  // Traefik y Cloudflare conservan Host por defecto. No se usa X-Forwarded-Host: no hace falta y
  // depende de que cada proxy lo sobrescriba. Detrás del proxy Node recibe HTTP, así que el esquema
  // no se deduce de la petición: en hosts públicos solo se admite https (túneles, previews) y
  // `http:` únicamente en localhost.
  const host = request.headers.get("host")?.trim().toLowerCase();
  if (host) {
    origins.add(`https://${host}`);
    const hostname = host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : host.split(":")[0];
    if (LOCAL_HOSTNAMES.has(hostname)) origins.add(`http://${host}`);
  }
  return origins;
}
