import { describe, expect, it } from "vitest";
import { MIN_H, MIN_W, TASKBAR_H, TITLEBAR_H, VISIBLE_X } from "@/lib/os/window-geometry";
import {
  activeId, collectGeometry, createInitialState, nextAfterClose, persistsGeometry, reduce, requestClose, visibleIds, zIndexOf,
  type Action, type OsState, type WindowId,
} from "@/lib/os/window-reducer";

const known = ["a", "b", "c"] as const;
const project = (slug: string): WindowId => `project:${slug}`;

function start(path = "/os/", viewport = { w: 1280, h: 720 }): OsState {
  return createInitialState({ path, knownSlugs: known, viewport });
}
function run(state: OsState, ...actions: Action[]): OsState {
  return actions.reduce(reduce, state);
}
function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

describe("OPEN", () => {
  it("crea la ventana, la deja en el tope y es la activa", () => {
    const s = run(start(), { type: "OPEN", id: "contact" });
    expect(s.order.at(-1)).toBe("contact");
    expect(activeId(s)).toBe("contact");
    expect(s.windows.contact?.minimized).toBe(false);
  });
  it("de una ventana abierta no duplica: la enfoca", () => {
    const s = run(start(), { type: "OPEN", id: "contact" }, { type: "OPEN", id: "welcome" });
    expect(s.order).toEqual(["contact", "welcome"]);
    expect(Object.keys(s.windows)).toHaveLength(2);
  });
  it("de una minimizada la restaura y enfoca", () => {
    const s = run(start(), { type: "MINIMIZE", id: "welcome" }, { type: "OPEN", id: "welcome" });
    expect(s.windows.welcome?.minimized).toBe(false);
    expect(activeId(s)).toBe("welcome");
  });
  it("en cascada: la segunda ventana nueva se desplaza respecto de la primera", () => {
    const s = run(start(), { type: "OPEN", id: "about" }, { type: "OPEN", id: "services" });
    expect(s.windows.about!.rect.x).not.toBe(s.windows.services!.rect.x);
    expect(s.windows.about!.rect.y).not.toBe(s.windows.services!.rect.y);
  });
  it("una id inválida o un slug fuera del catálogo es no-op", () => {
    const s = start();
    expect(reduce(s, { type: "OPEN", id: "nope" as WindowId })).toBe(s);
    expect(reduce(s, { type: "OPEN", id: project("zzz") })).toBe(s);
    expect(reduce(s, { type: "OPEN", id: "project:.." as WindowId })).toBe(s);
  });
  it("usa la geometría recordada al reabrir una ventana cerrada", () => {
    const s = run(start(), { type: "OPEN", id: "contact" }, { type: "MOVE", id: "contact", x: 111, y: 77 }, { type: "CLOSE", id: "contact" }, { type: "OPEN", id: "contact" });
    expect(s.windows.contact!.rect).toMatchObject({ x: 111, y: 77 });
  });
});

describe("CLOSE, FOCUS y MINIMIZE", () => {
  it("CLOSE elimina de windows y order; la activa es la siguiente visible", () => {
    const s = run(start(), { type: "OPEN", id: "about" }, { type: "OPEN", id: "contact" }, { type: "CLOSE", id: "contact" });
    expect(s.windows.contact).toBeUndefined();
    expect(s.order).toEqual(["welcome", "about"]);
    expect(activeId(s)).toBe("about");
  });
  it("CLOSE de una inexistente devuelve la misma referencia", () => {
    const s = start();
    expect(reduce(s, { type: "CLOSE", id: "media" })).toBe(s);
  });
  it("FOCUS reordena y mantiene order como permutación sin duplicados", () => {
    const s0 = run(start(), { type: "OPEN", id: "about" }, { type: "OPEN", id: "contact" });
    const s = reduce(s0, { type: "FOCUS", id: "welcome" });
    expect(s.order).toEqual(["about", "contact", "welcome"]);
    expect(new Set(s.order).size).toBe(s.order.length);
  });
  it("FOCUS sobre la activa devuelve la misma referencia; sobre una inexistente también", () => {
    const s = start();
    expect(reduce(s, { type: "FOCUS", id: "welcome" })).toBe(s);
    expect(reduce(s, { type: "FOCUS", id: "media" })).toBe(s);
  });
  it("FOCUS restaura una minimizada", () => {
    const s = run(start(), { type: "MINIMIZE", id: "welcome" }, { type: "FOCUS", id: "welcome" });
    expect(s.windows.welcome?.minimized).toBe(false);
  });
  it("z-index = índice, acotado a 0…n−1 tras 10 000 FOCUS", () => {
    let s = run(start(), { type: "OPEN", id: "about" }, { type: "OPEN", id: "contact" }, { type: "OPEN", id: "media" });
    const ids = s.order.slice();
    for (let i = 0; i < 10_000; i++) s = reduce(s, { type: "FOCUS", id: ids[i % ids.length] });
    expect(s.order).toHaveLength(4);
    expect(new Set(s.order).size).toBe(4);
    for (const id of s.order) expect(zIndexOf(s, id)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...s.order.map((id) => zIndexOf(s, id)))).toBe(3);
  });
  it("MINIMIZE pasa el foco a la siguiente visible; sin ninguna, activeId es null", () => {
    let s = run(start(), { type: "OPEN", id: "contact" });
    expect(nextAfterClose(s, "contact")).toBe("welcome");
    s = reduce(s, { type: "MINIMIZE", id: "contact" });
    expect(activeId(s)).toBe("welcome");
    s = reduce(s, { type: "MINIMIZE", id: "welcome" });
    expect(activeId(s)).toBeNull();
    expect(visibleIds(s)).toEqual([]);
  });
  it("MINIMIZE de una ya minimizada o inexistente es no-op", () => {
    const s = reduce(start(), { type: "MINIMIZE", id: "welcome" });
    expect(reduce(s, { type: "MINIMIZE", id: "welcome" })).toBe(s);
    expect(reduce(s, { type: "MINIMIZE", id: "media" })).toBe(s);
  });
  it("las ventanas no tocadas conservan su objeto", () => {
    const s0 = run(start(), { type: "OPEN", id: "about" });
    const s = reduce(s0, { type: "MINIMIZE", id: "about" });
    expect(s.windows.welcome).toBe(s0.windows.welcome);
  });
});

describe("geometría en el reducer", () => {
  it("TOGGLE_MAXIMIZE conserva el rect restaurado y alterna", () => {
    const s0 = start();
    const rect = s0.windows.welcome!.rect;
    const max = reduce(s0, { type: "TOGGLE_MAXIMIZE", id: "welcome" });
    expect(max.windows.welcome).toMatchObject({ maximized: true, rect });
    expect(reduce(max, { type: "TOGGLE_MAXIMIZE", id: "welcome" }).windows.welcome).toMatchObject({ maximized: false, rect });
  });
  it("MOVE clampa dentro del viewport con la barra de título alcanzable", () => {
    const vp = { w: 1280, h: 720 };
    const s = run(start(), { type: "MOVE", id: "welcome", x: 99_999, y: 99_999 });
    const r = s.windows.welcome!.rect;
    expect(r.x).toBe(vp.w - VISIBLE_X);
    expect(r.y).toBe(vp.h - TASKBAR_H - TITLEBAR_H);
    const s2 = run(start(), { type: "MOVE", id: "welcome", x: -99_999, y: -50 });
    expect(s2.windows.welcome!.rect.x).toBe(VISIBLE_X - s2.windows.welcome!.rect.w);
    expect(s2.windows.welcome!.rect.y).toBe(0);
  });
  it("MOVE con la ventana maximizada, inexistente o con valores no finitos es no-op", () => {
    const max = reduce(start(), { type: "TOGGLE_MAXIMIZE", id: "welcome" });
    expect(reduce(max, { type: "MOVE", id: "welcome", x: 5, y: 5 })).toBe(max);
    const s = start();
    expect(reduce(s, { type: "MOVE", id: "media", x: 5, y: 5 })).toBe(s);
    expect(reduce(s, { type: "MOVE", id: "welcome", x: Number.NaN, y: Number.POSITIVE_INFINITY })).toBe(s);
  });
  it("RESIZE respeta MIN_W/MIN_H y el borde derecho e inferior", () => {
    const s = run(start(), { type: "RESIZE", id: "welcome", w: 10, h: 10 });
    expect(s.windows.welcome!.rect).toMatchObject({ w: MIN_W, h: MIN_H });
    const big = run(start(), { type: "RESIZE", id: "welcome", w: 99_999, h: 99_999 });
    const r = big.windows.welcome!.rect;
    expect(r.x + r.w).toBeLessThanOrEqual(1280);
    expect(r.y + r.h).toBeLessThanOrEqual(720 - TASKBAR_H);
  });
  it("NUDGE respeta mínimos y clamp", () => {
    const s0 = start();
    const r0 = s0.windows.welcome!.rect;
    const moved = reduce(s0, { type: "NUDGE", id: "welcome", dx: 16, dy: -16, dw: 0, dh: 0 });
    expect(moved.windows.welcome!.rect).toMatchObject({ x: r0.x + 16, y: r0.y - 16 });
    const shrunk = reduce(s0, { type: "NUDGE", id: "welcome", dx: 0, dy: 0, dw: -9999, dh: -9999 });
    expect(shrunk.windows.welcome!.rect).toMatchObject({ w: MIN_W, h: MIN_H });
    const far = run(s0, { type: "NUDGE", id: "welcome", dx: 99_999, dy: 99_999, dw: 0, dh: 0 });
    expect(far.windows.welcome!.rect.x).toBeLessThanOrEqual(1280 - VISIBLE_X);
    expect(reduce(s0, { type: "NUDGE", id: "welcome", dx: 0, dy: 0, dw: 0, dh: 0 })).toBe(s0);
  });
  it("SNAP left/right ocupa la mitad útil sin pisar la barra; center centra; default restaura", () => {
    const left = run(start(), { type: "SNAP", id: "welcome", to: "left" }).windows.welcome!.rect;
    expect(left).toEqual({ x: 0, y: 0, w: 640, h: 720 - TASKBAR_H });
    const right = run(start(), { type: "SNAP", id: "welcome", to: "right" }).windows.welcome!.rect;
    expect(right.x + right.w).toBe(1280);
    const s0 = start();
    const orig = s0.windows.welcome!.rect;
    const moved = run(s0, { type: "MOVE", id: "welcome", x: 3, y: 3 });
    const centered = reduce(moved, { type: "SNAP", id: "welcome", to: "center" }).windows.welcome!.rect;
    expect(centered.x * 2 + centered.w).toBeCloseTo(1280, -1);
    expect(reduce(moved, { type: "SNAP", id: "welcome", to: "default" }).windows.welcome!.rect).toEqual(orig);
  });
  it("SNAP desmaximiza", () => {
    const s = run(start(), { type: "TOGGLE_MAXIMIZE", id: "welcome" }, { type: "SNAP", id: "welcome", to: "left" });
    expect(s.windows.welcome!.maximized).toBe(false);
  });
  it("RESET_GEOMETRY con id solo cambia esa ventana; sin id, todas; no altera order", () => {
    const s0 = run(start(), { type: "OPEN", id: "about" }, { type: "MOVE", id: "welcome", x: 5, y: 5 }, { type: "MOVE", id: "about", x: 9, y: 9 }, { type: "TOGGLE_MAXIMIZE", id: "about" });
    const one = reduce(s0, { type: "RESET_GEOMETRY", id: "welcome" });
    expect(one.windows.welcome!.rect).not.toEqual(s0.windows.welcome!.rect);
    expect(one.windows.about).toBe(s0.windows.about);
    const all = reduce(s0, { type: "RESET_GEOMETRY" });
    expect(all.windows.about!.maximized).toBe(false);
    expect(all.windows.about!.rect).not.toEqual({ x: 9, y: 9, w: all.windows.about!.rect.w, h: all.windows.about!.rect.h });
    expect(all.order).toEqual(s0.order);
    expect(reduce(all, { type: "RESET_GEOMETRY" })).toBe(all);
  });
  it("SET_VIEWPORT re-clampa todas las ventanas abiertas", () => {
    const s0 = run(start(), { type: "MOVE", id: "welcome", x: 900, y: 600 });
    const s = reduce(s0, { type: "SET_VIEWPORT", w: 500, h: 400 });
    const r = s.windows.welcome!.rect;
    expect(r.x).toBeLessThanOrEqual(500 - VISIBLE_X);
    expect(r.y).toBeLessThanOrEqual(400 - TASKBAR_H - TITLEBAR_H);
    expect(r.w).toBeLessThanOrEqual(500);
    expect(reduce(s, { type: "SET_VIEWPORT", w: 500, h: 400 })).toBe(s);
    expect(reduce(s, { type: "SET_VIEWPORT", w: Number.NaN, h: 400 })).toBe(s);
  });
});

describe("HYDRATE", () => {
  it("aplica rects válidos, ignora ids desconocidos y rects corruptos", () => {
    const s = reduce(start(), {
      type: "HYDRATE", viewport: { w: 1280, h: 720 },
      saved: {
        welcome: { x: 40, y: 50, w: 500, h: 400, maximized: true },
        "no-existe": { x: 1, y: 1, w: 400, h: 400 },
        about: { x: Number.NaN, y: 0, w: 400, h: 400 },
        contact: { x: 0, y: 0, w: -5, h: 400 },
        media: "texto",
        terminal: null,
      },
    });
    expect(s.windows.welcome).toMatchObject({ rect: { x: 40, y: 50, w: 500, h: 400 }, maximized: true });
    expect(Object.keys(s.saved)).toEqual([]);
  });
  it("con viewport nuevo y rects guardados re-clampa en UNA transición y guarda los de ventanas cerradas", () => {
    const s = reduce(start(), {
      type: "HYDRATE", viewport: { w: 600, h: 500 },
      saved: { welcome: { x: 5000, y: 5000, w: 5000, h: 5000 }, about: { x: 10, y: 10, w: 400, h: 300 } },
    });
    expect(s.viewport).toEqual({ w: 600, h: 500 });
    const r = s.windows.welcome!.rect;
    expect(r.w).toBeLessThanOrEqual(600);
    expect(r.x).toBeLessThanOrEqual(600 - VISIBLE_X);
    expect(s.saved.about).toMatchObject({ x: 10, y: 10 });
    const opened = reduce(s, { type: "OPEN", id: "about" });
    expect(opened.windows.about!.rect).toMatchObject({ x: 10, y: 10, w: 400, h: 300 });
  });
  it("tolera saved vacío o corrupto y es idempotente", () => {
    const s = start();
    const same = reduce(s, { type: "HYDRATE", viewport: s.viewport, saved: {} });
    expect(same).toBe(s);
    expect(reduce(s, { type: "HYDRATE", viewport: s.viewport, saved: null as unknown as Record<string, unknown> })).toBe(s);
    expect(reduce(s, { type: "HYDRATE", viewport: s.viewport, saved: [1, 2] as unknown as Record<string, unknown> })).toBe(s);
    expect(reduce(s, { type: "HYDRATE", viewport: { w: -1, h: Number.NaN }, saved: {} })).toBe(s);
  });
  it("no toca selección, entradas ni orden", () => {
    const s0 = start("/os/proyectos/a/");
    const s = reduce(s0, { type: "HYDRATE", viewport: { w: 800, h: 600 }, saved: {}, origin: "hydrate" });
    expect(s.selection).toBe("a");
    expect(s.entries).toBe(s0.entries);
    expect(s.order).toBe(s0.order);
  });
});

describe("CYCLE, MINIMIZE_ALL, CLOSE_ALL", () => {
  it("CYCLE ±1 recorre las visibles en orden de la barra y da la vuelta", () => {
    const s0 = run(start(), { type: "OPEN", id: "about" }, { type: "OPEN", id: "contact" });
    expect(activeId(s0)).toBe("contact");
    const fwd = reduce(s0, { type: "CYCLE", dir: 1 });
    expect(activeId(fwd)).toBe("welcome");
    expect(activeId(reduce(fwd, { type: "CYCLE", dir: 1 }))).toBe("about");
    expect(activeId(reduce(fwd, { type: "CYCLE", dir: -1 }))).toBe("contact");
  });
  it("CYCLE con menos de dos visibles es no-op", () => {
    const s = start();
    expect(reduce(s, { type: "CYCLE", dir: 1 })).toBe(s);
  });
  it("MINIMIZE_ALL seguido de FOCUS restaura solo la elegida; CLOSE_ALL vacía", () => {
    const s0 = run(start(), { type: "OPEN", id: "about" }, { type: "MINIMIZE_ALL" });
    expect(visibleIds(s0)).toEqual([]);
    const s1 = reduce(s0, { type: "FOCUS", id: "about" });
    expect(visibleIds(s1)).toEqual(["about"]);
    expect(reduce(s0, { type: "MINIMIZE_ALL" })).toBe(s0);
    const s2 = reduce(s1, { type: "CLOSE_ALL" });
    expect(s2.windows).toEqual({});
    expect(s2.order).toEqual([]);
    expect(reduce(s2, { type: "CLOSE_ALL" })).toBe(s2);
  });
});

describe("createInitialState", () => {
  it("/os/ abre solo welcome", () => {
    const s = start("/os/");
    expect(Object.keys(s.windows)).toEqual(["welcome"]);
    expect(s.selection).toBeNull();
  });
  it("/os/proyectos/x/ abre solo project:x y lo selecciona", () => {
    const s = start("/os/proyectos/a/");
    expect(Object.keys(s.windows)).toEqual(["project:a"]);
    expect(s.selection).toBe("a");
    expect(s.openedBy["project:a"]).toBe(s.entries[0].id);
  });
  it("slug desconocido o ruta ajena → como /os/", () => {
    for (const path of ["/os/proyectos/zzz/", "/proyectos/a/", "/", "/os/proyectos/%2F/"]) {
      expect(Object.keys(start(path).windows)).toEqual(["welcome"]);
    }
  });
  it("ES y EN son equivalentes, con o sin barra final", () => {
    const es = start("/os/proyectos/a/");
    for (const path of ["/en/os/projects/a/", "/en/os/projects/a", "/os/proyectos/a"]) {
      const s = start(path);
      expect(Object.keys(s.windows)).toEqual(Object.keys(es.windows));
      expect(s.selection).toBe("a");
    }
    expect(Object.keys(start("/en/os/").windows)).toEqual(["welcome"]);
  });
  it("viewport inválido usa el por defecto", () => {
    expect(start("/os/", { w: Number.NaN, h: 0 }).viewport).toEqual({ w: 1280, h: 720 });
  });
});

describe("invariantes y pureza", () => {
  const ids: WindowId[] = ["welcome", "projects", "services", "about", "contact", "media", "terminal", "settings", "project:a", "project:b", "project:zzz"];
  function randomAction(rand: () => number): Action {
    const id = ids[Math.floor(rand() * ids.length)];
    const n = () => (rand() - 0.5) * 4000;
    const kinds: Action[] = [
      { type: "OPEN", id }, { type: "CLOSE", id }, { type: "FOCUS", id }, { type: "MINIMIZE", id }, { type: "TOGGLE_MAXIMIZE", id },
      { type: "MOVE", id, x: n(), y: n() }, { type: "RESIZE", id, w: n(), h: n() }, { type: "NUDGE", id, dx: n(), dy: n(), dw: n(), dh: n() },
      { type: "SNAP", id, to: "left" }, { type: "RESET_GEOMETRY" }, { type: "SET_VIEWPORT", w: 320 + rand() * 2000, h: 300 + rand() * 1000 },
      { type: "ROUTE_CHANGED", target: rand() < 0.5 ? { kind: "desktop" } : { kind: "project", slug: ["a", "b", "zzz"][Math.floor(rand() * 3)] } },
      { type: "POCKET_BACK" }, { type: "MINIMIZE_ALL" }, { type: "CLOSE_ALL" }, { type: "CYCLE", dir: rand() < 0.5 ? 1 : -1 },
    ];
    return kinds[Math.floor(rand() * kinds.length)];
  }
  function lcg(seed: number) { let x = seed; return () => (x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296; }

  it("order = claves de windows sin duplicados; rects finitos; selección coherente", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rand = lcg(seed);
      let s = start();
      for (let i = 0; i < 300; i++) {
        s = reduce(s, randomAction(rand));
        expect([...s.order].sort()).toEqual(Object.keys(s.windows).sort());
        expect(new Set(s.order).size).toBe(s.order.length);
        for (const w of Object.values(s.windows)) {
          expect([w!.rect.x, w!.rect.y, w!.rect.w, w!.rect.h].every(Number.isFinite)).toBe(true);
        }
        if (s.selection !== null) expect(known).toContain(s.selection);
        expect(s.entryIndex).toBeGreaterThanOrEqual(0);
        expect(s.entryIndex).toBeLessThan(s.entries.length);
      }
    }
  });
  it("no muta el estado de entrada (congelado en profundidad)", () => {
    const rand = lcg(7);
    let s = deepFreeze(start());
    for (let i = 0; i < 200; i++) s = deepFreeze(reduce(s, randomAction(rand)));
    expect(Object.isFrozen(s)).toBe(true);
  });
});

describe("utilidades", () => {
  it("collectGeometry mezcla ventanas abiertas y recordadas; persistsGeometry", () => {
    const s = run(start(), { type: "OPEN", id: "about" }, { type: "CLOSE", id: "about" });
    expect(Object.keys(collectGeometry(s)).sort()).toEqual(["about", "welcome"]);
    expect(persistsGeometry({ type: "MOVE", id: "welcome", x: 1, y: 1 })).toBe(true);
    expect(persistsGeometry({ type: "FOCUS", id: "welcome" })).toBe(false);
  });
  it("requestClose: CLOSE en escritorio, POCKET_BACK en Pocket, confirm con borrador", () => {
    expect(requestClose("contact")).toEqual({ confirm: false, action: { type: "CLOSE", id: "contact" } });
    expect(requestClose("contact", { dirty: true })).toMatchObject({ confirm: true });
    expect(requestClose("contact", { pocket: true }).action).toEqual({ type: "POCKET_BACK" });
  });
});
