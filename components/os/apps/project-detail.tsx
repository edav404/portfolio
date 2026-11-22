"use client";

import { useContext, useEffect, useRef } from "react";
import { format } from "@/content/format";
import { OsDetailsContext, useOsStatic } from "../os-context";
import styles from "./apps.module.css";

/**
 * Detalle de UN proyecto como DATOS serializables identificados por slug (no como elementos de React):
 * el slot `children` de Next resuelve siempre el segmento vigente, así que reutilizar el elemento de una
 * ruta anterior dentro de otra ventana mostraría el contenido de la ruta activa (docs/arquitectura-os.md §1.2).
 */
export type ProjectDetailData = {
  client: string;
  location: string;
  challenge: string;
  solution: string;
  myRole?: string;
  services: string[];
  technologies: string[];
  links: { href: string; label: string }[];
};

/**
 * Lo que monta la página del slug (solo ese proyecto) y el shell coloca UNA sola vez, dentro de la ventana
 * de la ruta activa (así el HTML del servidor ya lleva el detalle). Pinta el cuerpo y además entrega los
 * datos al shell (registro idempotente durante el render, aviso en un efecto): las ventanas de otras rutas
 * pintan desde esos datos, nunca desde este elemento.
 */
export function ProjectDetailPublisher({ slug, data }: { slug: string; data: ProjectDetailData }) {
  const store = useContext(OsDetailsContext);
  store.publish(slug, data);
  // `store` cambia de identidad con cada aviso: se lee por ref para avisar solo cuando llegan datos nuevos (sin bucle).
  const latest = useRef(store);
  useEffect(() => { latest.current = store; });
  useEffect(() => { latest.current.notify(); }, [slug, data]);
  return <ProjectDetailBody data={data}/>;
}

/** Cuerpo del detalle, renderizado por la ventana de su propio slug desde los datos. */
export function ProjectDetailBody({ data }: { data: ProjectDetailData }) {
  const { copy } = useOsStatic();
  const labels = copy.project;
  return (
    <>
      <dl className={styles.facts}>
        <div><dt>{labels.client}</dt><dd>{data.client}</dd></div>
        <div><dt>{labels.location}</dt><dd>{data.location}</dd></div>
      </dl>
      <section className={styles.section}>
        <h3 className={styles.heading}>{labels.challenge}</h3>
        <p className={styles.text}>{data.challenge}</p>
      </section>
      <section className={styles.section}>
        <h3 className={styles.heading}>{labels.solution}</h3>
        <p className={styles.text}>{data.solution}</p>
      </section>
      {data.myRole ? (
        <section className={styles.section}>
          <h3 className={styles.heading}>{labels.myRole}</h3>
          <p className={styles.text}>{data.myRole}</p>
        </section>
      ) : null}
      <section className={styles.section}>
        <h3 className={styles.heading}>{labels.services}</h3>
        <ul className={styles.list}>{data.services.map((service) => <li key={service}>{service}</li>)}</ul>
      </section>
      <section className={styles.section}>
        <h3 className={styles.heading}>{labels.technologies}</h3>
        <ul className={styles.chips}>{data.technologies.map((tech) => <li key={tech} className={styles.chip}>{tech}</li>)}</ul>
      </section>
      {data.links.length > 0 ? (
        <section className={styles.section}>
          <h3 className={styles.heading}>{labels.links}</h3>
          <ul className={styles.list}>
            {data.links.map((link) => (
              <li key={link.href}>
                <a className={styles.link} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={format(labels.externalLink, { label: link.label })}>{link.label}</a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
