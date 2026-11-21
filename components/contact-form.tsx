"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OTHER_SERVICE, otherServiceLabel, resolveServiceSlug, services } from "@/content/services";
import { isContactErrorCode, type ContactErrorCode } from "@/content/contact-errors";
import { useLocale } from "@/lib/i18n/locale-context";

type FormState = "idle" | "sending" | "success" | "error";

/** `Retry-After` puede venir en segundos o como fecha HTTP. Devuelve segundos o `null`. */
function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

/** Textos del formulario ya resueltos por el servidor (`uiFor(locale, "contactForm")`). */
export type ContactFormCopy = {
  name: string; namePlaceholder: string; email: string; emailPlaceholder: string;
  service: string; servicePlaceholder: string; message: string; messagePlaceholder: string;
  honeypot: string; submit: string; sending: string; success: string; network: string; generic: string;
  rateLimitedWait: string;
  waitUnits: { second: string; seconds: string; minute: string; minutes: string };
  errors: Record<ContactErrorCode, string>;
};

/** Códigos que devuelve `/api/contact` (mismos que `contactErrorCodes` de content/ui.ts; lo comprueba un test). */
export type { ContactErrorCode };

function waitText(seconds: number, units: ContactFormCopy["waitUnits"]): string {
  if (seconds < 60) return seconds <= 1 ? units.second : units.seconds.replace("{n}", String(seconds));
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? units.minute : units.minutes.replace("{n}", String(minutes));
}

type ContactFormProps = {
  copy: ContactFormCopy;
  /** Slug (o título antiguo) del servicio a preseleccionar. */
  defaultService?: string | null;
};

export function ContactForm({ copy, defaultService }: ContactFormProps) {
  const locale = useLocale();
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");
  const preselected = resolveServiceSlug(defaultService) ?? "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    setState("sending");
    setMessage("");
    try {
      const response = await fetch("/api/contact/", { method: "POST", body: new FormData(form) });
      const data: { code?: string } = await response.json().catch(() => ({}));
      if (!response.ok) {
        const wait = response.status === 429 ? parseRetryAfter(response.headers.get("Retry-After")) : null;
        // El cliente traduce el código; el `message` de la API queda solo por compatibilidad.
        const known = isContactErrorCode(data.code) ? copy.errors[data.code] : null;
        throw new Error(wait !== null ? copy.rateLimitedWait.replace("{wait}", waitText(wait, copy.waitUnits)) : known ?? copy.generic);
      }
      setState("success");
      setMessage(copy.success);
      form.reset();
    } catch (error) {
      setState("error");
      // `fetch` lanza TypeError (mensaje técnico en inglés) cuando no hay red.
      setMessage(error instanceof TypeError ? copy.network : error instanceof Error && error.message ? error.message : copy.generic);
    }
  }

  return (
    <form className="contact-form" onSubmit={submit} noValidate>
      <div className="form-row">
        <label>{copy.name}<input name="name" autoComplete="name" minLength={2} required placeholder={copy.namePlaceholder} /></label>
        <label>{copy.email}<input name="email" type="email" autoComplete="email" required placeholder={copy.emailPlaceholder} /></label>
      </div>
      <label>{copy.service}
        {/* `key` fuerza el valor por defecto si cambia `?servicio=` sin recargar la página. */}
        <select key={preselected} name="service" defaultValue={preselected}>
          <option value="" disabled>{copy.servicePlaceholder}</option>
          {services.map((service) => <option key={service.slug} value={service.slug}>{service.title[locale]}</option>)}
          <option value={OTHER_SERVICE}>{otherServiceLabel[locale]}</option>
        </select>
      </label>
      <label>{copy.message}<textarea name="message" minLength={20} required rows={6} placeholder={copy.messagePlaceholder} /></label>
      <label className="honeypot" aria-hidden="true">{copy.honeypot}<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <button className="button" type="submit" disabled={state === "sending"}>{state === "sending" ? copy.sending : copy.submit}</button>
      {/* Región viva siempre presente para que los lectores de pantalla anuncien el cambio. */}
      <p className={message ? `form-message ${state}` : "sr-only"} role="status">{message}</p>
    </form>
  );
}

/** Variante para `/contacto/`: lee `?servicio=<slug>` de la URL. Debe ir dentro de `<Suspense>`. */
export function ContactFormFromQuery({ copy }: { copy: ContactFormCopy }) {
  const searchParams = useSearchParams();
  return <ContactForm copy={copy} defaultService={searchParams.get("servicio")} />;
}
