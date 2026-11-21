import { resolveServiceSlug, serviceLabel } from "@/content/services";
import { describeSmtpError, EMAIL_RE, getMailConfig, sendMail } from "@/lib/server/mailer";
import { clientKey, createRateLimiter } from "@/lib/server/rate-limit";
import { isSameOriginRequest } from "@/lib/server/same-origin";

// Por IP (IPv6 agrupada por /64) y global (protege el SMTP aunque roten las IP).
const perIp = createRateLimiter({ name: "contact", limit: 5, windowMs: 10 * 60_000 });
const globalLimit = createRateLimiter({ name: "contact-global", limit: 40, windowMs: 60 * 60_000, maxKeys: 1 });
const GLOBAL_KEY = "all";

const MAX_BODY_BYTES = 20_000;
/** Tiempo máximo para recibir el cuerpo completo (frena clientes que envían muy despacio). */
const BODY_TIMEOUT_MS = 10_000;
const ALLOWED_TYPES = ["multipart/form-data", "application/x-www-form-urlencoded"];

function json(message: string, status: number, headers?: Record<string, string>) {
  return Response.json({ message }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

type BodyResult = { ok: true; body: Uint8Array<ArrayBuffer> } | { ok: false; reason: "too-large" | "timeout" | "invalid" };

/**
 * Lee el cuerpo contando bytes (no confía en Content-Length): cancela si supera `max`
 * o si no termina de llegar en `timeoutMs`.
 */
async function readLimited(request: Request, max: number, timeoutMs: number): Promise<BodyResult> {
  if (!request.body) return { ok: true, body: new Uint8Array() };
  const reader = request.body.getReader();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    reader.cancel().catch(() => {});
  }, timeoutMs);

  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (timedOut) return { ok: false, reason: "timeout" };
      if (done) break;
      total += value.byteLength;
      if (total > max) {
        await reader.cancel().catch(() => {});
        return { ok: false, reason: "too-large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: timedOut ? "timeout" : "invalid" };
  } finally {
    clearTimeout(timer);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, body };
}

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Campo de una línea: elimina también CR/LF y tabulaciones. */
function line(form: FormData, name: string, max: number): string {
  const value = form.get(name);
  return typeof value === "string" ? value.replace(CONTROL_CHARS, "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max) : "";
}

/** Texto multilínea: conserva saltos de línea, normalizados a \n. */
function multiline(form: FormData, name: string, max: number): string {
  const value = form.get(name);
  return typeof value === "string" ? value.replace(CONTROL_CHARS, "").replace(/\r\n?/g, "\n").trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  // Antes del rate limit: un POST cross-site no debe gastar la cuota de la IP del visitante.
  if (!isSameOriginRequest(request)) return json("Origen no permitido.", 403);

  const key = clientKey(request);
  const { ok, retryAfter } = perIp.check(key);
  if (!ok) return json("Demasiados envíos. Intenta de nuevo en unos minutos.", 429, { "Retry-After": String(retryAfter) });

  const contentType = request.headers.get("content-type") ?? "";
  if (!ALLOWED_TYPES.some((type) => contentType.toLowerCase().startsWith(type))) return json("Tipo de contenido no admitido.", 415);
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES) return json("El mensaje es demasiado largo.", 413);

  const raw = await readLimited(request, MAX_BODY_BYTES, BODY_TIMEOUT_MS);
  if (!raw.ok) {
    if (raw.reason === "too-large") return json("El mensaje es demasiado largo.", 413);
    if (raw.reason === "timeout") return json("La solicitud tardó demasiado.", 408);
    return json("Solicitud inválida.", 400);
  }

  let form: FormData;
  try {
    form = await new Request(request.url, { method: "POST", headers: { "content-type": contentType }, body: raw.body }).formData();
  } catch {
    return json("Solicitud inválida.", 400);
  }

  // Honeypot: los bots rellenan el campo oculto; respondemos éxito sin enviar.
  if (line(form, "website", 200)) return json("Mensaje recibido.", 200);

  const name = line(form, "name", 120);
  const email = line(form, "email", 254);
  // Acepta el slug (formulario nuevo) o la etiqueta antigua; cualquier otro valor se descarta.
  const serviceSlug = resolveServiceSlug(line(form, "service", 60));
  const service = (serviceSlug && serviceLabel(serviceSlug, "es")) || "Sin especificar";
  const message = multiline(form, "message", 5_000);

  if (name.length < 2 || !EMAIL_RE.test(email) || message.length < 20) {
    return json("Revisa el nombre, correo y mensaje antes de enviar.", 422);
  }

  const mail = getMailConfig();
  if (!mail.ok) return json("El formulario aún no está conectado. Escríbeme por WhatsApp.", 503);

  const global = globalLimit.check(GLOBAL_KEY);
  if (!global.ok) {
    return json("El formulario está recibiendo demasiados mensajes. Escríbeme por WhatsApp.", 429, { "Retry-After": String(global.retryAfter) });
  }

  try {
    await sendMail(mail.config, {
      subject: `Nuevo proyecto web — ${service}`,
      replyTo: email,
      text: `Nombre: ${name}\nCorreo: ${email}\nServicio: ${service}\n\nMensaje:\n${message}`,
    });
  } catch (error) {
    // El fallo es del SMTP, no del visitante: se devuelve el cupo global (el de la IP se mantiene
    // para que los reintentos en bucle sigan acotados).
    globalLimit.refund(GLOBAL_KEY);
    console.error(`[contact] Error SMTP: ${describeSmtpError(error)}`);
    return json("No fue posible enviar el mensaje. Intenta por WhatsApp.", 502);
  }

  return json("Mensaje enviado correctamente.", 200);
}
