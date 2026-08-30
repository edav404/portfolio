"use client";

import { FormEvent, useRef, useState } from "react";

type Line = { type: "command" | "output" | "error"; text: string };

const help = ["help", "whoami", "skills", "projects", "services", "contact", "music", "date", "clear", "open <app>"];

export function TerminalApp({ onOpen }: { onOpen: (id: string) => void }) {
  const [lines, setLines] = useState<Line[]>([
    { type: "output", text: "EDAV Command Prompt [Version 98.04.04]" },
    { type: "output", text: "Escribe HELP para listar los comandos disponibles." },
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
    else if (command === "whoami") next.push({ type: "output", text: "Emmanuel Dávila — Full Stack Developer & Web Designer, Medellín CO." });
    else if (command === "skills") next.push({ type: "output", text: "TypeScript · React · Next.js · Node.js · WordPress · WooCommerce · Shopify · PostgreSQL · Figma" });
    else if (command === "date") next.push({ type: "output", text: new Intl.DateTimeFormat("es-CO", { dateStyle: "full", timeStyle: "medium" }).format(new Date()) });
    else if (["projects", "services", "contact", "music"].includes(command)) { onOpen(command === "music" ? "media" : command); next.push({ type: "output", text: `Abriendo ${command}.exe...` }); }
    else if (command.startsWith("open ")) { const id = command.slice(5).replace("work", "projects").replace("about", "about"); onOpen(id); next.push({ type: "output", text: `Solicitud enviada: ${id}.exe` }); }
    else next.push({ type: "error", text: `'${input}' no se reconoce como comando. Escribe HELP.` });
    if (command !== "clear" && command !== "cls") setLines((current) => [...current, ...next]);
    event.currentTarget.reset();
  }

  return <div className="os-terminal" onClick={() => inputRef.current?.focus()}>
    <div className="os-terminal-lines" aria-live="polite">{lines.map((line, index) => <p className={line.type} key={`${line.text}-${index}`}>{line.text}</p>)}</div>
    <form onSubmit={execute}><label htmlFor="terminal-command">C:\EDAV&gt;</label><input ref={inputRef} id="terminal-command" name="command" autoComplete="off" spellCheck="false" aria-label="Comando de terminal" autoFocus/></form>
  </div>;
}
