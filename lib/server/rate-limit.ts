import "server-only";
import { isIP } from "node:net";

type Bucket = { count: number; resetAt: number };

/**
 * Limitador en memoria de ventana fija, con capacidad acotada.
 * Válido para una sola instancia (Coolify con un contenedor). Si se escala, migrar a Redis.
 */
export function createRateLimiter({ limit, windowMs, maxKeys = 10_000 }: { limit: number; windowMs: number; maxKeys?: number }) {
  const buckets = new Map<string, Bucket>();
  let nextSweep = 0;

  function sweep(now: number) {
    if (now < nextSweep) return;
    nextSweep = now + windowMs;
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
  }

  return function check(key: string): { ok: boolean; retryAfter: number } {
    const now = Date.now();
    sweep(now);
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      // Capacidad máxima: expulsa las entradas más antiguas (orden de inserción del Map).
      while (buckets.size >= maxKeys) {
        const oldest = buckets.keys().next().value;
        if (oldest === undefined) break;
        buckets.delete(oldest);
      }
      buckets.delete(key);
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { ok: true, retryAfter: 0 };
    }
    bucket.count += 1;
    return { ok: bucket.count <= limit, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  };
}

function trustedHops(): number {
  const value = Number(process.env.TRUSTED_PROXY_HOPS ?? 1);
  return Number.isInteger(value) && value >= 1 && value <= 5 ? value : 1;
}

/**
 * IP del cliente detrás del proxy inverso de Coolify (Traefik).
 * El cliente puede inventar valores al INICIO de X-Forwarded-For; cada proxy de confianza
 * añade la IP que ve al FINAL. Con N proxies de confianza, la IP real es la N-ésima desde el final.
 * Requisito: el puerto 3000 del contenedor no debe estar expuesto públicamente (solo vía proxy).
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    const trusted = trustedHops();
    // Cadena más corta de lo esperado: configuración incorrecta; no confiamos en valores del cliente.
    if (hops.length >= trusted) {
      const ip = hops[hops.length - trusted];
      if (isIP(ip)) return ip;
    }
    return "untrusted-chain";
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp && isIP(realIp) ? realIp : "unknown";
}
