"use client";

import { useState } from "react";
import { format } from "@/content/format";
import { contactHrefForService, services } from "@/content/services";
import { useOsActions, useOsStatic } from "../os-context";
import { setContactPrefill } from "./contact-prefill";
import styles from "./app-ui.module.css";

/**
 * Servicios: lista a la izquierda, detalle a la derecha y CTA a Contacto. El CTA es un enlace real a
 * `contactHrefForService` (funciona sin JS y con «abrir en pestaña nueva»); con un clic normal abre la
 * ventana de Contacto con el servicio ya elegido.
 */
export default function Services() {
  const { locale, copy } = useOsStatic();
  const actions = useOsActions();
  const t = copy.servicesApp;
  const [slug, setSlug] = useState(services[0].slug);
  const service = services.find((item) => item.slug === slug) ?? services[0];
  const request = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setContactPrefill(service.slug);
    actions.open("contact");
  };
  return (
    <div className={styles.split}>
      <nav className={styles.side} aria-label={t.list}>
        <p className={styles.muted}>{t.intro}</p>
        <ul className={styles.choices}>
          {services.map((item) => (
            <li key={item.slug}>
              <button type="button" className={styles.choice} aria-current={item.slug === slug} onClick={() => setSlug(item.slug)}>
                {item.title[locale]}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <article className={styles.main} aria-labelledby="services-title">
        <h3 id="services-title" className={styles.title}>{service.title[locale]}</h3>
        <p className={styles.muted}>{service.kicker[locale]}</p>
        <p className={styles.text}>{service.description[locale]}</p>
        <section className={styles.section} aria-label={t.includes}>
          <h4 className={styles.heading}>{t.includes}</h4>
          <ul className={styles.list}>{service.includes[locale].map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
        <p className={styles.text}><strong>{t.stack}:</strong> {service.stack[locale]}</p>
        <div className={styles.actions}>
          <a
            className={`xp-button ${styles.linkbutton}`}
            href={contactHrefForService(service.slug, locale)}
            aria-label={format(t.requestAria, { service: service.title[locale] })}
            onClick={request}
          >
            {t.request}
          </a>
        </div>
      </article>
    </div>
  );
}
