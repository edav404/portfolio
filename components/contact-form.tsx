"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OTHER_SERVICE, otherServiceLabel, resolveServiceSlug, services } from "@/content/services";
import type { Locale } from "@/content/types";

type FormState = "idle" | "sending" | "success" | "error";

/** `Retry-After` puede venir en segundos o como fecha HTTP. Devuelve segundos o `null`. */
function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

function waitText(seconds: number): string {
  if (seconds < 60) return seconds <= 1 ? "1 segundo" : `${seconds} segundos`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "1 minuto" : `${minutes} minutos`;
}

type ContactFormProps = {
  /** Slug (o título antiguo) del servicio a preseleccionar. */
  defaultService?: string | null;
  locale?: Locale;
};

export function ContactForm({ defaultService, locale = "es" }: ContactFormProps) {
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
      const data: { message?: string } = await response.json().catch(() => ({}));
      if (response.status === 429) {
        const wait = parseRetryAfter(response.headers.get("Retry-After"));
        throw new Error(wait !== null
          ? `Has enviado varios mensajes seguidos. Podrás intentarlo de nuevo en ${waitText(wait)}. Si es urgente, escríbeme por WhatsApp.`
          : data.message || "Se alcanzó el límite de envíos. Intenta de nuevo más tarde o escríbeme por WhatsApp.");
      }
      if (!response.ok) throw new Error(data.message || "No fue posible enviar el mensaje.");
      setState("success");
      setMessage("Mensaje enviado. Te responderé tan pronto como sea posible.");
      form.reset();
    } catch (error) {
      setState("error");
      // `fetch` lanza TypeError (mensaje técnico en inglés) cuando no hay red.
      setMessage(error instanceof TypeError ? "No hay conexión con el servidor. Revisa tu red e intenta de nuevo."
        : error instanceof Error && error.message ? error.message : "Ocurrió un error. Intenta de nuevo.");
    }
  }

  return (
    <form className="contact-form" onSubmit={submit} noValidate>
      <div className="form-row">
        <label>Nombre<input name="name" autoComplete="name" minLength={2} required placeholder="¿Cómo te llamas?" /></label>
        <label>Correo<input name="email" type="email" autoComplete="email" required placeholder="tu@correo.com" /></label>
      </div>
      <label>Tipo de proyecto
        {/* `key` fuerza el valor por defecto si cambia `?servicio=` sin recargar la página. */}
        <select key={preselected} name="service" defaultValue={preselected}>
          <option value="" disabled>Selecciona una opción</option>
          {services.map((service) => <option key={service.slug} value={service.slug}>{service.title[locale]}</option>)}
          <option value={OTHER_SERVICE}>{otherServiceLabel[locale]}</option>
        </select>
      </label>
      <label>Cuéntame sobre la idea<textarea name="message" minLength={20} required rows={6} placeholder="Objetivo, alcance, fechas y cualquier contexto útil…" /></label>
      <label className="honeypot" aria-hidden="true">Sitio web<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <button className="button" type="submit" disabled={state === "sending"}>{state === "sending" ? "Enviando…" : "Enviar mensaje"}</button>
      {/* Región viva siempre presente para que los lectores de pantalla anuncien el cambio. */}
      <p className={message ? `form-message ${state}` : "sr-only"} role="status">{message}</p>
    </form>
  );
}

/** Variante para `/contacto/`: lee `?servicio=<slug>` de la URL. Debe ir dentro de `<Suspense>`. */
export function ContactFormFromQuery() {
  const searchParams = useSearchParams();
  return <ContactForm defaultService={searchParams.get("servicio")} />;
}
