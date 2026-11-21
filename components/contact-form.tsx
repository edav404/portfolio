"use client";

import { FormEvent, useState } from "react";

type FormState = "idle" | "sending" | "success" | "error";

export function ContactForm() {
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    setState("sending");
    setMessage("");
    try {
      const response = await fetch("/api/contact/", { method: "POST", body: new FormData(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No fue posible enviar el mensaje.");
      setState("success");
      setMessage("Mensaje enviado. Te responderé tan pronto como sea posible.");
      form.reset();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Ocurrió un error. Intenta de nuevo.");
    }
  }

  return (
    <form className="contact-form" onSubmit={submit} noValidate>
      <div className="form-row">
        <label>Nombre<input name="name" autoComplete="name" minLength={2} required placeholder="¿Cómo te llamas?" /></label>
        <label>Correo<input name="email" type="email" autoComplete="email" required placeholder="tu@correo.com" /></label>
      </div>
      <label>Tipo de proyecto<select name="service" defaultValue=""><option value="" disabled>Selecciona una opción</option><option>Desarrollo web</option><option>WordPress o WooCommerce</option><option>Shopify</option><option>Diseño web</option><option>Otro</option></select></label>
      <label>Cuéntame sobre la idea<textarea name="message" minLength={20} required rows={6} placeholder="Objetivo, alcance, fechas y cualquier contexto útil…" /></label>
      <label className="honeypot" aria-hidden="true">Sitio web<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <button className="button" type="submit" disabled={state === "sending"}>{state === "sending" ? "Enviando…" : "Enviar mensaje"}</button>
      {message && <p className={`form-message ${state}`} role="status">{message}</p>}
    </form>
  );
}
