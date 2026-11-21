"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { OTHER_SERVICE, otherServiceLabel, resolveServiceSlug, services } from "@/content/services";
import { failureMessage } from "@/lib/os/contact-submit";
import { useCloseConfirm, useWindowGuard, useWindowId } from "../window-guard";
import { useOsActions, useOsStatic } from "../os-context";
import { getContactPrefill, getServerContactPrefill, subscribeContactPrefill } from "./contact-prefill";
import { useInitialControlFocus } from "./window-visibility";
import styles from "./app-ui.module.css";

type Status = "idle" | "sending" | "success" | "error";
type Draft = { name: string; email: string; service: string; message: string };
const EMPTY: Draft = { name: "", email: "", service: "", message: "" };

/**
 * Contacto: formulario real contra `/api/contact/` (honeypot incluido, errores por código). El borrador
 * vive en el estado de la ventana, que sigue montada al minimizar; mientras haya texto sin enviar la
 * ventana lo declara con `useWindowGuard` y el cierre (✕, Atrás, atajo) pide confirmación en línea.
 */
export default function Contact() {
  const { locale, copy } = useOsStatic();
  const actions = useOsActions();
  const id = useWindowId();
  const t = copy.contactApp;
  const form = copy.contactForm;
  const prefill = useSyncExternalStore(subscribeContactPrefill, getContactPrefill, getServerContactPrefill);
  const [draft, setDraft] = useState<Draft>(() => ({ ...EMPTY, service: resolveServiceSlug(prefill?.service) ?? "" }));
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState("");
  const firstField = useRef<HTMLInputElement>(null);
  const [appliedNonce, setAppliedNonce] = useState(prefill?.nonce ?? 0);
  const { asking, dismiss } = useCloseConfirm(id);
  const keepButton = useRef<HTMLButtonElement>(null);

  useInitialControlFocus(firstField);

  // Un nuevo «Pedir este servicio» con la ventana ya abierta cambia el servicio sin tocar lo escrito
  // (ajuste de estado durante el render, con guarda por el nonce).
  if (prefill && prefill.nonce !== appliedNonce) {
    setAppliedNonce(prefill.nonce);
    const service = resolveServiceSlug(prefill.service);
    if (service) setDraft((before) => ({ ...before, service }));
  }

  const dirty = status !== "success" && (draft.name !== "" || draft.email !== "" || draft.message !== "");
  useWindowGuard(dirty);
  useEffect(() => { if (asking) keepButton.current?.focus({ preventScroll: true }); }, [asking]);

  const update = (field: keyof Draft) => (event: { target: { value: string } }) => setDraft((before) => ({ ...before, [field]: event.target.value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    if (!element.reportValidity()) return;
    setStatus("sending");
    setFeedback("");
    try {
      const response = await fetch("/api/contact/", { method: "POST", body: new FormData(element) });
      const data: { code?: string } = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(failureMessage({ status: response.status, retryAfter: response.headers.get("Retry-After"), code: data.code }, form));
      }
      setStatus("success");
      setFeedback(form.success);
      setDraft({ ...EMPTY });
    } catch (error) {
      setStatus("error");
      // `fetch` lanza TypeError (mensaje técnico en inglés) cuando no hay red.
      setFeedback(error instanceof TypeError ? form.network : error instanceof Error && error.message ? error.message : form.generic);
    }
  }

  const confirmClose = () => { dismiss(); actions.close(id); };

  return (
    <div className={styles.page}>
      <header className={styles.section}>
        <p className={styles.kicker}>{t.kicker}</p>
        <h3 className={styles.title}>{t.title}</h3>
        <p className={styles.text}>{t.lead}</p>
        <p className={styles.hint}>{t.draftKept}</p>
      </header>
      {asking ? (
        <div className={styles.confirm} role="alertdialog" aria-labelledby="contact-unsaved-title" aria-describedby="contact-unsaved-body">
          <h3 id="contact-unsaved-title" className={styles.heading}>{copy.errors.unsavedTitle}</h3>
          <p id="contact-unsaved-body" className={styles.text}>{copy.errors.unsavedBody}</p>
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
