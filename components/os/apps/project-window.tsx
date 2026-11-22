"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { format } from "@/content/format";
import { useOsActions, useOsDetails, useOsStatic } from "../os-context";
import { CreditBadge } from "./credit-badge";
import { ProjectDetailBody } from "./project-detail";
import styles from "./apps.module.css";

/**
 * Contenido de una ventana de proyecto (núcleo). Cabecera desde el índice lean (categoría, año,
 * estado, crédito, resumen, capturas); el detalle (datos, reto, solución, rol, servicios, tecnologías,
 * enlaces) lo entrega la ruta del slug como DATOS (`ProjectDetailPublisher`) y el shell los conserva por slug en
 * `OsDetailsContext`; cada ventana pinta los de su propio slug. Sin detalle todavía: estado de carga. El pie lleva «Ver página pública» (enlace
 * real) e «Iniciar un proyecto» (abre Contacto).
 */
export default function ProjectWindow({ slug }: { slug: string }) {
  const { projects, copy } = useOsStatic();
  const details = useOsDetails();
  const actions = useOsActions();
  const project = projects.find((item) => item.slug === slug);
  const detail = details.get(slug);
  // Normalmente el detalle llega con la navegacion a la ruta del slug; si no llega (p. ej. Next descarto esa
  // navegacion al llegar otra) se pide bajo demanda, tras un margen para no duplicar la peticion habitual.
  const { load } = details;
  const known = project !== undefined;
  useEffect(() => {
    if (detail || !known) return;
    const timer = setTimeout(() => load(slug), 600);
    return () => clearTimeout(timer);
  }, [detail, known, load, slug]);
  if (!project) return <p className={styles.page} role="alert">{copy.errors.projectNotFound}</p>;
  const others = project.credits.filter((credit) => !credit.self);
  return (
    <article className={styles.page}>
      <section aria-label={copy.project.captures}>
        <ul className={styles.shots}>
          <li>
            <figure className={styles.shot}>
              <Image className={styles.cover} src={project.image} alt={format(copy.project.captureAlt, { title: project.title })} width={640} height={400} sizes="(max-width: 768px) 100vw, 640px"/>
            </figure>
          </li>
        </ul>
      </section>
      <p className={styles.meta}>
        <span>{project.category}</span>
        <span>{project.year}</span>
        <span className={styles.status}>{project.status}</span>
        <CreditBadge ownership={project.ownership} credits={project.credits} copy={copy.project}/>
      </p>
      <p className={styles.text}>{project.summary}</p>
      {others.length > 0 ? (
        <section className={styles.section} aria-label={copy.project.creditsList}>
          <h3 className={styles.heading}>{copy.project.credit}</h3>
          <ul className={styles.credits}>
            {project.credits.map((credit) => (
              <li key={credit.name}>
                {credit.href ? (
                  <a className={styles.link} href={credit.href} target="_blank" rel="noopener noreferrer" aria-label={format(copy.project.githubLink, { name: credit.name })}>{credit.name}</a>
                ) : <span>{credit.name}</span>}
                <span className={styles.role}>{credit.role}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {details.slotSlug === slug && details.slot ? details.slot : detail ? <ProjectDetailBody data={detail}/> : <p className={styles.muted} role="status">{copy.window.loading}</p>}
      <div className={styles.footer}>
        <Link className={`xp-button ${styles.linkbutton}`} href={project.publicHref} prefetch={false}>{copy.project.viewPublic}</Link>
        <button type="button" className="xp-button" onClick={() => actions.open("contact")}>{copy.project.startProject}</button>
      </div>
    </article>
  );
}
