/**
 * Atajos globales opt-in (docs/arquitectura-os.md §4, Q4). Puro: sin React ni DOM.
 * Se comparan con `event.code` (posición física) y la ayuda visible muestra esa misma tecla.
 */

export type ShortcutId = "start" | "taskbar" | "desktop" | "cyclePrev" | "cycleNext" | "close" | "help";

export type ShortcutDef = {
  readonly id: ShortcutId;
  /** `KeyboardEvent.code` que lo dispara (con Alt+Shift). */
  readonly code: string;
};

export const SHORTCUTS: readonly ShortcutDef[] = [
  { id: "start", code: "KeyI" },
  { id: "taskbar", code: "KeyT" },
  { id: "desktop", code: "KeyD" },
  { id: "cyclePrev", code: "ArrowUp" },
  { id: "cycleNext", code: "ArrowDown" },
  { id: "close", code: "KeyW" },
  { id: "help", code: "KeyH" },
];

/** Filas de la ayuda visible: claves de copy (`ui.osShell.shortcuts`) y los códigos que muestra cada una. */
export const SHORTCUT_ROWS = [
  { text: "openStart", keys: "keyStart", codes: ["KeyI"] },
  { text: "focusTaskbar", keys: "keyTaskbar", codes: ["KeyT"] },
  { text: "focusDesktop", keys: "keyDesktop", codes: ["KeyD"] },
  { text: "cycleWindows", keys: "keyCycle", codes: ["ArrowUp", "ArrowDown"] },
  { text: "closeWindow", keys: "keyClose", codes: ["KeyW"] },
  { text: "help", keys: "keyHelp", codes: ["KeyH"] },
] as const;

/** Lo mínimo de un `KeyboardEvent` que necesita el filtro. */
export type KeyLike = {
  code: string;
  key?: string;
  keyCode?: number;
  altKey: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  repeat: boolean;
  isComposing?: boolean;
};

/** Lo mínimo de un elemento para saber si es un campo editable. */
export type TargetLike = {
  tagName?: string;
  type?: string;
  isContentEditable?: boolean;
  getAttribute?(name: string): string | null;
  closest?(selector: string): unknown;
} | null | undefined;

const NON_TEXT_INPUTS = new Set(["button", "checkbox", "radio", "submit", "reset", "range", "color", "file", "image"]);

/** Campos donde se escribe (el atajo no debe interferir): input de texto, textarea, select, contenteditable, textbox. */
export function isEditableTarget(target: TargetLike): boolean {
  if (!target) return false;
  const tag = (target.tagName ?? "").toUpperCase();
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") return !NON_TEXT_INPUTS.has((target.type ?? "text").toLowerCase());
  if (target.isContentEditable === true) return true;
  const role = target.getAttribute?.("role");
  if (role === "textbox" || role === "searchbox" || role === "combobox") return true;
  return Boolean(target.closest?.('[contenteditable=""], [contenteditable="true"], [data-os-no-shortcuts]'));
}

/**
 * Atajo que corresponde al evento, o `null`. Exige Alt+Shift exactos (sin Ctrl ni Meta: AltGr se
 * reporta como Ctrl+Alt y escribe caracteres) y descarta repeticiones, composición IME
 * (`isComposing` o `keyCode` 229) y campos editables.
 */
export function matchShortcut(event: KeyLike, target: TargetLike, enabled: boolean): ShortcutId | null {
  if (!enabled) return null;
  if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) return null;
  if (event.repeat || event.isComposing === true || event.keyCode === 229) return null;
  if (isEditableTarget(target)) return null;
  return SHORTCUTS.find((shortcut) => shortcut.code === event.code)?.id ?? null;
}

/** Etiqueta de la tecla física para la ayuda ("S", "↑"): `KeyS` → "S". */
export function physicalKeyName(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code === "ArrowUp") return "↑";
  if (code === "ArrowDown") return "↓";
  return code;
}
