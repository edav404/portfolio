import { describe, expect, it } from "vitest";
import { createHydrationGate } from "@/lib/os/hydration";
import { defaultRect } from "@/lib/os/window-geometry";
import { createInitialState, reduce } from "@/lib/os/window-reducer";

describe("hidratación en frío en Pocket", () => {
  it("la puerta solo abre una vez y solo con ancho de escritorio", () => {
    const gate = createHydrationGate();
    expect(gate.take(390)).toBe(false);
    expect(gate.take(768)).toBe(false);
    expect(gate.take(1280)).toBe(true);
    expect(gate.take(1280)).toBe(false);
    expect(gate.take(1920)).toBe(false);
  });

  it("cargar a 390 px no recorta nada; ensanchar a 1280 px hidrata y ajusta en una sola transición", () => {
    const saved = { about: { x: 900, y: 300, w: 640, h: 380 } };
    let state = reduce(createInitialState({ path: "/os/", knownSlugs: [] }), { type: "OPEN", id: "about" });
    const before = state.windows.about!.rect;
    const gate = createHydrationGate();
    // 390 px: la puerta no se abre, no se despacha HYDRATE y la geometría de escritorio queda intacta.
    expect(gate.take(390)).toBe(false);
    expect(state.windows.about!.rect).toEqual(before);
    // 1280 px: una sola acción aplica lo guardado y ajusta a defecto la abierta sin geometría guardada.
    expect(gate.take(1280)).toBe(true);
    const next = reduce(state, { type: "HYDRATE", viewport: { w: 1280, h: 720 }, saved, snapUnsaved: true });
    expect(next.windows.about!.rect).toEqual({ x: 900, y: 300, w: 640, h: 380 });
    expect(next.windows.welcome!.rect).toEqual(defaultRect("welcome", 0, { w: 1280, h: 720 }));
    state = next;
    expect(gate.take(1280)).toBe(false);
  });
});
