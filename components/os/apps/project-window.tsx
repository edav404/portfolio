"use client";

import Image from "next/image";
import Link from "next/link";
import { useOsActions, useOsDetails, useOsStatic } from "../os-context";
import styles from "./apps.module.css";

/**
 * Contenido de una ventana de proyecto (núcleo). Cabecera desde el índice lean; el detalle
 * (reto, solución, servicios…) lo entrega la ruta del slug como `children` del layout y el shell lo
 * conserva en `OsDetailsContext`. Sin detalle todavía: estado de carga.
 */
export default function ProjectWindow({ slug }: { slug: string }) {
  const { projects, copy } = useOsStatic();
  const details = useOsDetails();
  const actions = useOsActions();
  const project = projects.find((item) => item.slug === slug);
  if (!project) return <p className={styles.page} role="alert">{copy.fallback.backToOs}</p>;
  const detail = details[slug];
  return (
    <article className={styles.page}>
      <Image className={styles.cover} src={project.image} alt={project.alt} width={640} height={400} sizes="(max-width: 768px) 100vw, 640px"/>
      <p className={styles.muted}>{project.category} · {project.year}</p>
      <p className={styles.text}>{project.summary}</p>
      {detail ?? <p className={styles.muted} role="status">{copy.window.loading}</p>}
      <div className={styles.footer}>
        <Link className={`xp-button ${styles.linkbutton}`} href={project.publicHref} prefetch={false}>{copy.project.viewPublic}</Link>
        <button type="button" className="xp-button" onClick={() => actions.open("contact")}>{copy.project.startProject}</button>
      </div>
    </article>
  );
}
