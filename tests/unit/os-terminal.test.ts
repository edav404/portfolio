import { describe, expect, it } from "vitest";
import { OPENABLE, resolveApp, runCommand, type TerminalContext } from "@/lib/os/terminal";

const ctx: TerminalContext = {
  text: { opening: "Abriendo {app}.exe", requested: "Pedido {app}.exe", unknown: "'{input}' desconocido", unknownApp: "Sin app '{app}': {list}" },
  whoami: "Ana: Dev, Medellín.",
  skills: "React · Next.js",
  now: () => "hoy",
};

describe("resolveApp", () => {
  it("acepta ids, alias y .exe, sin distinguir mayúsculas", () => {
    expect(resolveApp("projects")).toBe("projects");
    expect(resolveApp("WORK")).toBe("projects");
    expect(resolveApp("music")).toBe("media");
    expect(resolveApp("Settings.exe")).toBe("settings");
    expect(resolveApp("nada")).toBeNull();
    expect(resolveApp("constructor")).toBeNull();
  });

  it("todo OPENABLE se resuelve a sí mismo", () => {
    for (const id of OPENABLE) expect(resolveApp(id)).toBe(id);
  });
});

describe("runCommand", () => {
  it("una entrada vacía no hace nada", () => {
    expect(runCommand("   ", ctx)).toEqual({ lines: [] });
  });

  it("clear/cls limpian sin eco", () => {
    expect(runCommand("clear", ctx)).toEqual({ lines: [], clear: true });
    expect(runCommand("CLS", ctx).clear).toBe(true);
  });

  it("help, whoami, skills y date responden con eco del comando", () => {
    expect(runCommand("help", ctx).lines[0]).toEqual({ type: "command", text: "C:\\EDAV> help" });
    expect(runCommand("help", ctx).lines[1].text).toContain("open <app>");
    expect(runCommand("whoami", ctx).lines[1].text).toBe("Ana: Dev, Medellín.");
    expect(runCommand("skills", ctx).lines[1].text).toBe("React · Next.js");
    expect(runCommand("date", ctx).lines[1].text).toBe("hoy");
  });

  it("projects, services, contact y music abren su app", () => {
    expect(runCommand("projects", ctx).open).toBe("projects");
    expect(runCommand("services", ctx).open).toBe("services");
    expect(runCommand("contact", ctx).open).toBe("contact");
    const music = runCommand("music", ctx);
    expect(music.open).toBe("media");
    expect(music.lines[1].text).toBe("Abriendo music.exe");
  });

  it("open <app> abre apps válidas y rechaza las demás", () => {
    expect(runCommand("open work", ctx).open).toBe("projects");
    expect(runCommand("open about", ctx).open).toBe("about");
    const bad = runCommand("open nada", ctx);
    expect(bad.open).toBeUndefined();
    expect(bad.lines[1]).toMatchObject({ type: "error" });
    expect(bad.lines[1].text).toContain("nada");
  });

  it("un comando desconocido es un error con el texto original", () => {
    const result = runCommand("Foo Bar", ctx);
    expect(result.lines[1]).toEqual({ type: "error", text: "'Foo Bar' desconocido" });
  });
});
