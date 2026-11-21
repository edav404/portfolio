/**
 * Intérprete de la terminal del SO (comandos del escritorio anterior, adaptados). Puro: devuelve
 * las líneas a pintar y el efecto (limpiar, abrir una app); el copy y los datos llegan por parámetro.
 */
import { format } from "@/content/format";
import type { AppId } from "./window-reducer";

export type TerminalLine = { type: "command" | "output" | "error"; text: string };
export type TerminalResult = { lines: TerminalLine[]; clear?: boolean; open?: AppId };

export type TerminalText = { opening: string; requested: string; unknown: string; unknownApp: string };
export type TerminalContext = {
  text: TerminalText;
  /** Ya formateado: «Nombre: titular, ciudad.» */
  whoami: string;
  skills: string;
  /** Fecha y hora actuales ya formateadas. */
  now: () => string;
};

export const PROMPT = "C:\\EDAV>";
export const COMMANDS = ["help", "whoami", "skills", "projects", "services", "contact", "music", "date", "clear", "open <app>"] as const;
/** Apps que `open` acepta (el resto del SO se abre desde el escritorio). */
export const OPENABLE: readonly AppId[] = ["welcome", "projects", "about", "services", "contact", "media", "terminal", "settings"];

const ALIASES: Readonly<Record<string, AppId>> = { work: "projects", music: "media", player: "media", properties: "settings" };

export function resolveApp(name: string): AppId | null {
  const key = name.trim().toLowerCase().replace(/\.exe$/, "");
  if (Object.hasOwn(ALIASES, key)) return ALIASES[key];
  return (OPENABLE as readonly string[]).includes(key) ? (key as AppId) : null;
}

export function runCommand(input: string, ctx: TerminalContext): TerminalResult {
  const typed = input.trim();
  if (!typed) return { lines: [] };
  const command = typed.toLowerCase();
  const echo: TerminalLine = { type: "command", text: `${PROMPT} ${typed}` };
  const out = (text: string): TerminalLine => ({ type: "output", text });
  if (command === "clear" || command === "cls") return { lines: [], clear: true };
  if (command === "help") return { lines: [echo, out(COMMANDS.join("  ·  "))] };
  if (command === "whoami") return { lines: [echo, out(ctx.whoami)] };
  if (command === "skills") return { lines: [echo, out(ctx.skills)] };
  if (command === "date") return { lines: [echo, out(ctx.now())] };
  if (["projects", "services", "contact", "music"].includes(command)) {
    return { lines: [echo, out(format(ctx.text.opening, { app: command }))], open: resolveApp(command)! };
  }
  if (command.startsWith("open ")) {
    const name = command.slice(5).trim();
    const app = resolveApp(name);
    if (!app) return { lines: [echo, { type: "error", text: format(ctx.text.unknownApp, { app: name, list: OPENABLE.join(", ") }) }] };
    return { lines: [echo, out(format(ctx.text.requested, { app: name }))], open: app };
  }
  return { lines: [echo, { type: "error", text: format(ctx.text.unknown, { input: typed }) }] };
}
