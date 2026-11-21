import { describe, expect, it } from "vitest";
import { MIN_GAP_MS, createAnnouncer, type AnnouncerClock } from "@/lib/os/announcer";

function fakeClock() {
  let now = 10_000;
  let nextId = 1;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const clock: AnnouncerClock = {
    now: () => now,
    setTimeout: (fn, ms) => { const id = nextId++; timers.set(id, { at: now + ms, fn }); return id; },
    clearTimeout: (handle) => { timers.delete(handle as number); },
  };
  const advance = (ms: number) => {
    const end = now + ms;
    for (;;) {
      const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]);
      now = due[1].at;
      due[1].fn();
    }
    now = end;
  };
  return { clock, advance, pending: () => timers.size };
}

describe("createAnnouncer", () => {
  it("el primer mensaje sale de inmediato", () => {
    const { clock } = fakeClock();
    const a = createAnnouncer(clock);
    a.announce("Ventana A minimizada");
    expect(a.getSnapshot()).toBe("Ventana A minimizada");
  });

  it("deja al menos ~1 s entre mensajes y los emite en orden", () => {
    const { clock, advance } = fakeClock();
    const a = createAnnouncer(clock);
    const seen: string[] = [];
    a.subscribe(() => seen.push(a.getSnapshot()));
    a.announce("uno");
    a.announce("dos");
    a.announce("tres");
    expect(seen).toEqual(["uno"]);
    advance(MIN_GAP_MS - 1);
    expect(seen).toEqual(["uno"]);
    advance(1);
    expect(seen).toEqual(["uno", "dos"]);
    advance(MIN_GAP_MS);
    expect(seen).toEqual(["uno", "dos", "tres"]);
  });

  it("deduplica mensajes iguales consecutivos en la cola", () => {
    const { clock, advance } = fakeClock();
    const a = createAnnouncer(clock);
    const seen: string[] = [];
    a.subscribe(() => seen.push(a.getSnapshot()));
    a.announce("uno");
    a.announce("dos");
    a.announce("dos");
    advance(MIN_GAP_MS * 3);
    expect(seen).toEqual(["uno", "dos"]);
  });

  it("repetir el mismo texto tras el intervalo cambia el nodo para que se vuelva a leer", () => {
    const { clock, advance } = fakeClock();
    const a = createAnnouncer(clock);
    a.announce("Sonido activado");
    const first = a.getSnapshot();
    advance(MIN_GAP_MS);
    a.announce("Sonido activado");
    expect(a.getSnapshot()).not.toBe(first);
    expect(a.getSnapshot().trim()).toBe("Sonido activado");
  });

  it("limita la cola y dispose cancela lo pendiente", () => {
    const { clock, advance, pending } = fakeClock();
    const a = createAnnouncer(clock);
    const seen: string[] = [];
    a.subscribe(() => seen.push(a.getSnapshot()));
    for (let i = 0; i < 10; i += 1) a.announce(`m${i}`);
    expect(pending()).toBe(1);
    a.dispose();
    expect(pending()).toBe(0);
    advance(MIN_GAP_MS * 20);
    expect(seen).toEqual(["m0"]);
  });

  it("ignora mensajes vacios", () => {
    const { clock } = fakeClock();
    const a = createAnnouncer(clock);
    a.announce("");
    expect(a.getSnapshot()).toBe("");
  });
});
