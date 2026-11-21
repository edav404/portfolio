import "server-only";
import { isIP } from "node:net";

type Bucket = { count: number; resetAt: number };

export type RateLimitResult = {
  ok: boolean;
  retryAfter: number;
  /**
   * Devuelve este intento concreto (p. ej. si el envío falló por causas ajenas al cliente).
   * Solo descuenta del bucket en el que se contó: si la ventana ya se reinició, no hace nada.
   */
  release(): void;
};

export type RateLimiter = {
  /** Cuenta un intento para la clave y dice si sigue dentro del límite. */
  check(key: string): RateLimitResult;
};

/** Clave compartida por las claves nuevas cuando el mapa está lleno (ver `check`). */
const OVERFLOW_KEY = "__overflow__";

/**
 * Limitador en memoria de ventana fija, con capacidad acotada.
 * Válido para una sola instancia (Coolify con un contenedor). Si se escala, migrar a Redis.
 *
 * Resistencia a inundación de claves (SEC-05): cuando se alcanza `maxKeys` se purgan primero
 * las entradas caducadas; si sigue lleno, NO se expulsan las existentes (eso permitiría a quien
 * rote IP borrar su propio contador o el de otros), sino que las claves nuevas comparten un único
 * bucket de desbordamiento con el mismo límite. Es decir: bajo inundación, falla de forma cerrada.
 */
export function createRateLimiter({ limit, windowMs, maxKeys = 10_000, name = "rate-limit" }: {
  limit: number;
  windowMs: number;
  maxKeys?: number;
  /** Solo para los logs. */
  name?: string;
}): RateLimiter {
  const buckets = new Map<string, Bucket>();
  let nextSweep = 0;
  let overflowWarnedUntil = 0;

  function sweep(now: number, force = false) {
    if (!force && now < nextSweep) return;
    nextSweep = now + windowMs;
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
  }

  function check(key: string): RateLimitResult {
    const now = Date.now();
    sweep(now);
    let bucket = buckets.get(key);
    if (bucket && bucket.resetAt <= now) {
      buckets.delete(key);
      bucket = undefined;
    }
    if (!bucket) {
      if (buckets.size >= maxKeys) sweep(now, true);
      // El bucket de desbordamiento se crea aunque el mapa esté lleno (una entrada extra como máximo).
      if (buckets.size >= maxKeys && key !== OVERFLOW_KEY) {
        if (now >= overflowWarnedUntil) {
          overflowWarnedUntil = now + windowMs;
          console.warn(`[${name}] Capacidad agotada (${maxKeys} claves): las claves nuevas comparten un bucket de desbordamiento.`);
        }
        return check(OVERFLOW_KEY);
      }
      bucket = { count: 1, resetAt: now + windowMs };
      buckets.set(key, bucket);
      return { ok: true, retryAfter: 0, release: releaser(bucket) };
    }
    bucket.count += 1;
    return { ok: bucket.count <= limit, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)), release: releaser(bucket) };
  }

  /** El reembolso queda ligado al objeto bucket original: una ventana nueva es otro objeto. */
  function releaser(bucket: Bucket) {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (bucket.resetAt > Date.now() && bucket.count > 0) bucket.count -= 1;
    };
  }

  return { check };
}

// ---------------------------------------------------------------------------
// IP del cliente (SEC-01). Ver docs/seguridad-proxies.md antes de cambiar nada aquí.
// ---------------------------------------------------------------------------

/** Cabeceras de un solo valor admitidas en CLIENT_IP_HEADER (las escribe un proxy de confianza). */
const SINGLE_VALUE_HEADERS = new Set(["cf-connecting-ip", "x-real-ip"]);

type IpSource = { kind: "xff"; hops: number } | { kind: "header"; name: string };

let cachedSource: IpSource | null = null;
const warned = new Set<string>();

function warnOnce(id: string, message: string) {
  if (warned.has(id)) return;
  warned.add(id);
  console.warn(`[client-ip] ${message}`);
}

function trustedHops(): number {
  const raw = process.env.TRUSTED_PROXY_HOPS;
  const value = Number(raw ?? 1);
  if (Number.isInteger(value) && value >= 1 && value <= 5) return value;
  warnOnce("hops", `TRUSTED_PROXY_HOPS="${raw}" no es válido (1-5); se usa 1.`);
  return 1;
}

/** Lee la configuración una vez por proceso. */
function ipSource(): IpSource {
  if (cachedSource) return cachedSource;
  const header = process.env.CLIENT_IP_HEADER?.trim().toLowerCase();
  if (header && header !== "x-forwarded-for") {
    if (SINGLE_VALUE_HEADERS.has(header)) {
      cachedSource = { kind: "header", name: header };
      return cachedSource;
    }
    warnOnce("header", `CLIENT_IP_HEADER="${header}" no está admitido (cf-connecting-ip, x-real-ip o x-forwarded-for); se usa X-Forwarded-For.`);
  }
  cachedSource = { kind: "xff", hops: trustedHops() };
  return cachedSource;
}

/** Valida y normaliza una IP; IPv4 mapeada en IPv6 (`::ffff:a.b.c.d`) se devuelve como IPv4. */
function normalizeIp(value: string | undefined | null): string | null {
  if (!value) return null;
  let ip = value.trim();
  // Algunos proxies añaden el puerto a IPv4 ("1.2.3.4:5678") o corchetes a IPv6 ("[::1]:80").
  const bracketed = ip.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed) ip = bracketed[1];
  else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.slice(0, ip.lastIndexOf(":"));
  const version = isIP(ip);
  if (version === 4) return ip;
  if (version === 6) {
    const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
    return mapped && isIP(mapped[1]) === 4 ? mapped[1] : ip.toLowerCase();
  }
  return null;
}

/** Prefijo /64 de una IPv6 válida: un cliente IPv6 suele controlar el /64 entero y puede rotar dentro de él. */
function ipv6Prefix64(ip: string): string {
  let addr = ip.split("%")[0];
  const tailV4 = addr.match(/(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (tailV4) {
    const [a, b, c, d] = tailV4.slice(1).map(Number);
    addr = `${addr.slice(0, -tailV4[0].length)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head, tail] = addr.split("::");
  const left = head ? head.split(":") : [];
  const right = tail === undefined ? [] : tail ? tail.split(":") : [];
  const groups = tail === undefined ? left : [...left, ...Array<string>(8 - left.length - right.length).fill("0"), ...right];
  return `${groups.slice(0, 4).map((group) => parseInt(group, 16).toString(16)).join(":")}::/64`;
}

/**
 * IP del cliente según la frontera de confianza configurada (docs/seguridad-proxies.md).
 *
 * - Por defecto (`CLIENT_IP_HEADER` vacío o `x-forwarded-for`): el cliente puede inventar valores
 *   al INICIO de X-Forwarded-For; cada proxy de confianza añade la IP que ve al FINAL. Con N proxies
 *   de confianza (`TRUSTED_PROXY_HOPS`), la IP real es la N-ésima desde el final.
 * - `CLIENT_IP_HEADER=cf-connecting-ip` (o `x-real-ip`): se usa esa cabecera tal cual. Solo es seguro
 *   si el origen NO es alcanzable sin pasar por el proxy que la sobrescribe; si no, es falsificable.
 *
 * Devuelve `"untrusted-chain"` o `"unknown"` si no hay una IP fiable (todos esos clientes comparten
 * bucket); se registra un aviso una sola vez para detectar la mala configuración en los logs.
 * Requisito en cualquier caso: el puerto 3000 del contenedor no debe estar expuesto públicamente.
 */
export function clientIp(request: Request): string {
  const source = ipSource();

  if (source.kind === "header") {
    const ip = normalizeIp(request.headers.get(source.name));
    if (ip) return ip;
    warnOnce("missing-header", `Falta la cabecera ${source.name} o no es una IP válida: revisa CLIENT_IP_HEADER y el proxy.`);
    return "unknown";
  }

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    // Cadena más corta de lo esperado: configuración incorrecta; no confiamos en valores del cliente.
    if (hops.length >= source.hops) {
      const ip = normalizeIp(hops[hops.length - source.hops]);
      if (ip) return ip;
    }
    warnOnce("untrusted-chain", `X-Forwarded-For con ${hops.length} saltos y TRUSTED_PROXY_HOPS=${source.hops}: todos estos clientes comparten bucket. Revisa docs/seguridad-proxies.md.`);
    return "untrusted-chain";
  }

  const realIp = normalizeIp(request.headers.get("x-real-ip"));
  if (realIp) return realIp;
  // En `next dev` sin proxy no hay cabeceras de reenvío: es lo esperado y no merece aviso.
  if (process.env.NODE_ENV === "production") warnOnce("unknown", "La petición no trae X-Forwarded-For ni X-Real-IP: todos estos clientes comparten bucket.");
  return "unknown";
}

/** Clave para el limitador: la IPv4 tal cual; la IPv6 agrupada por /64. */
export function clientKey(request: Request): string {
  const ip = clientIp(request);
  return isIP(ip) === 6 ? ipv6Prefix64(ip) : ip;
}
