import { describe, expect, it, vi } from "vitest";
import { createEventBus, deriveEvents, type OsEvent } from "@/lib/os/events";
import { createInitialState, reduce, type Action, type OsState } from "@/lib/os/window-reducer";

const start = () => createInitialState({ path: "/os/", knownSlugs: ["a"], viewport: { w: 1280, h: 720 } });
const events = (prev: OsState, action: Action) => deriveEvents(prev, reduce(prev, action), action);

describe("deriveEvents", () => {
  it("sin cambios no hay eventos", () => {
    const s = start();
    expect(events(s, { type: "FOCUS", id: "welcome" })).toEqual([]);
  });
  it("opened (y no focused) al abrir; closed al cerrar", () => {
    const s = start();
    expect(events(s, { type: "OPEN", id: "about" })).toEqual([{ type: "opened", id: "about" }]);
    const s2 = reduce(s, { type: "OPEN", id: "about" });
    expect(events(s2, { type: "CLOSE", id: "about" })).toContainEqual({ type: "closed", id: "about" });
  });
  it("minimized, restored, maximized, focused", () => {
    const s = reduce(start(), { type: "OPEN", id: "about" });
    expect(events(s, { type: "MINIMIZE", id: "about" })).toEqual([{ type: "minimized", id: "about" }, { type: "focused", id: "welcome" }]);
    const min = reduce(s, { type: "MINIMIZE", id: "about" });
    expect(events(min, { type: "FOCUS", id: "about" })).toEqual([{ type: "restored", id: "about" }]);
    expect(events(s, { type: "TOGGLE_MAXIMIZE", id: "about" })).toEqual([{ type: "maximized", id: "about" }]);
    const max = reduce(s, { type: "TOGGLE_MAXIMIZE", id: "about" });
    expect(events(max, { type: "TOGGLE_MAXIMIZE", id: "about" })).toEqual([{ type: "restored", id: "about" }]);
    expect(events(s, { type: "FOCUS", id: "welcome" })).toEqual([{ type: "focused", id: "welcome" }]);
  });
  it("moved y resized", () => {
    const s = start();
    expect(events(s, { type: "MOVE", id: "welcome", x: 10, y: 10 })).toEqual([{ type: "moved", id: "welcome" }]);
    expect(events(s, { type: "RESIZE", id: "welcome", w: 400, h: 300 })).toEqual([{ type: "resized", id: "welcome" }]);
  });
  it("reset con y sin id", () => {
    const s = reduce(start(), { type: "MOVE", id: "welcome", x: 1, y: 1 });
    expect(events(s, { type: "RESET_GEOMETRY", id: "welcome" })).toEqual([{ type: "reset", id: "welcome" }]);
    expect(events(s, { type: "RESET_GEOMETRY" })).toEqual([{ type: "reset", id: null }]);
  });
});

describe("createEventBus", () => {
  it("entrega a los suscriptores y permite darse de baja", () => {
    const bus = createEventBus<OsEvent>();
    const a = vi.fn();
    const b = vi.fn();
    const offA = bus.subscribe(a);
    bus.subscribe(b);
    expect(bus.size).toBe(2);
    bus.emit({ type: "opened", id: "about" });
    offA();
    bus.emit({ type: "closed", id: "about" });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
    expect(bus.size).toBe(1);
  });
  it("un oyente que lanza no impide avisar al resto", () => {
    const bus = createEventBus<number>();
    const ok = vi.fn();
    bus.subscribe(() => { throw new Error("boom"); });
    bus.subscribe(ok);
    expect(() => bus.emit(1)).not.toThrow();
    expect(ok).toHaveBeenCalledWith(1);
  });
});
