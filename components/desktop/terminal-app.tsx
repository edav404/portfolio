"use client";

import { FormEvent, useRef, useState } from "react";
import { format } from "@/content/format";
import { profile, technologies } from "@/content/profile";
import { intlLocale } from "@/content/routes";
import { useLocale } from "@/lib/i18n/locale-context";

/** Textos de la terminal (`ui.os.terminal`), resueltos por el servidor. */
export type TerminalCopy = { banner: string; hint: string; opening: string; requested: string; unknown: string; inputLabel: string };

type Line = { type: "command" | "output" | "error"; text: string };

const help = ["help", "whoami", "skills", "projects", "services", "contact", "music", "date", "clear", "open <app>"];

export function TerminalApp({ copy, onOpen }: { copy: TerminalCopy; onOpen: (id: string) => void }) {
  const locale = useLocale();
  const [lines, setLines] = useState<Line[]>([
    { type: "output", text: copy.banner },
    { type: "output", text: copy.hint },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);

  function execute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = new FormData(event.currentTarget).get("command")?.toString().trim() ?? "";
    if (!input) return;
    const command = input.toLowerCase();
    const next: Line[] = [{ type: "command", text: `C:\\EDAV> ${input}` }];
    if (command === "clear" || command === "cls") setLines([]);
    else if (command === "help") next.push({ type: "output", text: help.join("  ·  ") });
    else if (command === "whoami") next.push({ type: "output", text: `${profile.name} — ${profile.headline[locale]}, ${profile.location[locale]}.` });
    else if (command === "skills") next.push({ type: "output", text: technologies.join(" · ") });
    else if (command === "date") next.push({ type: "output", text: new Intl.DateTimeFormat(intlLocale[locale], { dateStyle: "full", timeStyle: "medium" }).format(new Date()) });
    else if (["projects", "services", "contact", "music"].includes(command)) { onOpen(command === "music" ? "media" : command); next.push({ type: "output", text: format(copy.opening, { app: command }) }); }
    else if (command.startsWith("open ")) { const id = command.slice(5).replace("work", "projects"); onOpen(id); next.push({ type: "output", text: format(copy.requested, { app: id }) }); }
    else next.push({ type: "error", text: format(copy.unknown, { input }) });
    if (command !== "clear" && command !== "cls") setLines((current) => [...current, ...next]);
    event.currentTarget.reset();
  }

  return <div className="os-terminal" onClick={() => inputRef.current?.focus()}>
    <div className="os-terminal-lines" aria-live="polite">{lines.map((line, index) => <p className={line.type} key={`${line.text}-${index}`}>{line.text}</p>)}</div>
    <form onSubmit={execute}><label htmlFor="terminal-command">C:\EDAV&gt;</label><input ref={inputRef} id="terminal-command" name="command" autoComplete="off" spellCheck="false" aria-label={copy.inputLabel} autoFocus/></form>
  </div>;
}
