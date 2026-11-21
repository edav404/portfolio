import { describe, expect, it } from "vitest";
import { dragRect, keyToStep, resizeByHandle, stepDelta, type StepKey } from "@/lib/os/gesture";
import { MIN_H, MIN_W, NUDGE_STEP, NUDGE_STEP_LARGE, TASKBAR_H, TITLEBAR_H, VISIBLE_X, nudgeRect, type Rect } from "@/lib/os/window-geometry";

const vp = { w: 1280, h: 720 };
const rect: Rect = { x: 300, y: 200, w: 600, h: 400 };

describe("stepDelta y keyToStep", () => {
  it("paso de 16 px y de 64 px con paso grande", () => {
    expect(stepDelta("right")).toEqual({ dx: NUDGE_STEP, dy: 0, dw: 0, dh: 0 });
    expect(stepDelta("up", true)).toEqual({ dx: 0, dy: -NUDGE_STEP_LARGE, dw: 0, dh: 0 });
    expect(stepDelta("widen")).toEqual({ dx: 0, dy: 0, dw: NUDGE_STEP, dh: 0 });
    expect(stepDelta("shorter", true)).toEqual({ dx: 0, dy: 0, dw: 0, dh: -NUDGE_STEP_LARGE });
  });

  it("las flechas mueven en modo Mover y cambian el tamano en modo Tamano", () => {
    expect(keyToStep("ArrowLeft", "move")).toBe("left");
    expect(keyToStep("ArrowDown", "move")).toBe("down");
    expect(keyToStep("ArrowLeft", "size")).toBe("narrow");
    expect(keyToStep("ArrowRight", "size")).toBe("widen");
    expect(keyToStep("ArrowUp", "size")).toBe("shorter");
    expect(keyToStep("ArrowDown", "size")).toBe("taller");
    expect(keyToStep("Enter", "move")).toBeNull();
  });

  it("los pasos de un solo puntero producen las mismas geometrias que sus equivalentes de arrastre", () => {
    const keys: StepKey[] = ["left", "right", "up", "down", "widen", "narrow", "taller", "shorter"];
    for (const key of keys) {
      const d = stepDelta(key);
      const stepped = nudgeRect(rect, d, vp);
      expect(stepped.w).toBeGreaterThanOrEqual(MIN_W);
      expect(stepped.h).toBeGreaterThanOrEqual(MIN_H);
      if (d.dx !== 0 || d.dy !== 0) expect(stepped).toEqual(dragRect(rect, d.dx, d.dy, vp));
    }
  });

  it("varias pulsaciones se acumulan y se acotan al area util", () => {
    let r = rect;
    for (let i = 0; i < 100; i += 1) r = nudgeRect(r, stepDelta("right", true), vp);
    expect(r.x).toBeLessThanOrEqual(vp.w - VISIBLE_X);
    for (let i = 0; i < 100; i += 1) r = nudgeRect(r, stepDelta("down", true), vp);
    expect(r.y).toBeLessThanOrEqual(vp.h - TASKBAR_H - TITLEBAR_H);
  });
});

describe("dragRect", () => {
  it("desplaza el origen", () => {
    expect(dragRect(rect, 50, -20, vp)).toEqual({ ...rect, x: 350, y: 180 });
  });
  it("mantiene la barra de titulo alcanzable", () => {
    const far = dragRect(rect, 99_999, 99_999, vp);
    expect(far.x).toBe(vp.w - VISIBLE_X);
    expect(far.y).toBe(vp.h - TASKBAR_H - TITLEBAR_H);
    expect(dragRect(rect, -99_999, -99_999, vp).y).toBe(0);
  });
  it("un desplazamiento nulo no cambia la geometria", () => {
    expect(dragRect(rect, 0, 0, vp)).toEqual(rect);
  });
});

describe("resizeByHandle", () => {
  it("este y sur cambian ancho y alto sin mover la esquina superior izquierda", () => {
    expect(resizeByHandle(rect, "se", 40, 30, vp)).toEqual({ x: 300, y: 200, w: 640, h: 430 });
  });
  it("oeste y norte mantienen fijo el borde opuesto", () => {
    const r = resizeByHandle(rect, "nw", -50, -40, vp);
    expect(r).toEqual({ x: 250, y: 160, w: 650, h: 440 });
    expect(r.x + r.w).toBe(rect.x + rect.w);
    expect(r.y + r.h).toBe(rect.y + rect.h);
  });
  it("al llegar al minimo, el borde arrastrado deja de avanzar y no empuja la ventana", () => {
    const r = resizeByHandle(rect, "w", 9_999, 0, vp);
    expect(r.w).toBe(MIN_W);
    expect(r.x + r.w).toBe(rect.x + rect.w);
    const s = resizeByHandle(rect, "n", 0, 9_999, vp);
    expect(s.h).toBe(MIN_H);
    expect(s.y + s.h).toBe(rect.y + rect.h);
  });
  it("no se sale por arriba ni por la izquierda", () => {
    const r = resizeByHandle(rect, "nw", -9_999, -9_999, vp);
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
    expect(r.x + r.w).toBe(rect.x + rect.w);
  });
  it("este y sur se acotan al viewport y a la barra de tareas", () => {
    const r = resizeByHandle(rect, "se", 9_999, 9_999, vp);
    expect(r.x + r.w).toBeLessThanOrEqual(vp.w);
    expect(r.y + r.h).toBeLessThanOrEqual(vp.h - TASKBAR_H);
  });
  it("devuelve numeros finitos con entradas absurdas", () => {
    const r = resizeByHandle(rect, "se", Number.NaN, Number.POSITIVE_INFINITY, vp);
    for (const n of Object.values(r)) expect(Number.isFinite(n)).toBe(true);
  });
});
