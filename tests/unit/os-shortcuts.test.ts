import { describe, expect, it } from "vitest";
import { SHORTCUTS, SHORTCUT_ROWS, isEditableTarget, matchShortcut, physicalKeyName, type KeyLike } from "@/lib/os/shortcuts";

const key = (over: Partial<KeyLike> = {}): KeyLike => ({ code: "KeyI", altKey: true, shiftKey: true, ctrlKey: false, metaKey: false, repeat: false, isComposing: false, ...over });
const div = { tagName: "DIV" };

describe("matchShortcut", () => {
  it("desactivado por defecto: sin opt-in no hay atajo", () => {
    expect(matchShortcut(key(), div, false)).toBeNull();
    expect(matchShortcut(key(), div, true)).toBe("start");
  });
  it("usa event.code (posición física), no el carácter", () => {
    expect(matchShortcut(key({ code: "KeyI", key: "i" }), div, true)).toBe("start");
    expect(matchShortcut(key({ code: "KeyH", key: "s" }), div, true)).toBe("help");
    expect(matchShortcut(key({ code: "ArrowUp" }), div, true)).toBe("cyclePrev");
    expect(matchShortcut(key({ code: "ArrowDown" }), div, true)).toBe("cycleNext");
  });
  it("exige Alt+Shift exactos", () => {
    expect(matchShortcut(key({ altKey: false }), div, true)).toBeNull();
    expect(matchShortcut(key({ shiftKey: false }), div, true)).toBeNull();
    expect(matchShortcut(key({ ctrlKey: true }), div, true)).toBeNull(); // AltGr = Ctrl+Alt
    expect(matchShortcut(key({ metaKey: true }), div, true)).toBeNull();
  });
  it("ignora repeticiones e IME", () => {
    expect(matchShortcut(key({ repeat: true }), div, true)).toBeNull();
    expect(matchShortcut(key({ isComposing: true }), div, true)).toBeNull();
    expect(matchShortcut(key({ keyCode: 229 }), div, true)).toBeNull();
  });
  it("ignora campos editables, incluida la terminal", () => {
    expect(matchShortcut(key(), { tagName: "INPUT", type: "text" }, true)).toBeNull();
    expect(matchShortcut(key(), { tagName: "TEXTAREA" }, true)).toBeNull();
    expect(matchShortcut(key(), { tagName: "DIV", isContentEditable: true }, true)).toBeNull();
    expect(matchShortcut(key(), { tagName: "DIV", closest: (s) => (s.includes("data-os-no-shortcuts") ? {} : null) }, true)).toBeNull();
  });
  it("ignora teclas no definidas", () => {
    expect(matchShortcut(key({ code: "KeyM" }), div, true)).toBeNull();
  });
  it("cada atajo tiene un código único", () => {
    const codes = SHORTCUTS.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("ayuda visible", () => {
  it("muestra exactamente las teclas que disparan atajos", () => {
    const shown = SHORTCUT_ROWS.flatMap((row) => row.codes).sort();
    expect(shown).toEqual(SHORTCUTS.map((s) => s.code).sort());
  });
});

describe("isEditableTarget", () => {
  it("distingue campos de texto de botones y casillas", () => {
    expect(isEditableTarget({ tagName: "INPUT" })).toBe(true);
    expect(isEditableTarget({ tagName: "input", type: "email" })).toBe(true);
    expect(isEditableTarget({ tagName: "INPUT", type: "checkbox" })).toBe(false);
    expect(isEditableTarget({ tagName: "BUTTON" })).toBe(false);
    expect(isEditableTarget({ tagName: "SELECT" })).toBe(true);
    expect(isEditableTarget({ tagName: "DIV", getAttribute: (n) => (n === "role" ? "textbox" : null) })).toBe(true);
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe("physicalKeyName", () => {
  it("muestra la misma tecla que dispara el atajo", () => {
    expect(physicalKeyName("KeyI")).toBe("I");
    expect(physicalKeyName("ArrowUp")).toBe("↑");
    expect(physicalKeyName("ArrowDown")).toBe("↓");
  });
});
