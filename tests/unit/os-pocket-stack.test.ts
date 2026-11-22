import { describe, expect, it } from "vitest";
import { needsFocusRecovery, pocketScreen } from "@/lib/os/pocket";
import { requestClose, activeId, createInitialState, reduce, reduceWithHistory, type OsState } from "@/lib/os/window-reducer";
import { planHistory } from "@/lib/os/window-url";

const known = ["a", "b"] as const;
const start = (path = "/os/"): OsState => createInitialState({ path, knownSlugs: known });
const open = (s: OsState, id: "contact" | "about" | "project:a") => reduce(s, { type: "OPEN", id });

describe("Pocket: pila local y pantalla activa", () => {
  it("sin ventanas abiertas la pantalla es el lanzador", () => {
    const s = reduce(start(), { type: "CLOSE_ALL" });
    expect(pocketScreen(s)).toEqual({ kind: "launcher" });
  });

  it("Atrás de la ventana superior apunta a la inferior de la pila; sin inferior, al lanzador", () => {
    const welcomeOnly = start();
    expect(pocketScreen(welcomeOnly)).toEqual({ kind: "window", id: "welcome", back: { kind: "launcher" } });
    const stacked = open(welcomeOnly, "about");
    expect(pocketScreen(stacked)).toEqual({ kind: "window", id: "about", back: { kind: "window", id: "welcome" } });
  });

  it("POCKET_BACK cierra solo la superior y deja la inferior activa (pila local)", () => {
    const s0 = open(open(start(), "about"), "contact");
    const s1 = reduce(s0, { type: "POCKET_BACK" });
    expect(activeId(s1)).toBe("about");
    expect(s1.windows.contact).toBeUndefined();
    expect(activeId(reduce(s1, { type: "POCKET_BACK" }))).toBe("welcome");
  });

  it("las apps locales no crean ni sustituyen entradas de historial (ni push ni back)", () => {
    const s0 = start();
    const opened = reduceWithHistory(s0, { type: "OPEN", id: "contact" }, "es");
    expect(opened.plan.kind).toBe("none");
    const closed = reduceWithHistory(opened.state, { type: "POCKET_BACK" }, "es");
    expect(closed.plan.kind).toBe("none");
  });

  it("entrada directa a un proyecto: Atrás cierra al lanzador con un replace a /os/, nunca back()", () => {
    const direct = start("/os/proyectos/a/");
    expect(activeId(direct)).toBe("project:a");
    expect(pocketScreen(direct)).toEqual({ kind: "window", id: "project:a", back: { kind: "launcher" } });
    const { state, plan } = reduceWithHistory(direct, { type: "POCKET_BACK" }, "es");
    expect(activeId(state)).toBeNull();
    expect(plan).toEqual({ kind: "replace", href: "/os/", options: { scroll: false } });
    // El plan solo conoce push/replace/none: no existe una orden de retroceso.
    expect(["none", "push", "replace"]).toContain(planHistory(direct, state, { type: "POCKET_BACK" }, "es").kind);
  });

  it("Atrás, ✕ y Escape comparten la política: pocket => POCKET_BACK, con borrador pide confirmación", () => {
    expect(requestClose("contact", { pocket: true })).toEqual({ confirm: false, action: { type: "POCKET_BACK" } });
    expect(requestClose("contact", { pocket: true, dirty: true }).confirm).toBe(true);
    expect(requestClose("contact", { pocket: false }).action).toEqual({ type: "CLOSE", id: "contact" });
  });

  it("minimizar en escritorio no pierde ventanas al volver: siguen en el estado", () => {
    const s = reduce(open(start(), "about"), { type: "MINIMIZE", id: "about" });
    expect(Object.keys(s.windows)).toContain("about");
    expect(pocketScreen(s)).toMatchObject({ kind: "window", id: "welcome" });
  });
});

describe("Pocket: foco", () => {
  it("solo se recupera el foco si estaba en una ventana y no queda un elemento utilizable", () => {
    expect(needsFocusRecovery({ hadFocusInWindow: true, activeIsUsable: false })).toBe(true);
    expect(needsFocusRecovery({ hadFocusInWindow: true, activeIsUsable: true })).toBe(false);
    expect(needsFocusRecovery({ hadFocusInWindow: false, activeIsUsable: false })).toBe(false);
  });
});
