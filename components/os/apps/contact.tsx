"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { OTHER_SERVICE, otherServiceLabel, resolveServiceSlug, services } from "@/content/services";
import { clearSent, failureMessage, isContactDirty, type ContactDraft } from "@/lib/os/contact-submit";
import { isUsableElement } from "../focus-manager";
import { useCloseConfirm, useWindowGuard, useWindowId } from "../window-guard";
import { useOsActions, useOsStatic } from "../os-context";
import { subscribeContactPrefill, takeContactPrefill } from "./contact-prefill";
import { useInitialControlFocus } from "./window-visibility";
import styles from "./app-ui.module.css";

type Status = "idle" | "sending" | "success" | "error";
type Draft = ContactDraft;
const EMPTY: Draft = { name: "", email: "", service: "", message: "" };

/**
 * Contacto: formulario real contra `/api/contact/` (honeypot incluido, errores por código). El borrador
 * vive en el estado de la ventana, que sigue montada al minimizar; mientras haya texto sin enviar la
 * ventana lo declara con `useWindowGuard` y el cierre (✕, Atrás, atajo) pide confirmación en línea.
 * `dirty` se calcula SIEMPRE sobre el borrador actual (también tras un envío exitoso). Los campos siguen
 * editables durante el envío; el éxito limpia solo la revisión enviada. El `fetch` se cancela al desmontar,
 * pero cerrar no revierte un POST que el servidor ya recibió (el aviso lo dice).
 */
export default function Contact() {
  const { locale, copy } = useOsStatic();
  const actions = useOsActions();
  const id = useWindowId();
  const t = copy.contactApp;
  const form = copy.contactForm;
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState("");
  const firstField = useRef<HTMLInputElement>(null);
  const { asking, dismiss } = useCloseConfirm(id);
  const keepButton = useRef<HTMLButtonElement>(null);
  const previousControl = useRef<HTMLElement | null>(null);
  const wasAsking = useRef(false);
  const closing = useRef(false);
  const controller = useRef<AbortController | null>(null);

  useInitialControlFocus(firstField);

  // «Pedir este servicio»: la preselección se CONSUME una vez (al montar o, con la ventana ya abierta o
  // minimizada, al instante) y no toca lo escrito.
  useEffect(() => {
    const apply = () => {
      const service = resolveServiceSlug(takeContactPrefill()?.service);
      if (service) setDraft((before) => ({ ...before, service }));
    };
    apply();
    return subscribeContactPrefill(apply);
  }, []);

  // Cerrar la ventana cancela el envío en curso (no revierte un POST que el servidor ya recibió).
  useEffect(() => () => controller.current?.abort(), []);

  const dirty = isContactDirty(draft);
  useWindowGuard(dirty);

  // Confirmación en línea: el foco entra en «Seguir editando» y, al desaparecer el aviso sin cerrar la
  // ventana, vuelve al control que lo tenía (o al primer campo si ya no se puede enfocar).
  useEffect(() => {
    if (asking) {
      const active = document.activeElement;
      previousControl.current = active instanceof HTMLElement && active !== document.body ? active : null;
      wasAsking.current = true;
      keepButton.current?.focus({ preventScroll: true });
    } else if (wasAsking.current) {
      wasAsking.current = false;
      if (closing.current) return;
      const active = document.activeElement;
      if (active === null || active === document.body || !isUsableElement(active as HTMLElement)) {
        const back = previousControl.current;
        (isUsableElement(back) ? back : firstField.current)?.focus({ preventScroll: true });
      }
    }
  }, [asking]);

  const update = (field: keyof Draft) => (event: { target: { value: string } }) => {
    setDraft((before) => ({ ...before, [field]: event.target.value }));
    // Editar tras un éxito: el mensaje de «enviado» deja de describir el formulario.
    if (status === "success") { setStatus("idle"); setFeedback(""); }
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    if (status === "sending" || !element.reportValidity()) return;
    const sent = draft;
    const request = new AbortController();
    controller.current = request;
    setStatus("sending");
    setFeedback("");
    try {
      const response = await fetch("/api/contact/", { method: "POST", body: new FormData(element), signal: request.signal });
      const data: { code?: string } = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(failureMessage({ status: response.status, retryAfter: response.headers.get("Retry-After"), code: data.code }, form));
      }
      if (request.signal.aborted) return;
      setStatus("success");
      setFeedback(form.success);
      setDraft((current) => clearSent(current, sent));
    } catch (error) {
      if (request.signal.aborted) return;
      setStatus("error");
      // `fetch` lanza TypeError (mensaje técnico en inglés) cuando no hay red.
      setFeedback(error instanceof TypeError ? form.network : error instanceof Error && error.message ? error.message : form.generic);
    }
  }

  const confirmClose = () => { closing.current = true; dismiss(); actions.close(id); };

  return (
    <div className={styles.page}>
      <header className={styles.section}>
        <p className={styles.kicker}>{t.kicker}</p>
        <h3 className={styles.title}>{t.title}</h3>
        <p className={styles.text}>{t.lead}</p>
        <p className={styles.hint}>{t.draftKept}</p>
      </header>
      {asking ? (
        <div className={styles.confirm} role="region" aria-labelledby="contact-unsaved-title">
          <h3 id="contact-unsaved-title" className={styles.heading}>{copy.errors.unsavedTitle}</h3>
          <p className={styles.text}>{copy.errors.unsavedBody}</p>
          {status === "sending" ? <p className={styles.text}>{copy.errors.unsavedSending}</p> : null}
          <div className={styles.actions}>
            <button ref={keepButton} type="button" className="xp-button" onClick={dismiss}>{copy.errors.unsavedKeep}</button>
            <button type="button" className="xp-button" onClick={confirmClose}>{copy.errors.unsavedDiscard}</button>
          </div>
        </div>
      ) : null}
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.row}>
          <label className={styles.label}>{form.name}
            <input ref={firstField} className={`xp-field ${styles.field}`} name="name" autoComplete="name" minLength={2} required placeholder={form.namePlaceholder} value={draft.name} onChange={update("name")}/>
          </label>
          <label className={styles.label}>{form.email}
            <input className={`xp-field ${styles.field}`} name="email" type="email" autoComplete="email" required placeholder={form.emailPlaceholder} value={draft.email} onChange={update("email")}/>
          </label>
        </div>
        <label className={styles.label}>{form.service}
          <select className={`xp-field ${styles.field}`} name="service" value={draft.service} onChange={update("service")}>
            <option value="" disabled>{form.servicePlaceholder}</option>
            {services.map((service) => <option key={service.slug} value={service.slug}>{service.title[locale]}</option>)}
            <option value={OTHER_SERVICE}>{otherServiceLabel[locale]}</option>
          </select>
        </label>
        <label className={styles.label}>{form.message}
          <textarea className={`xp-field ${styles.field} ${styles.textarea}`} name="message" minLength={20} required rows={6} placeholder={form.messagePlaceholder} value={draft.message} onChange={update("message")}/>
        </label>
        <label className={styles.honeypot} aria-hidden="true">{form.honeypot}<input name="website" tabIndex={-1} autoComplete="off"/></label>
        <div className={styles.actions}>
          <button className="xp-button" type="submit" disabled={status === "sending"}>{status === "sending" ? form.sending : form.submit}</button>
        </div>
        {/* Región viva siempre presente para que los lectores de pantalla anuncien el cambio. */}
        <p className={feedback ? styles.message : "xp-visually-hidden"} data-state={status} role="status">{feedback}</p>
      </form>
    </div>
  );
}
