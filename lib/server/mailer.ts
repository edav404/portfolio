import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

export const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

export type MailConfig = {
  recipient: string;
  from: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
};

type ConfigResult = { ok: true; config: MailConfig } | { ok: false; reason: "missing" | "invalid"; detail: string };

let cachedConfig: ConfigResult | null = null;
let transporter: Transporter | null = null;

function parseConfig(): ConfigResult {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM, CONTACT_RECIPIENT } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !CONTACT_RECIPIENT) {
    return { ok: false, reason: "missing", detail: "Faltan SMTP_HOST, SMTP_USER, SMTP_PASS o CONTACT_RECIPIENT." };
  }
  if (!EMAIL_RE.test(CONTACT_RECIPIENT)) return { ok: false, reason: "invalid", detail: "CONTACT_RECIPIENT no es un correo válido." };

  const port = Number(SMTP_PORT || 465);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return { ok: false, reason: "invalid", detail: "SMTP_PORT inválido." };

  let secure = port === 465;
  if (SMTP_SECURE) {
    if (SMTP_SECURE !== "true" && SMTP_SECURE !== "false") return { ok: false, reason: "invalid", detail: 'SMTP_SECURE debe ser "true" o "false".' };
    secure = SMTP_SECURE === "true";
  }

  // SMTP_USER no siempre es un correo (algunos proveedores usan IDs de cuenta): en ese caso SMTP_FROM es obligatorio.
  const from = SMTP_FROM || (EMAIL_RE.test(SMTP_USER) ? `EDAV OS <${SMTP_USER}>` : "");
  if (!from) return { ok: false, reason: "invalid", detail: "Define SMTP_FROM: SMTP_USER no es una dirección de correo." };

  return { ok: true, config: { recipient: CONTACT_RECIPIENT, from, host: SMTP_HOST, port, secure, user: SMTP_USER, pass: SMTP_PASS } };
}

/** Lee y valida la configuración SMTP una sola vez por proceso. */
export function getMailConfig(): ConfigResult {
  if (!cachedConfig) {
    cachedConfig = parseConfig();
    if (!cachedConfig.ok && cachedConfig.reason === "invalid") console.error(`[mailer] Configuración SMTP inválida: ${cachedConfig.detail}`);
  }
  return cachedConfig;
}

function getTransporter(config: MailConfig): Transporter {
  transporter ??= nodemailer.createTransport({
    host: config.host,
    port: config.port,
    // secure=true → TLS implícito (465). secure=false → STARTTLS obligatorio (requireTLS).
    secure: config.secure,
    requireTLS: !config.secure,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transporter;
}

/**
 * Resumen de un error SMTP apto para los logs: sin credenciales ni datos personales.
 * Nodemailer incluye en `message`/`response` la respuesta del servidor, que puede citar direcciones
 * (p. ej. "550 <x@y> rejected") o, en algunos servidores, eco de la autenticación. Por eso solo se
 * conservan los códigos y un mensaje truncado con correos, credenciales y bloques base64 tapados.
 */
export function describeSmtpError(error: unknown): string {
  if (!(error instanceof Error)) return "error desconocido";
  const { code, responseCode, command } = error as Error & { code?: unknown; responseCode?: unknown; command?: unknown };
  const secrets = [process.env.SMTP_USER, process.env.SMTP_PASS, process.env.CONTACT_RECIPIENT].filter((value): value is string => !!value && value.length >= 3);
  let message = error.message;
  for (const secret of secrets) message = message.split(secret).join("[oculto]");
  message = message
    .replace(/[^\s<>()[\]\\,;:"']+@[^\s<>()[\]\\,;:"']+/g, "[correo]")
    .replace(/[A-Za-z0-9+/]{16,}={0,2}/g, "[oculto]")
    .replace(/[\r\n]+/g, " ")
    .slice(0, 200);
  const parts = [
    typeof code === "string" ? `code=${code}` : "",
    typeof responseCode === "number" ? `responseCode=${responseCode}` : "",
    // Solo el verbo (AUTH, MAIL, RCPT…): el resto del comando puede llevar direcciones.
    typeof command === "string" ? `command=${command.split(" ")[0]}` : "",
    `message="${message}"`,
  ];
  return parts.filter(Boolean).join(" ");
}

export async function sendMail(config: MailConfig, message: { subject: string; text: string; replyTo: string }) {
  await getTransporter(config).sendMail({ from: config.from, to: config.recipient, ...message });
}
