"use client";

import { useRef, useState, type FormEvent } from "react";
import { format } from "@/content/format";
import { profile, technologies } from "@/content/profile";
import { intlLocale } from "@/content/routes";
import { PROMPT, runCommand, type TerminalLine } from "@/lib/os/terminal";
import { useOsActions, useOsStatic } from "../os-context";
import { useInitialControlFocus } from "./window-visibility";
import styles from "./terminal.module.css";

/**
 * Terminal: los comandos del escritorio anterior (help, whoami, skills, projects, services, contact,
 * music, date, clear, open <app>), interpretados por `lib/os/terminal.ts`. `initialFocus: "control"`.
 */
export default function Terminal() {
  const { locale, copy } = useOsStatic();
  const actions = useOsActions();
  const t = copy.terminal;
  const [lines, setLines] = useState<TerminalLine[]>(() => [
    { type: "output", text: t.banner },
    { type: "output", text: t.hint },
  ]);
  const input = useRef<HTMLInputElement>(null);
  useInitialControlFocus(input);

  function execute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const typed = new FormData(form).get("command")?.toString() ?? "";
    form.reset();
    const result = runCommand(typed, {
      text: t,
      whoami: format(t.whoami, { name: profile.name, headline: profile.headline[locale], location: profile.location[locale] }),
      skills: technologies.join(" · "),
      now: () => new Intl.DateTimeFormat(intlLocale[locale], { dateStyle: "full", timeStyle: "medium" }).format(new Date()),
    });
    if (result.clear) setLines([]);
    else if (result.lines.length > 0) setLines((current) => [...current, ...result.lines]);
    if (result.open) actions.open(result.open);
  }

  return (
    <div className={styles.terminal} onClick={() => { if (!window.getSelection()?.toString()) input.current?.focus(); }}>
      <div className={styles.lines} role="log" aria-label={t.history}>
        {lines.map((line, index) => (
          <p key={`${index}-${line.text}`} className={`${styles.line} ${line.type === "error" ? styles.error : line.type === "command" ? styles.command : ""}`}>{line.text}</p>
        ))}
      </div>
      <form className={styles.prompt} onSubmit={execute}>
        <label htmlFor="os-terminal-command">{PROMPT}</label>
        <input ref={input} id="os-terminal-command" className={styles.input} name="command" autoComplete="off" autoCapitalize="off" spellCheck={false} aria-label={t.inputLabel}/>
      </form>
    </div>
  );
}
