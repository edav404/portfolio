"use client";

import { useOsCommands, useOsPrefs } from "../os-commands";
import { useOsStatic } from "../os-context";
import styles from "./app-ui.module.css";

/**
 * Propiedades: sonido, efecto de pantalla, asistente y atajos opt-in (preferencias de `lib/os/prefs`,
 * persistidas por el shell) más «Restablecer ventanas» y la ayuda de atajos.
 */
export default function Settings() {
  const { copy } = useOsStatic();
  const prefs = useOsPrefs();
  const commands = useOsCommands();
  const t = copy.settings;
  const k = copy.shortcuts;
  const shortcuts = [
    [k.keyStart, k.openStart],
    [k.keyTaskbar, k.focusTaskbar],
    [k.keyDesktop, k.focusDesktop],
    [k.keyCycle, k.cycleWindows],
    [k.keyClose, k.closeWindow],
    [k.keyHelp, k.help],
  ] as const;
  return (
    <div className={styles.page}>
      <h3 className={styles.title}>{t.title}</h3>
      <fieldset className={styles.group}>
        <legend>{t.soundGroup}</legend>
        <label className={styles.check}>
          <input type="checkbox" checked={prefs.sound} onChange={(event) => commands.setPref({ sound: event.target.checked })}/>
          {t.sound}
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={prefs.screenEffect} onChange={(event) => commands.setPref({ screenEffect: event.target.checked })}/>
          {t.screenEffect}
        </label>
      </fieldset>
      <fieldset className={styles.group}>
        <legend>{t.assistantGroup}</legend>
        <label className={styles.check}>
          <input type="checkbox" checked={prefs.assistant === "clippy"} onChange={(event) => commands.setPref({ assistant: event.target.checked ? "clippy" : "none" })}/>
          {t.assistant}
        </label>
      </fieldset>
      <fieldset className={styles.group}>
        <legend>{t.keyboardGroup}</legend>
        <label className={styles.check}>
          <input type="checkbox" checked={prefs.shortcuts} aria-describedby="os-shortcuts-help" onChange={(event) => commands.setPref({ shortcuts: event.target.checked })}/>
          {k.optIn}
        </label>
        <p id="os-shortcuts-help" className={styles.hint}>{k.optInHelp}</p>
        <section aria-label={t.shortcutsList}>
          <h4 className={styles.heading}>{k.title}</h4>
          <dl className={styles.keys}>
            {shortcuts.map(([keys, label]) => (
              <div key={keys} className={styles.keyrow}>
                <dt>{keys}</dt>
                <dd>{label}</dd>
              </div>
            ))}
          </dl>
        </section>
      </fieldset>
      <fieldset className={styles.group}>
        <legend>{t.windowsGroup}</legend>
        <div className={styles.actions}>
          <button type="button" className="xp-button" onClick={commands.resetWindows}>{t.resetWindows}</button>
        </div>
      </fieldset>
    </div>
  );
}
