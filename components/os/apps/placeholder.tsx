"use client";

import { projectWindowId, type AppId } from "@/lib/os/window-reducer";
import { useOsActions, useOsStatic } from "../os-context";
import styles from "./apps.module.css";

/**
 * Marcador de las apps cuyo contenido real llega en O7 (galería, Servicios, Sobre mí, Contacto,
 * Multimedia, Terminal, Propiedades). Mientras tanto "Mi trabajo" lista el catálogo para poder abrir
 * las ventanas de proyecto (la galería con filtros y badges sustituye esta lista).
 */
export default function AppPlaceholder({ id }: { id: AppId }) {
  const { copy, projects } = useOsStatic();
  const actions = useOsActions();
  return (
    <div className={styles.page}>
      <p className={styles.muted}>{copy.apps[id].file}</p>
      {id === "projects" ? (
        <ul className={styles.buttons} aria-label={copy.fallback.projectsTitle}>
          {projects.map((project) => (
            <li key={project.slug}>
              <button type="button" className="xp-button" onClick={() => actions.open(projectWindowId(project.slug))}>{project.title}</button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
