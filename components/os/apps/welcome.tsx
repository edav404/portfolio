"use client";

import { useOsActions, useOsStatic } from "../os-context";
import styles from "./apps.module.css";

/** Ventana Welcome (núcleo: entra en el HTML inicial de `/os/`). */
export default function Welcome() {
  const { welcome } = useOsStatic();
  const actions = useOsActions();
  return (
    <div className={styles.page}>
      <p className={styles.kicker}>{welcome.kicker}</p>
      <h3 className={styles.title}>{welcome.title}</h3>
      <p className={styles.text}>{welcome.intro}</p>
      <div className={styles.actions}>
        <button type="button" className="xp-button" onClick={() => actions.open("projects")}>{welcome.exploreWork}</button>
        <button type="button" className="xp-button" onClick={() => actions.open("contact")}>{welcome.startProject}</button>
      </div>
      <p className={styles.muted}>{welcome.projectsCount}</p>
    </div>
  );
}
