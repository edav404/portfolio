/**
 * Códigos de error de `/api/contact` (`{ ok: false, code, message }`): listado único que comparten
 * el servidor (app/api/contact/route.ts), el formulario cliente (components/contact-form.tsx), el
 * microcopy (`ui.contactForm.errors`, con una traducción por código) y los tests.
 * Módulo sin dependencias para que el cliente pueda importarlo sin traer content/ui.ts.
 */
export const contactErrorCodes = ["invalid", "rate_limited", "origin", "server", "not_configured", "too_large", "timeout"] as const;

export type ContactErrorCode = (typeof contactErrorCodes)[number];

export function isContactErrorCode(value: unknown): value is ContactErrorCode {
  return typeof value === "string" && (contactErrorCodes as readonly string[]).includes(value);
}
