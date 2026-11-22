/**
 * Resolución de errores del formulario de Contacto del SO. Puro: la respuesta de `/api/contact/` se
 * traduce por código (`content/contact-errors.ts`), con el `Retry-After` de un 429 si viene.
 */
import { isContactErrorCode, type ContactErrorCode } from "@/content/contact-errors";
import { format } from "@/content/format";

export type WaitUnits = { second: string; seconds: string; minute: string; minutes: string };
export type ContactMessages = {
  errors: Readonly<Record<ContactErrorCode, string>>;
  generic: string;
  network: string;
  rateLimitedWait: string;
  waitUnits: WaitUnits;
};

/** `Retry-After` en segundos o como fecha HTTP. Devuelve segundos o `null`. */
export function parseRetryAfter(header: string | null, now: number = Date.now()): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, Math.ceil((date - now) / 1000));
}

export function waitText(seconds: number, units: WaitUnits): string {
  if (seconds < 60) return seconds <= 1 ? units.second : format(units.seconds, { n: seconds });
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? units.minute : format(units.minutes, { n: minutes });
}

/** Mensaje para una respuesta de error: 429 con espera legible → espera; código conocido → su texto. */
export function failureMessage(response: { status: number; retryAfter: string | null; code?: unknown }, copy: ContactMessages, now?: number): string {
  const wait = response.status === 429 ? parseRetryAfter(response.retryAfter, now) : null;
  if (wait !== null) return format(copy.rateLimitedWait, { wait: waitText(wait, copy.waitUnits) });
  return isContactErrorCode(response.code) ? copy.errors[response.code] : copy.generic;
}

/** Borrador del formulario de Contacto. El servicio preseleccionado NO cuenta como texto escrito. */
export type ContactDraft = { name: string; email: string; service: string; message: string };

/** ¿Hay texto sin enviar en el borrador ACTUAL? (nombre, correo o mensaje; el servicio no es un borrador). */
export function isContactDirty(draft: ContactDraft): boolean {
  return draft.name !== "" || draft.email !== "" || draft.message !== "";
}

/** Tras un envío exitoso se limpia solo lo enviado: un campo editado mientras se enviaba se conserva. */
export function clearSent(draft: ContactDraft, sent: ContactDraft): ContactDraft {
  return {
    name: draft.name === sent.name ? "" : draft.name,
    email: draft.email === sent.email ? "" : draft.email,
    service: draft.service,
    message: draft.message === sent.message ? "" : draft.message,
  };
}
