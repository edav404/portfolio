import { describe, expect, it } from "vitest";
import {
  CASCADE_SLOTS, MIN_H, MIN_W, MOBILE_MAX, NUDGE_STEP, NUDGE_STEP_LARGE, TASKBAR_H, TITLEBAR_H, VISIBLE_X,
  clampRect, defaultRect, isMobileWidth, isRect, isViewport, moveRect, nudgeRect, rectToStyle, resizeRect, snapRect, usableHeight,
} from "@/lib/os/window-geometry";

const viewports = [{ w: 320, h: 480 }, { w: 768, h: 1024 }, { w: 1280, h: 720 }, { w: 1920, h: 1080 }, { w: 3840, h: 2160 }];

describe("constantes", () => {
  it("coinciden con el diseño", () => {
    expect([MIN_W, MIN_H, TASKBAR_H, TITLEBAR_H, MOBILE_MAX]).toEqual([320, 220, 30, 30, 768]);
    expect([NUDGE_STEP, NUDGE_STEP_LARGE]).toEqual([16, 64]);
  });
  it("isMobileWidth sigue el breakpoint de Pocket", () => {
    expect(isMobileWidth(768)).toBe(true);
    expect(isMobileWidth(769)).toBe(false);
    expect(isMobileWidth(Number.NaN)).toBe(false);
  });
});

describe("clampRect", () => {
  it.each(viewports)("deja la barra de título alcanzable y la ventana dentro (%o)", (vp) => {
    for (const rect of [
      { x: -99_999, y: -99_999, w: 9, h: 9 }, { x: 99_999, y: 99_999, w: 99_999, h: 99_999 }, { x: 10, y: 10, w: 600, h: 400 },
    ]) {
      const r = clampRect(rect, vp);
      expect(r.w).toBeGreaterThanOrEqual(Math.min(MIN_W, vp.w));
      expect(r.w).toBeLessThanOrEqual(vp.w);
      expect(r.h).toBeLessThanOrEqual(usableHeight(vp));
      expect(r.x + r.w).toBeGreaterThanOrEqual(VISIBLE_X);
      expect(r.x).toBeLessThanOrEqual(vp.w - VISIBLE_X);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeLessThanOrEqual(vp.h - TASKBAR_H - TITLEBAR_H);
      expect(Object.values(r).every(Number.isInteger)).toBe(true);
    }
  });
  it("sustituye NaN e Infinity por valores finitos", () => {
    const r = clampRect({ x: Number.NaN, y: Number.POSITIVE_INFINITY, w: Number.NaN, h: Number.NEGATIVE_INFINITY }, { w: 1280, h: 720 });
    expect(Object.values(r).every(Number.isFinite)).toBe(true);
  });
  it("es idempotente", () => {
    for (const vp of viewports) {
      const once = clampRect({ x: 5000, y: 5000, w: 5000, h: 5000 }, vp);
      expect(clampRect(once, vp)).toEqual(once);
    }
  });
  it("un viewport inválido usa el por defecto", () => {
    expect(clampRect({ x: 0, y: 0, w: 400, h: 300 }, { w: Number.NaN, h: Number.NaN })).toEqual(clampRect({ x: 0, y: 0, w: 400, h: 300 }, { w: 1280, h: 720 }));
  });
});

describe("defaultRect", () => {
  it.each(viewports)("cabe en el viewport (%o)", (vp) => {
    for (const id of ["welcome", "projects", "contact", "project:x", "desconocida"]) {
      const r = defaultRect(id, 0, vp);
      expect(clampRect(r, vp)).toEqual(r);
    }
  });
  it("la cascada desplaza y da la vuelta a los 8 pasos", () => {
    const vp = { w: 1280, h: 720 };
    const a = defaultRect("about", 0, vp);
    const b = defaultRect("about", 1, vp);
    expect(b.x - a.x).toBe(28);
    expect(defaultRect("about", CASCADE_SLOTS, vp)).toEqual(a);
    expect(defaultRect("about", -1, vp)).toEqual(defaultRect("about", CASCADE_SLOTS - 1, vp));
  });
});

describe("moveRect, resizeRect y nudgeRect", () => {
  const vp = { w: 1280, h: 720 };
  const base = { x: 100, y: 100, w: 600, h: 400 };
  it("moveRect clampa y conserva el tamaño", () => {
    expect(moveRect(base, 50, 60, vp)).toEqual({ ...base, x: 50, y: 60 });
    expect(moveRect(base, 99_999, -5, vp)).toMatchObject({ x: vp.w - VISIBLE_X, y: 0, w: 600, h: 400 });
  });
  it("resizeRect respeta mínimos y borde derecho e inferior", () => {
    expect(resizeRect(base, { w: 1, h: 1 }, vp)).toMatchObject({ w: MIN_W, h: MIN_H });
    const big = resizeRect(base, { w: 99_999, h: 99_999 }, vp);
    expect(big.x + big.w).toBe(vp.w);
    expect(big.y + big.h).toBe(vp.h - TASKBAR_H);
  });
  it("NUDGE desplaza y cambia el tamaño en pasos", () => {
    expect(nudgeRect(base, { dx: NUDGE_STEP, dy: -NUDGE_STEP_LARGE, dw: 0, dh: 0 }, vp)).toEqual({ x: 116, y: 36, w: 600, h: 400 });
    expect(nudgeRect(base, { dx: 0, dy: 0, dw: NUDGE_STEP, dh: -NUDGE_STEP }, vp)).toEqual({ ...base, w: 616, h: 384 });
    expect(nudgeRect(base, { dx: 0, dy: 0, dw: -9999, dh: -9999 }, vp)).toMatchObject({ w: MIN_W, h: MIN_H });
    expect(nudgeRect(base, { dx: Number.NaN, dy: 0, dw: 0, dh: 0 }, vp)).toEqual(base);
  });
});

describe("snapRect", () => {
  const vp = { w: 1280, h: 720 };
  const cur = { x: 50, y: 50, w: 500, h: 300 };
  it("left y right ocupan la mitad útil sin pisar la barra de tareas", () => {
    expect(snapRect("left", vp, cur, "about")).toEqual({ x: 0, y: 0, w: 640, h: 690 });
    expect(snapRect("right", vp, cur, "about")).toEqual({ x: 640, y: 0, w: 640, h: 690 });
  });
  it("en viewports estrechos respeta el ancho mínimo", () => {
    const r = snapRect("left", { w: 400, h: 600 }, cur, "about");
    expect(r.w).toBe(MIN_W);
  });
  it("center conserva el tamaño y centra; default devuelve la inicial", () => {
    const c = snapRect("center", vp, cur, "about");
    expect(c).toMatchObject({ w: 500, h: 300, x: 390 });
    expect(snapRect("default", vp, cur, "about")).toEqual(defaultRect("about", 0, vp));
  });
});

describe("validadores y CSS", () => {
  it("isRect e isViewport rechazan datos corruptos", () => {
    expect(isRect({ x: 1, y: 2, w: 3, h: 4 })).toBe(true);
    for (const bad of [null, "x", 5, {}, { x: Number.NaN, y: 0, w: 1, h: 1 }, { x: 0, y: 0, w: 0, h: 1 }, { x: 0, y: 0, w: -1, h: 1 }, { x: "1", y: 0, w: 1, h: 1 }, { x: 1e9, y: 0, w: 1, h: 1 }]) {
      expect(isRect(bad)).toBe(false);
    }
    expect(isViewport({ w: 100, h: 100 })).toBe(true);
    expect(isViewport({ w: 0, h: 100 })).toBe(false);
    expect(isViewport(undefined)).toBe(false);
  });
  it("rectToStyle produce px enteros y nunca NaN", () => {
    expect(rectToStyle({ x: 10.4, y: -3.6, w: 500, h: 300 })).toEqual({ left: "10px", top: "-4px", width: "500px", height: "300px" });
    expect(JSON.stringify(rectToStyle({ x: Number.NaN, y: 0, w: Number.NaN, h: 1 }))).not.toContain("NaN");
  });
});
