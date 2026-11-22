import { describe, expect, it } from "vitest";
import { intentFromPath, shouldNavigate } from "@/lib/os/window-url";
import { createInitialState, reduce, reduceWithHistory, type Action, type OsState, type WindowId } from "@/lib/os/window-reducer";

const known = ["a", "b", "c"] as const;
const win = (s: string) => `project:${s}` as WindowId;
const open = (s: OsState) => (Object.keys(s.windows) as WindowId[]).filter((id) => id.startsWith("project:")).sort();
const visible = (s: OsState, id: WindowId) => s.windows[id]?.minimized === false;

/**
 * Navegador simulado con navegación DEMORADA: `act` lanza la intención (como el hook) y Next solo la
 * confirma en `settle()`. Una intención nueva descarta la pendiente (comportamiento de Next 16.4.6).
 * `usePathname` solo cambia cuando cambia la URL.
 */
class Browser {
  state: OsState;
  stack: string[] = ["/os/"];
  index = 0;
  inflight: { kind: "push" | "replace"; href: string } | null = null;
  calls: string[] = [];
  private seen = "/os/";
  constructor() { this.state = createInitialState({ path: "/os/", knownSlugs: known }); }
  get url() { return this.stack[this.index]; }
  private route() {
    if (this.url === this.seen) return;
    this.seen = this.url;
    const target = intentFromPath(this.url, known);
    if (target) this.state = reduce(this.state, { type: "ROUTE_CHANGED", target, origin: "route" });
  }
  act(action: Action) {
    const { state, plan } = reduceWithHistory(this.state, action, "es");
    this.state = state;
    if (plan.kind === "none" || !shouldNavigate(plan, known)) return;
    this.calls.push(`${plan.kind} ${plan.href}`);
    this.inflight = { kind: plan.kind, href: plan.href };
  }
  /** Next confirma la navegación en vuelo. */
  settle() {
    const nav = this.inflight;
    if (!nav) return;
    this.inflight = null;
    if (nav.kind === "push") { this.stack = [...this.stack.slice(0, this.index + 1), nav.href]; this.index++; }
    else this.stack[this.index] = nav.href;
    this.route();
  }
  /** Con red inmediata: cada acción se confirma enseguida. */
  now(action: Action) { this.act(action); this.settle(); }
  back(n = 1) { this.settle(); this.index -= n; this.route(); }
  forward(n = 1) { this.settle(); this.index += n; this.route(); }
}

describe("R1: URLs repetidas (/os/ -> A -> B -> minimizar A -> restaurar A)", () => {
  function setup() {
    const b = new Browser();
    b.now({ type: "OPEN", id: win("a") });
    b.now({ type: "OPEN", id: win("b") });
    b.now({ type: "MINIMIZE", id: win("a") }); // B sigue seleccionada: sin historial
    b.now({ type: "OPEN", id: win("a") }); // restaurar: push
    return b;
  }

  it("restaurar A empuja una entrada y deja el estado alineado con la URL", () => {
    const b = setup();
    expect(b.stack).toEqual(["/os/", "/os/proyectos/a/", "/os/proyectos/b/", "/os/proyectos/a/"]);
    expect(b.state.entries.map((e) => e.sel)).toEqual([null, "a", "b", "a"]);
    expect(b.state.entryIndex).toBe(3);
    expect(b.state.selection).toBe("a");
  });

  it("Atrás -> B (vecino inequívoco) y Atrás de nuevo (A repetida = ambiguo): fallback por URL, sin cerrar B", () => {
    const b = setup();
    b.back();
    expect(b.url).toBe("/os/proyectos/b/");
    expect(b.state.selection).toBe("b");
    expect(b.state.entryIndex).toBe(2);
    expect(visible(b.state, win("a"))).toBe(true); // A restaurada se conserva

    b.back(); // URL A: las entradas 1 y 3 la expresan
    expect(b.url).toBe("/os/proyectos/a/");
    expect(b.state.selection).toBe("a");
    expect(open(b.state)).toEqual([win("a"), win("b")]); // B NO se cierra indebidamente
    expect(visible(b.state, win("a"))).toBe(true);
    // El cursor se reinicia en la entrada actual (la posición real es desconocida): ya no hay desfase.
    expect(b.state.entries.map((e) => e.sel)).toEqual(["a"]);
    expect(b.state.entryIndex).toBe(0);
  });

  it("después del fallback, un push nuevo sigue alineado con el navegador", () => {
    const b = setup();
    b.back(); b.back();
    b.now({ type: "OPEN", id: win("c") });
    expect(b.url).toBe("/os/proyectos/c/");
    b.back();
    expect(b.url).toBe("/os/proyectos/a/");
    expect(b.state.selection).toBe("a");
    expect(visible(b.state, win("c"))).toBe(false); // se deshizo la apertura de C
    b.forward();
    expect(b.state.selection).toBe("c");
    expect(visible(b.state, win("c"))).toBe(true);
  });
});

describe("R1: saltar varias entradas", () => {
  it("history.go(-2) desde B hasta /os/: fallback por URL (ni adyacente ni identificable), sin desfase de cursor", () => {
    const b = new Browser();
    b.now({ type: "OPEN", id: win("a") });
    b.now({ type: "OPEN", id: win("b") });
    b.back(2);
    expect(b.url).toBe("/os/");
    expect(b.state.selection).toBeNull();
    expect(visible(b.state, win("b"))).toBe(false); // la seleccionada abierta por una entrada se cierra
    expect(b.state.entries).toHaveLength(1);
    expect(b.state.entryIndex).toBe(0);
    expect(b.state.pending).toBeNull();
    // Y lo que viene después está alineado: abrir C y Atrás vuelve a /os/ deshaciendo C.
    b.now({ type: "OPEN", id: win("c") });
    b.back();
    expect(b.url).toBe("/os/");
    expect(visible(b.state, win("c"))).toBe(false);
  });

  it("saltar adelante dos entradas: abre y selecciona el destino por URL", () => {
    const b = new Browser();
    b.now({ type: "OPEN", id: win("a") });
    b.now({ type: "OPEN", id: win("b") });
    b.back(2);
    b.forward(2);
    expect(b.url).toBe("/os/proyectos/b/");
    expect(b.state.selection).toBe("b");
    expect(visible(b.state, win("b"))).toBe(true);
  });

  it("tras un fallback, la entrada inicial queda marcada: Atrás hacia la URL de la siguiente no se toma por Adelante", () => {
    const b = new Browser();
    b.now({ type: "OPEN", id: win("a") });
    b.now({ type: "OPEN", id: win("b") });
    b.now({ type: "OPEN", id: win("c") });
    b.back(2); // -> A: salto no adyacente, fallback
    expect(b.state.entries).toHaveLength(1);
    expect(b.state.entries[0].unknownBefore).toBe(true);
    b.now({ type: "OPEN", id: win("b") }); // [A, B]
    b.back(); // -> A, identificable (vecino anterior)
    expect(b.state.entryIndex).toBe(0);
    // Desde la entrada inicial, B (siguiente) no puede ser el destino de un Atrás: sería ambiguo y va por URL.
    const before = b.state;
    b.stack[b.index - 1] = "/os/proyectos/b/"; b.index--; // el usuario retrocede a una entrada desconocida que también es B
    b.state = reduce(before, { type: "ROUTE_CHANGED", target: { kind: "project", slug: "b" }, origin: "route" });
    expect(b.state.entries.map((e) => e.sel)).toEqual(["b"]);
    expect(b.state.selection).toBe("b");
  });
});

describe("OPEN / FOCUS de proyectos (§1.3)", () => {
  it("OPEN de un proyecto visible NO seleccionado lo selecciona (push); FOCUS solo cambia el z-order", () => {
    const b = new Browser();
    b.now({ type: "OPEN", id: win("a") });
    b.now({ type: "OPEN", id: win("b") });
    const calls = b.calls.length;
    b.now({ type: "FOCUS", id: win("a") });
    expect(b.calls.length).toBe(calls);
    expect(b.state.selection).toBe("b");
    expect(b.url).toBe("/os/proyectos/b/");
    b.now({ type: "OPEN", id: win("a") });
    expect(b.calls.at(-1)).toBe("push /os/proyectos/a/");
    expect(b.state.selection).toBe("a");
    expect(b.url).toBe("/os/proyectos/a/");
    expect(open(b.state)).toEqual([win("a"), win("b")]);
  });
  it("OPEN del proyecto ya seleccionado no navega", () => {
    const b = new Browser();
    b.now({ type: "OPEN", id: win("a") });
    const calls = b.calls.length;
    b.now({ type: "OPEN", id: win("a") });
    expect(b.calls.length).toBe(calls);
  });
  it("restaurar una minimizada (OPEN) navega; abrir una app local no", () => {
    const b = new Browser();
    b.now({ type: "OPEN", id: win("a") });
    b.now({ type: "OPEN", id: win("b") });
    b.now({ type: "MINIMIZE", id: win("a") });
    b.now({ type: "OPEN", id: "contact" });
    expect(b.calls.length).toBe(2);
    b.now({ type: "OPEN", id: win("a") });
    expect(b.calls.at(-1)).toBe("push /os/proyectos/a/");
  });
});

describe("R1: navegación demorada (Next descarta la pendiente si llega otra)", () => {
  it("la intención no entra en el historial confirmado hasta que Next la confirma", () => {
    const b = new Browser();
    b.act({ type: "OPEN", id: win("a") });
    expect(b.state.pending).toMatchObject({ kind: "push", sel: "a" });
    expect(b.state.entries.map((e) => e.sel)).toEqual([null]);
    expect(b.state.selection).toBe("a"); // optimista: la ventana está abierta y seleccionada
    b.settle();
    expect(b.state.pending).toBeNull();
    expect(b.state.entries.map((e) => e.sel)).toEqual([null, "a"]);
  });

  it("A y luego B antes de confirmar (Next solo confirma B): A queda abierta y se atribuye a la entrada de B", () => {
    const b = new Browser();
    b.act({ type: "OPEN", id: win("a") });
    b.act({ type: "OPEN", id: win("b") });
    expect(b.calls).toEqual(["push /os/proyectos/a/", "push /os/proyectos/b/"]);
    b.settle(); // solo queda la última
    expect(b.stack).toEqual(["/os/", "/os/proyectos/b/"]);
    expect(b.state.entries.map((e) => e.sel)).toEqual([null, "b"]);
    expect(open(b.state)).toEqual([win("a"), win("b")]);
    expect(b.state.selection).toBe("b");
    // Atrás: ninguna de las dos aperturas estaba en el historial anterior: se deshacen las dos.
    b.back();
    expect(b.url).toBe("/os/");
    expect(open(b.state)).toEqual([]);
    expect(b.state.selection).toBeNull();
    // Adelante reabre la que identifica la entrada (B).
    b.forward();
    expect(b.state.selection).toBe("b");
    expect(open(b.state)).toEqual([win("b")]);
  });

  it("orden inverso: B y luego A", () => {
    const b = new Browser();
    b.act({ type: "OPEN", id: win("b") });
    b.act({ type: "OPEN", id: win("a") });
    b.settle();
    expect(b.stack).toEqual(["/os/", "/os/proyectos/a/"]);
    expect(b.state.selection).toBe("a");
    expect(open(b.state)).toEqual([win("a"), win("b")]);
    b.back();
    expect(b.state.selection).toBeNull();
    expect(open(b.state)).toEqual([]);
  });

  it("si Next llega a confirmar A antes de descartarla, no se trata como navegación ajena", () => {
    const b = new Browser();
    b.act({ type: "OPEN", id: win("a") });
    const first = b.inflight!;
    b.act({ type: "OPEN", id: win("b") });
    // A se confirma en el navegador y luego B.
    b.stack = [...b.stack, first.href]; b.index = 1; b.state = reduce(b.state, { type: "ROUTE_CHANGED", target: { kind: "project", slug: "a" }, origin: "route" });
    expect(b.state.pending).not.toBeNull();
    expect(b.state.selection).toBe("b");
    b.settle();
    expect(b.state.pending).toBeNull();
    expect(b.state.selection).toBe("b");
    expect(open(b.state)).toEqual([win("a"), win("b")]);
  });

  it("minimizar A antes de que Next confirme su push cancela la intención: replace a /os/ y ventana A minimizada", () => {
    const b = new Browser();
    b.act({ type: "OPEN", id: win("a") });
    b.act({ type: "MINIMIZE", id: win("a") });
    expect(b.calls).toEqual(["push /os/proyectos/a/", "replace /os/"]);
    b.settle();
    expect(b.url).toBe("/os/");
    expect(b.stack).toEqual(["/os/"]);
    expect(b.state.pending).toBeNull();
    expect(b.state.selection).toBeNull();
    expect(b.state.windows[win("a")]?.minimized).toBe(true);
    expect(b.state.entries.map((e) => e.sel)).toEqual([null]);
  });

  it("volver a la selección confirmada con una intención en vuelo cancela y emite replace", () => {
    const b = new Browser();
    b.now({ type: "OPEN", id: win("a") });
    b.act({ type: "OPEN", id: win("b") }); // en vuelo
    const plan = reduceWithHistory(b.state, { type: "OPEN", id: win("a") }, "es"); // vuelve a la URL confirmada
    expect(plan.state.pending).toBeNull();
    expect(plan.plan).toEqual({ kind: "replace", href: "/os/proyectos/a/", options: { scroll: false } });
  });

  it("una navegación ajena (Atrás) mientras hay una intención pendiente la descarta; las ventanas optimistas siguen abiertas", () => {
    const b = new Browser();
    b.now({ type: "OPEN", id: win("a") });
    b.act({ type: "OPEN", id: win("b") }); // en vuelo
    b.inflight = null; b.index = 0; b.stack = ["/os/", "/os/proyectos/a/"]; // el usuario pulsó Atrás
    b.state = reduce(b.state, { type: "ROUTE_CHANGED", target: { kind: "desktop" }, origin: "route" });
    expect(b.state.pending).toBeNull();
    expect(b.state.selection).toBeNull();
    expect(open(b.state)).toEqual([win("b")]); // A se deshizo; B (sin confirmar) permanece
    expect(b.state.entryIndex).toBe(0);
  });

  it("NAV_TIMEOUT: nada se confirma; la selección vuelve a la URL real y las ventanas siguen abiertas", () => {
    const b = new Browser();
    b.now({ type: "OPEN", id: win("a") });
    b.act({ type: "OPEN", id: win("b") });
    b.state = reduce(b.state, { type: "NAV_TIMEOUT", origin: "route" });
    expect(b.state.pending).toBeNull();
    expect(b.state.selection).toBe("a");
    expect(open(b.state)).toEqual([win("a"), win("b")]);
    expect(b.state.entries.map((e) => e.sel)).toEqual([null, "a"]);
    const idle = b.state;
    expect(reduce(idle, { type: "NAV_TIMEOUT", origin: "route" })).toBe(idle);
  });

  it("ROUTE_CHANGED repetido no cambia nada (idempotente) con y sin intención", () => {
    const b = new Browser();
    b.act({ type: "OPEN", id: win("a") });
    b.settle();
    const target = { kind: "project", slug: "a" } as const;
    expect(reduce(b.state, { type: "ROUTE_CHANGED", target, origin: "route" })).toBe(b.state);
  });
});
