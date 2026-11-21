import { describe, expect, it } from "vitest";
import { osProjectSlugs } from "@/content/projects";
import { hrefFor } from "@/content/routes";
import { languageIndex } from "@/lib/i18n/pages";
import { hrefForTarget, intentFromPath, samePath, shouldNavigate } from "@/lib/os/window-url";
import {
  APP_IDS, createInitialState, reduce, reduceWithHistory, type Action, type OsState, type WindowId,
} from "@/lib/os/window-reducer";

const known = ["a", "b", "c"] as const;
const slugWin = (s: string) => `project:${s}` as WindowId;

/** Navegador simulado: pila real + el mismo cableado que `useOsNavigation` (act, plan, ruta, ROUTE_CHANGED). */
class Browser {
  state: OsState;
  stack: string[];
  index = 0;
  pushes = 0;
  replaces = 0;
  constructor(path = "/os/", private locale: "es" | "en" = "es") {
    this.state = createInitialState({ path, knownSlugs: known });
    this.stack = [path];
  }
  get url() { return this.stack[this.index]; }
  private route() {
    const target = intentFromPath(this.url, known);
    if (!target) return;
    this.state = reduce(this.state, { type: "ROUTE_CHANGED", target, origin: "route" });
    // Idempotencia: repetir la misma ruta no cambia nada.
    expect(reduce(this.state, { type: "ROUTE_CHANGED", target, origin: "route" })).toBe(this.state);
  }
  act(action: Action) {
    const { state, plan } = reduceWithHistory(this.state, action, this.locale);
    this.state = state;
    if (plan.kind === "none" || !shouldNavigate(plan, known)) return;
    if (plan.kind === "push") { this.stack = [...this.stack.slice(0, this.index + 1), plan.href]; this.index++; this.pushes++; }
    else { this.stack[this.index] = plan.href; this.replaces++; }
    this.route();
  }
  back() { if (this.index > 0) { this.index--; this.route(); } }
  forward() { if (this.index < this.stack.length - 1) { this.index++; this.route(); } }
}

/** Invariantes URL y estado (§1.3): la URL manda sobre la selección y la ventana seleccionada está visible. */
function invariants(b: Browser, trace: string) {
  const target = intentFromPath(b.url, known);
  expect(target, trace).not.toBeNull();
  const s = b.state;
  if (target!.kind === "desktop") expect(s.selection, trace).toBeNull();
  else {
    expect(s.selection, trace).toBe(target!.slug);
    expect(s.windows[slugWin(target!.slug)]?.minimized, trace).toBe(false);
  }
  expect(new Set(s.order).size, trace).toBe(s.order.length);
  expect([...s.order].sort(), trace).toEqual(Object.keys(s.windows).sort());
}

function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
}

describe("fuzz de historial: la URL y el estado nunca se desalinean", () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8])("semilla %i (200 pasos)", (seed) => {
    const next = rng(seed);
    const pick = <T,>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)];
    const locale = seed % 2 ? "es" : "en";
    const b = new Browser(locale === "es" ? "/os/" : "/en/os/", locale);
    const trace: string[] = [];
    for (let i = 0; i < 200; i++) {
      const roll = next();
      const open = Object.keys(b.state.windows) as WindowId[];
      let label: string;
      if (roll < 0.25) { const id = slugWin(pick(known)); label = `OPEN ${id}`; b.act({ type: "OPEN", id }); }
      else if (roll < 0.32) { const id = pick(APP_IDS); label = `OPEN ${id}`; b.act({ type: "OPEN", id }); }
      else if (roll < 0.42 && open.length) { const id = pick(open); label = `FOCUS ${id}`; b.act({ type: "FOCUS", id }); }
      else if (roll < 0.52 && open.length) { const id = pick(open); label = `MINIMIZE ${id}`; b.act({ type: "MINIMIZE", id }); }
      else if (roll < 0.62 && open.length) { const id = pick(open); label = `CLOSE ${id}`; b.act({ type: "CLOSE", id }); }
      else if (roll < 0.66) { label = "POCKET_BACK"; b.act({ type: "POCKET_BACK" }); }
      else if (roll < 0.70) { label = "CYCLE"; b.act({ type: "CYCLE", dir: 1 }); }
      else if (roll < 0.74) { label = "MINIMIZE_ALL"; b.act({ type: "MINIMIZE_ALL" }); }
      else if (roll < 0.86) { label = "BACK"; b.back(); }
      else { label = "FORWARD"; b.forward(); }
      trace.push(label);
      invariants(b, `seed ${seed}: ${trace.slice(-12).join(" > ")}`);
    }
  });

  it("las URLs del historial son siempre del idioma de la sesión y con barra final", () => {
    const b = new Browser("/en/os/", "en");
    for (const slug of known) b.act({ type: "OPEN", id: slugWin(slug) });
    b.act({ type: "CLOSE", id: slugWin("c") });
    for (const url of b.stack) expect(url.startsWith("/en/os/") && url.endsWith("/"), url).toBe(true);
  });
});

describe("contrato push/replace y ROUTE_CHANGED", () => {
  it("un push o replace por acción del usuario y ninguno por ROUTE_CHANGED", () => {
    const b = new Browser();
    b.act({ type: "OPEN", id: slugWin("a") });
    b.act({ type: "OPEN", id: slugWin("b") });
    b.act({ type: "OPEN", id: "contact" });
    b.act({ type: "FOCUS", id: slugWin("a") });
    b.act({ type: "MINIMIZE", id: slugWin("b") }); // b sigue seleccionada tras FOCUS de a: replace
    expect([b.pushes, b.replaces]).toEqual([2, 1]);
    const calls = b.pushes + b.replaces;
    b.back(); b.back(); b.forward(); b.forward();
    expect(b.pushes + b.replaces).toBe(calls);
  });
  it("abrir el mismo proyecto dos veces no hace doble push", () => {
    const b = new Browser();
    b.act({ type: "OPEN", id: slugWin("a") });
    b.act({ type: "OPEN", id: slugWin("a") });
    b.act({ type: "FOCUS", id: slugWin("a") });
    expect(b.pushes).toBe(1);
    expect(b.stack).toEqual(["/os/", "/os/proyectos/a/"]);
  });
  it("minimizar y restaurar el proyecto seleccionado: replace a /os/ y luego push al restaurar", () => {
    const b = new Browser();
    b.act({ type: "OPEN", id: slugWin("a") });
    b.act({ type: "MINIMIZE", id: slugWin("a") });
    expect(b.url).toBe("/os/");
    b.act({ type: "FOCUS", id: slugWin("a") });
    expect(b.url).toBe("/os/proyectos/a/");
    expect([b.pushes, b.replaces]).toEqual([2, 1]);
  });
  it("Atrás×n y Adelante×n tras minimizar: sin llamadas y coherentes", () => {
    const b = new Browser();
    b.act({ type: "OPEN", id: slugWin("a") });
    b.act({ type: "OPEN", id: slugWin("b") });
    b.act({ type: "MINIMIZE", id: slugWin("b") });
    const calls = b.pushes + b.replaces;
    for (let i = 0; i < 3; i++) { b.back(); invariants(b, `back ${i}`); }
    for (let i = 0; i < 3; i++) { b.forward(); invariants(b, `fwd ${i}`); }
    expect(b.pushes + b.replaces).toBe(calls);
  });
});

describe("shouldNavigate: slug no autorizado", () => {
  it("no navega si el destino no está en el catálogo", () => {
    expect(shouldNavigate({ kind: "push", href: "/os/proyectos/zzz/", options: { scroll: false } }, known)).toBe(false);
    expect(shouldNavigate({ kind: "replace", href: "/os/proyectos/%2e%2e/", options: { scroll: false } }, known)).toBe(false);
    expect(shouldNavigate({ kind: "push", href: "/os/proyectos/a/", options: { scroll: false } }, known)).toBe(true);
    expect(shouldNavigate({ kind: "replace", href: "/en/os/", options: { scroll: false } }, known)).toBe(true);
    expect(shouldNavigate({ kind: "none" }, known)).toBe(false);
  });
  it("el reducer no abre ventanas de slugs fuera del catálogo", () => {
    const s = createInitialState({ path: "/os/", knownSlugs: known });
    expect(reduce(s, { type: "OPEN", id: slugWin("zzz") })).toBe(s);
  });
  it("deep link a un slug no autorizado cae al escritorio (Next responde 404 antes)", () => {
    const s = createInitialState({ path: "/os/proyectos/zzz/", knownSlugs: known });
    expect(s.selection).toBeNull();
    expect(Object.keys(s.windows)).toEqual(["welcome"]);
  });
});

describe("idioma: equivalencia y URL del idioma opuesto", () => {
  it("languageIndex mapea /os/ y cada proyecto del SO al otro idioma, y de vuelta", () => {
    const es = languageIndex("es");
    const en = languageIndex("en");
    expect(es["/os/"]).toBe("/en/os/");
    expect(en["/en/os/"]).toBe("/os/");
    for (const slug of osProjectSlugs) {
      const esHref = hrefForTarget({ kind: "project", slug }, "es");
      const enHref = hrefForTarget({ kind: "project", slug }, "en");
      expect(es[esHref], slug).toBe(enHref);
      expect(en[enHref], slug).toBe(esHref);
    }
  });
  it("la URL del idioma opuesto abre el mismo proyecto como deep link", () => {
    const es = createInitialState({ path: "/os/proyectos/a/", knownSlugs: known });
    const en = createInitialState({ path: "/en/os/projects/a/", knownSlugs: known });
    expect(es.selection).toBe(en.selection);
    expect(Object.keys(es.windows)).toEqual(Object.keys(en.windows));
    expect(samePath(hrefFor({ route: "osProject", params: { slug: "a" } }, "en"), "/en/os/projects/a")).toBe(true);
  });
  it("una ruta del otro idioma, como navegación ajena, sigue abriendo el proyecto", () => {
    let s = createInitialState({ path: "/os/", knownSlugs: known });
    const target = intentFromPath("/en/os/projects/b/", known)!;
    s = reduce(s, { type: "ROUTE_CHANGED", target, origin: "route" });
    expect(s.selection).toBe("b");
  });
});
