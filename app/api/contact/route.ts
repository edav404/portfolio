import { EMAIL_RE, getMailConfig, sendMail } from "@/lib/server/mailer";
import { clientIp, createRateLimiter } from "@/lib/server/rate-limit";

// Por IP y global (protege el SMTP aunque roten las IP).
const perIp = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });
const globalLimit = createRateLimiter({ limit: 40, windowMs: 60 * 60_000, maxKeys: 1 });

const SERVICES = new Set(["Desarrollo web", "WordPress o WooCommerce", "Shopify", "Diseño web", "Otro"]);
const MAX_BODY_BYTES = 20_000;
const ALLOWED_TYPES = ["multipart/form-data", "application/x-www-form-urlencoded"];

function json(message: string, status: number, headers?: HeadersInit) {
  return Response.json({ message }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

/** Lee el cuerpo contando bytes y cancela si supera el máximo (no confía en Content-Length). */
async function readLimited(request: Request, max: number): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
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
  const { ok, retryAfter } = perIp(clientIp(request));
  if (!ok) return json("Demasiados envíos. Intenta de nuevo en unos minutos.", 429, { "Retry-After": String(retryAfter) });

  const contentType = request.headers.get("content-type") ?? "";
  if (!ALLOWED_TYPES.some((type) => contentType.toLowerCase().startsWith(type))) return json("Tipo de contenido no admitido.", 415);
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES) return json("El mensaje es demasiado largo.", 413);

  const raw = await readLimited(request, MAX_BODY_BYTES).catch(() => undefined);
  if (raw === null) return json("El mensaje es demasiado largo.", 413);
  if (raw === undefined) return json("Solicitud inválida.", 400);

  let form: FormData;
  try {
    form = await new Request(request.url, { method: "POST", headers: { "content-type": contentType }, body: raw }).formData();
  } catch {
    return json("Solicitud inválida.", 400);
  }

  // Honeypot: los bots rellenan el campo oculto; respondemos éxito sin enviar.
  if (line(form, "website", 200)) return json("Mensaje recibido.", 200);

  const name = line(form, "name", 120);
  const email = line(form, "email", 254);
  const rawService = line(form, "service", 60);
  const service = SERVICES.has(rawService) ? rawService : "Sin especificar";
  const message = multiline(form, "message", 5_000);

  if (name.length < 2 || !EMAIL_RE.test(email) || message.length < 20) {
    return json("Revisa el nombre, correo y mensaje antes de enviar.", 422);
  }

  const mail = getMailConfig();
  if (!mail.ok) return json("El formulario aún no está conectado. Escríbeme por WhatsApp.", 503);

  if (!globalLimit("all").ok) return json("El formulario está recibiendo demasiados mensajes. Escríbeme por WhatsApp.", 429);

  try {
    await sendMail(mail.config, {
      subject: `Nuevo proyecto web — ${service}`,
      replyTo: email,
      text: `Nombre: ${name}\nCorreo: ${email}\nServicio: ${service}\n\nMensaje:\n${message}`,
    });
  } catch (error) {
    console.error("[contact] Error SMTP:", error instanceof Error ? error.message : error);
    return json("No fue posible enviar el mensaje. Intenta por WhatsApp.", 502);
  }

  return json("Mensaje enviado correctamente.", 200);
}
