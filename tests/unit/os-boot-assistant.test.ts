import { describe, expect, it } from "vitest";
import { clearCorner, cornerBox, coversFocus, overlaps, type Box } from "@/lib/os/assistant";
import { CORNERS, DEFAULT_PREFS, normalizePrefs } from "@/lib/os/prefs";

const area: Box = { left: 0, top: 0, right: 1000, bottom: 600 };
const size = { w: 280, h: 280 };

describe("geometría de esquinas", () => {
  it("ancla la caja a cada esquina con margen", () => {
    expect(cornerBox("top-left", area, size, 8)).toEqual({ left: 8, top: 8, right: 288, bottom: 288 });
    expect(cornerBox("bottom-right", area, size, 8)).toEqual({ left: 712, top: 312, right: 992, bottom: 592 });
  });
  it("si no cabe, se recorta al área", () => {
    const box = cornerBox("bottom-right", { left: 0, top: 0, right: 200, bottom: 100 }, size, 0);
    expect(box.right - box.left).toBe(200);
    expect(box.bottom - box.top).toBe(100);
  });
  it("overlaps: tocarse por el borde no cuenta", () => {
    expect(overlaps({ left: 0, top: 0, right: 10, bottom: 10 }, { left: 10, top: 0, right: 20, bottom: 10 })).toBe(false);
    expect(overlaps({ left: 0, top: 0, right: 10, bottom: 10 }, { left: 9, top: 9, right: 20, bottom: 20 })).toBe(true);
  });
  it("un elemento sin área no se considera tapado", () => {
    expect(coversFocus({ left: 0, top: 0, right: 100, bottom: 100 }, { left: 10, top: 10, right: 10, bottom: 10 })).toBe(false);
  });
});

describe("clearCorner (2.4.11)", () => {
  const focusAt = (corner: (typeof CORNERS)[number]): Box => cornerBox(corner, area, { w: 40, h: 20 }, 20);
  it("elige una esquina libre distinta de la actual", () => {
    const next = clearCorner("bottom-right", focusAt("bottom-right"), area, size, 8);
    expect(next).not.toBeNull();
    expect(next).not.toBe("bottom-right");
    expect(overlaps(cornerBox(next!, area, size, 8), focusAt("bottom-right"))).toBe(false);
  });
  it("si el foco ocupa el centro y todas las esquinas lo tapan, devuelve null (colapsar)", () => {
    const small: Box = { left: 0, top: 0, right: 400, bottom: 300 };
    expect(clearCorner("bottom-right", { left: 150, top: 100, right: 250, bottom: 200 }, small, size, 0)).toBeNull();
  });
  it("nunca devuelve la esquina actual", () => {
    for (const corner of CORNERS) expect(clearCorner(corner, { left: 480, top: 280, right: 520, bottom: 320 }, area, { w: 100, h: 100 }, 0)).not.toBe(corner);
  });
});

describe("preferencia de esquina", () => {
  it("por defecto abajo a la derecha; un valor inválido vuelve al defecto (misma referencia)", () => {
    expect(DEFAULT_PREFS.assistantCorner).toBe("bottom-right");
    expect(normalizePrefs({ assistantCorner: "centro" })).toBe(DEFAULT_PREFS);
    expect(normalizePrefs({ assistantCorner: "top-left" }).assistantCorner).toBe("top-left");
  });
});
