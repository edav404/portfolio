import { describe, expect, it } from "vitest";
import { hrefFor } from "@/content/routes";
import { hrefForTarget, intentFromPath, isOsPath, planHistory, samePath } from "@/lib/os/window-url";
import {
  activeId, createInitialState, reduce, reduceWithHistory, type Action, type OsState,
} from "@/lib/os/window-reducer";

const known = ["a", "b", "c"] as const;
const A = "project:a" as const;
const B = "project:b" as const;

function start(path = "/os/"): OsState {
  return createInitialState({ path, knownSlugs: known });
}

/** Simula al hook: despacha, ejecuta el plan sobre una pila de historial del navegador y deja que la ruta resultante vuelva como ROUTE_CHANGED. */
class Browser {
  state: OsState;
  stack: string[];
  index = 0;
  calls: string[] = [];
  constructor(path = "/os/", public locale: "es" | "en" = "es") {
    this.state = start(path);
    this.stack = [path];
  }
  get url() { return this.stack[this.index]; }
  private syncRoute() {
    const target = intentFromPath(this.url, known);
    // Una ruta ajena al catálogo no llega al reducer (Next la resolvería con navegación completa).
    if (target) this.state = reduce(this.state, { type: "ROUTE_CHANGED", target, origin: "route" });
  }
  act(action: Action) {
    const { state, plan } = reduceWithHistory(this.state, action, this.locale);
    this.state = state;
    if (plan.kind === "push") { this.stack = [...this.stack.slice(0, this.index + 1), plan.href]; this.index++; this.calls.push(`push ${plan.href}`); this.syncRoute(); }
    else if (plan.kind === "replace") { this.stack[this.index] = plan.href; this.calls.push(`replace ${plan.href}`); this.syncRoute(); }
  }
  back() { if (this.index > 0) { this.index--; this.syncRoute(); } }
  forward() { if (this.index < this.stack.length - 1) { this.index++; this.syncRoute(); } }
  /** Navegación hecha por Next sin nuestro hook (<Link> externo, deep link en la misma sesión). */
  external(path: string) { this.stack = [...this.stack.slice(0, this.index + 1), path]; this.index++; this.syncRoute(); }
  get open() { return Object.keys(this.state.windows); }
}

describe("intentFromPath", () => {
  it("reconoce escritorio y proyectos en ES y EN, con o sin barra final", () => {
    expect(intentFromPath("/os/", known)).toEqual({ kind: "desktop" });
    expect(intentFromPath("/en/os", known)).toEqual({ kind: "desktop" });
    expect(intentFromPath("/os/proyectos/a/", known)).toEqual({ kind: "project", slug: "a" });
    expect(intentFromPath("/os/proyectos/a", known)).toEqual({ kind: "project", slug: "a" });
    expect(intentFromPath("/en/os/projects/b/", known)).toEqual({ kind: "project", slug: "b" });
    expect(intentFromPath("/os/proyectos/%61/", known)).toEqual({ kind: "project", slug: "a" });
  });
  it("slug fuera del catálogo, rutas ajenas, %2F, . y .. no son rutas del SO", () => {
    for (const path of ["/os/proyectos/zzz/", "/proyectos/a/", "/", "/blog/", "/os/proyectos/%2F/", "/os/proyectos/./", "/os/proyectos/../", "/os/proyectos/%2e%2e/", "/os/otra/"]) {
      expect(intentFromPath(path, known), path).toBeNull();
    }
  });
  it("isOsPath y samePath", () => {
    expect(isOsPath("/os/")).toBe(true);
    expect(isOsPath("/en/os/projects/x")).toBe(true);
    expect(isOsPath("/proyectos/x/")).toBe(false);
    expect(samePath("/os/proyectos/a", "/os/proyectos/a/")).toBe(true);
    expect(samePath("/os/proyectos/a/", "/os/proyectos/b/")).toBe(false);
    expect(samePath("/nada/", "/nada/")).toBe(false);
  });
  it("hrefForTarget usa hrefFor con barra final", () => {
    expect(hrefForTarget({ kind: "desktop" }, "es")).toBe("/os/");
    expect(hrefForTarget({ kind: "desktop" }, "en")).toBe("/en/os/");
    expect(hrefForTarget({ kind: "project", slug: "a" }, "es")).toBe(hrefFor({ route: "osProject", params: { slug: "a" } }, "es"));
    expect(hrefForTarget({ kind: "project", slug: "a" }, "en")).toBe("/en/os/projects/a/");
  });
});

describe("planHistory: tabla de reglas de §1.3", () => {
  const plan = (s: OsState, action: Action, locale: "es" | "en" = "es") => reduceWithHistory(s, action, locale).plan;

  it("abrir un proyecto distinto de la selección → push", () => {
    expect(plan(start(), { type: "OPEN", id: A })).toEqual({ kind: "push", href: "/os/proyectos/a/", options: { scroll: false } });
    expect(plan(start(), { type: "OPEN", id: A }, "en")).toMatchObject({ kind: "push", href: "/en/os/projects/a/" });
  });
  it("abrir el proyecto ya seleccionado → ninguno", () => {
    const s = reduce(start(), { type: "OPEN", id: A });
    expect(plan(s, { type: "OPEN", id: A }).kind).toBe("none");
  });
  it("abrir una app local → ninguno (selección intacta)", () => {
    const s = reduce(start(), { type: "OPEN", id: A });
    expect(plan(s, { type: "OPEN", id: "contact" }).kind).toBe("none");
    expect(reduce(s, { type: "OPEN", id: "contact" }).selection).toBe("a");
  });
  it("enfocar una ventana ya visible → ninguno y no cambia la selección", () => {
    const s = reduce(reduce(start(), { type: "OPEN", id: A }), { type: "OPEN", id: B });
    expect(plan(s, { type: "FOCUS", id: A }).kind).toBe("none");
    expect(reduce(s, { type: "FOCUS", id: A }).selection).toBe("b");
    expect(plan(s, { type: "CYCLE", dir: 1 }).kind).toBe("none");
  });
  it("restaurar desde la barra un proyecto minimizado no seleccionado → push", () => {
    let s = reduce(reduce(start(), { type: "OPEN", id: A }), { type: "OPEN", id: B });
    s = reduce(s, { type: "MINIMIZE", id: A });
    expect(plan(s, { type: "FOCUS", id: A })).toMatchObject({ kind: "push", href: "/os/proyectos/a/" });
  });
  it("minimizar o cerrar la ventana seleccionada → replace('/os/'), selección null", () => {
    const s = reduce(start(), { type: "OPEN", id: A });
    for (const action of [{ type: "MINIMIZE", id: A }, { type: "CLOSE", id: A }, { type: "MINIMIZE_ALL" }, { type: "CLOSE_ALL" }, { type: "POCKET_BACK" }] as Action[]) {
      const r = reduceWithHistory(s, action, "es");
      expect(r.plan, action.type).toEqual({ kind: "replace", href: "/os/", options: { scroll: false } });
      expect(r.state.selection).toBeNull();
    }
  });
  it("minimizar o cerrar cualquier otra ventana → ninguno", () => {
    const s = reduce(reduce(start(), { type: "OPEN", id: A }), { type: "OPEN", id: "contact" });
    expect(plan(s, { type: "MINIMIZE", id: "contact" }).kind).toBe("none");
    expect(plan(s, { type: "CLOSE", id: "contact" }).kind).toBe("none");
    expect(plan(s, { type: "CLOSE", id: "welcome" }).kind).toBe("none");
  });
  it("acciones sin cambio de ventana (MOVE, NUDGE, TOGGLE_MAXIMIZE) → ninguno", () => {
    const s = reduce(start(), { type: "OPEN", id: A });
    expect(plan(s, { type: "MOVE", id: A, x: 10, y: 10 }).kind).toBe("none");
    expect(plan(s, { type: "TOGGLE_MAXIMIZE", id: A }).kind).toBe("none");
  });
  it("origin distinto de user nunca produce historial", () => {
    for (const origin of ["route", "hydrate"] as const) {
      expect(plan(start(), { type: "OPEN", id: A, origin }).kind).toBe("none");
      expect(plan(start(), { type: "OPEN", id: A, origin })).toBe(plan(start(), { type: "OPEN", id: A, origin }));
    }
    expect(reduce(start(), { type: "OPEN", id: A, origin: "route" }).entries).toHaveLength(1);
  });
  it("ROUTE_CHANGED y HYDRATE nunca producen historial, ni siquiera con origin user", () => {
    const s = start();
    const target = { kind: "project", slug: "a" } as const;
    expect(planHistory(s, reduce(s, { type: "ROUTE_CHANGED", target }), { type: "ROUTE_CHANGED", target }, "es").kind).toBe("none");
    const h: Action = { type: "HYDRATE", viewport: { w: 800, h: 600 }, saved: {} };
    expect(planHistory(s, reduce(s, h), h, "es").kind).toBe("none");
  });
  it("Pocket nunca emite back(): el plan solo conoce push/replace/none", () => {
    const kinds = new Set<string>();
    let s = start();
    for (const action of [{ type: "OPEN", id: A }, { type: "OPEN", id: "contact" }, { type: "POCKET_BACK" }, { type: "POCKET_BACK" }, { type: "POCKET_BACK" }, { type: "POCKET_BACK" }] as Action[]) {
      const r = reduceWithHistory(s, action, "es");
      kinds.add(r.plan.kind);
      s = r.state;
    }
    expect([...kinds].every((k) => ["none", "push", "replace"].includes(k))).toBe(true);
  });
});

describe("secuencias de historial (ventanas + URL)", () => {
  it("(a) abrir A, abrir Contacto: selección y URL siguen en A", () => {
    const b = new Browser();
    b.act({ type: "OPEN", id: A });
    b.act({ type: "OPEN", id: "contact" });
    expect(b.state.selection).toBe("a");
    expect(b.url).toBe("/os/proyectos/a/");
    expect(b.calls).toEqual(["push /os/proyectos/a/"]);
  });
  it("(b) abrir A, minimizar A: selección null y URL a /os/", () => {
    const b = new Browser();
    b.act({ type: "OPEN", id: A });
    b.act({ type: "MINIMIZE", id: A });
    expect(b.state.selection).toBeNull();
    expect(b.url).toBe("/os/");
    expect(b.calls).toEqual(["push /os/proyectos/a/", "replace /os/"]);
    expect(b.state.windows[A]?.minimized).toBe(true);
  });
  it("(c) abrir A, abrir B, enfocar A: ni selección ni historial cambian", () => {
    const b = new Browser();
    b.act({ type: "OPEN", id: A });
    b.act({ type: "OPEN", id: B });
    const before = { entries: b.state.entries, index: b.state.entryIndex };
    b.act({ type: "FOCUS", id: A });
    expect(b.state.selection).toBe("b");
    expect(b.state.entries).toBe(before.entries);
    expect(b.state.entryIndex).toBe(before.index);
    expect(b.calls).toHaveLength(2);
    expect(activeId(b.state)).toBe(A);
  });
  it("(d) abrir A, abrir B, enfocar A, Atrás, Atrás, Adelante, Adelante", () => {
    const b = new Browser();
    b.act({ type: "OPEN", id: A });
    b.act({ type: "OPEN", id: B });
    b.act({ type: "FOCUS", id: A });
    b.back(); // → A
    expect(b.url).toBe("/os/proyectos/a/");
    expect(b.state.selection).toBe("a");
    expect(b.open).not.toContain(B);
    expect(activeId(b.state)).toBe(A);
    b.back(); // → /os/
    expect(b.state.selection).toBeNull();
    expect(b.open).toEqual(["welcome"]);
    b.forward(); // → A
    expect(b.state.selection).toBe("a");
    expect(b.open).toEqual(["welcome", A]);
    expect(activeId(b.state)).toBe(A);
    b.forward(); // → B
    expect(b.state.selection).toBe("b");
    expect(b.open).toEqual(["welcome", A, B]);
    expect(activeId(b.state)).toBe(B);
  });
  it("Atrás no toca apps locales ni proyectos abiertos por entradas anteriores", () => {
    const b = new Browser();
    b.act({ type: "OPEN", id: A });
    b.act({ type: "OPEN", id: "contact" });
    b.act({ type: "OPEN", id: B });
    b.back();
    expect(b.open).toEqual(["welcome", A, "contact"]);
    expect(b.state.selection).toBe("a");
  });
  it("Atrás restaura el proyecto de la entrada destino si estaba minimizado", () => {
    const b = new Browser();
    b.act({ type: "OPEN", id: A });
    b.act({ type: "OPEN", id: B });
    b.act({ type: "MINIMIZE", id: A });
    b.back(); // la entrada de B se sustituyó por /os/ con replace al minimizar… no: se minimizó A, no la seleccionada
    expect(b.state.selection).toBe("a");
    expect(b.state.windows[A]?.minimized).toBe(false);
  });
  it("(e) entrada ajena (<Link> externo o deep link): fallback por URL", () => {
    const b = new Browser();
    b.external("/os/proyectos/c/");
    expect(b.state.selection).toBe("c");
    expect(activeId(b.state)).toBe("project:c");
    b.external("/os/");
    expect(b.state.selection).toBeNull();
    expect(b.open).toEqual(["welcome"]);
  });
  it("(e) deep link inicial: abre solo ese proyecto y Atrás fuera del SO no rompe nada", () => {
    const b = new Browser("/os/proyectos/b/");
    expect(b.open).toEqual([B]);
    expect(b.state.selection).toBe("b");
    expect(b.state.entries).toHaveLength(1);
  });
  it("(e) slug no autorizado: no-op en el reducer y no llega por intentFromPath", () => {
    const s = start();
    expect(reduce(s, { type: "ROUTE_CHANGED", target: { kind: "project", slug: "zzz" }, origin: "route" })).toBe(s);
    expect(intentFromPath("/os/proyectos/zzz/", known)).toBeNull();
    expect(reduce(s, { type: "OPEN", id: "project:zzz" })).toBe(s);
  });
  it("(f) ROUTE_CHANGED repetido devuelve la misma referencia", () => {
    const b = new Browser();
    b.act({ type: "OPEN", id: A });
    const s = b.state;
    const route = { type: "ROUTE_CHANGED", target: { kind: "project", slug: "a" }, origin: "route" } as const;
    expect(reduce(s, route)).toBe(s);
    expect(reduce(reduce(s, route), route)).toBe(s);
    const desktop = reduce(start(), { type: "ROUTE_CHANGED", target: { kind: "desktop" }, origin: "route" });
    expect(desktop).toBe(desktop);
    const initial = start();
    expect(reduce(initial, { type: "ROUTE_CHANGED", target: { kind: "desktop" }, origin: "route" })).toBe(initial);
  });
  it("(f) dos entradas /os/ consecutivas (replace tras cerrar) no rompen nada", () => {
    const b = new Browser();
    b.act({ type: "OPEN", id: A });
    b.act({ type: "CLOSE", id: A });
    expect(b.stack).toEqual(["/os/", "/os/"]);
    const s = b.state;
    b.back();
    expect(b.state.selection).toBeNull();
    expect(b.open).toEqual(["welcome"]);
    b.forward();
    expect(b.state.windows).toEqual(s.windows);
  });
  it("(g) ROUTE_CHANGED con origin route no genera llamadas de historial", () => {
    const b = new Browser();
    b.act({ type: "OPEN", id: A });
    b.act({ type: "OPEN", id: B });
    const calls = b.calls.length;
    b.back();
    b.back();
    b.forward();
    expect(b.calls).toHaveLength(calls);
  });
  it("abrir tras Atrás descarta las entradas posteriores (push trunca)", () => {
    const b = new Browser();
    b.act({ type: "OPEN", id: A });
    b.act({ type: "OPEN", id: B });
    b.back();
    b.act({ type: "OPEN", id: "project:c" });
    expect(b.stack).toEqual(["/os/", "/os/proyectos/a/", "/os/proyectos/c/"]);
    expect(b.state.entries).toHaveLength(3);
    b.forward();
    expect(b.state.selection).toBe("c");
  });
  it("recarga: el estado se reconstruye desde la URL (solo la ventana del proyecto)", () => {
    const b = new Browser();
    b.act({ type: "OPEN", id: A });
    b.act({ type: "OPEN", id: "contact" });
    const reloaded = createInitialState({ path: b.url, knownSlugs: known });
    expect(Object.keys(reloaded.windows)).toEqual([A]);
    expect(reloaded.selection).toBe("a");
  });
  it("en EN las URLs del plan son las EN", () => {
    const b = new Browser("/en/os/", "en");
    b.act({ type: "OPEN", id: A });
    expect(b.url).toBe("/en/os/projects/a/");
    b.act({ type: "CLOSE", id: A });
    expect(b.url).toBe("/en/os/");
  });
});

describe("Pocket", () => {
  it("POCKET_BACK cierra la ventana superior y vuelve a la anterior de la pila local", () => {
    let s = reduce(start(), { type: "OPEN", id: "about" });
    s = reduce(s, { type: "OPEN", id: "contact" });
    s = reduce(s, { type: "POCKET_BACK" });
    expect(Object.keys(s.windows)).toEqual(["welcome", "about"]);
    expect(activeId(s)).toBe("about");
  });
  it("con una sola ventana (o entrada directa) vuelve al lanzador sin historial", () => {
    const s0 = start("/os/proyectos/a/");
    const { state, plan } = reduceWithHistory(s0, { type: "POCKET_BACK" }, "es");
    expect(activeId(state)).toBeNull();
    expect(state.windows).toEqual({});
    // Cierra el proyecto seleccionado: replace a /os/ (la URL deja de apuntar a un proyecto cerrado), nunca back().
    expect(plan).toEqual({ kind: "replace", href: "/os/", options: { scroll: false } });
    const apps = reduceWithHistory(start(), { type: "POCKET_BACK" }, "es");
    expect(apps.plan.kind).toBe("none");
    expect(activeId(apps.state)).toBeNull();
  });
  it("POCKET_BACK sin ventanas es no-op", () => {
    const s = reduce(start(), { type: "CLOSE_ALL" });
    expect(reduce(s, { type: "POCKET_BACK" })).toBe(s);
  });
  it("las apps locales no crean entradas", () => {
    const b = new Browser();
    b.act({ type: "OPEN", id: "about" });
    b.act({ type: "OPEN", id: "contact" });
    b.act({ type: "POCKET_BACK" });
    expect(b.calls).toEqual([]);
    expect(b.stack).toEqual(["/os/"]);
  });
  it("Atrás, ✕ y Escape comparten transición: requestClose en Pocket", async () => {
    const { requestClose } = await import("@/lib/os/window-reducer");
    const s = reduce(start(), { type: "OPEN", id: "about" });
    const viaBack = reduce(s, requestClose("about", { pocket: true }).action);
    expect(viaBack).toEqual(reduce(s, { type: "POCKET_BACK" }));
  });
});
