/**
 * Navegación de menús (APG Menu) y type-ahead. Puro: sin React ni DOM.
 * `enabled[i]` es `false` para separadores y elementos deshabilitados (se saltan).
 */

export type MenuKey = "ArrowDown" | "ArrowUp" | "Home" | "End";

/**
 * Índice al que va el foco tras `key`. `current = -1` = nada enfocado todavía. Las flechas dan la vuelta
 * (APG); devuelve `-1` si no hay ningún elemento habilitado.
 */
export function nextIndex(enabled: readonly boolean[], current: number, key: MenuKey): number {
  const n = enabled.length;
  if (!enabled.some(Boolean)) return -1;
  if (key === "Home") return enabled.findIndex(Boolean);
  if (key === "End") return n - 1 - [...enabled].reverse().findIndex(Boolean);
  const step = key === "ArrowDown" ? 1 : -1;
  let index = current < 0 ? (step === 1 ? -1 : 0) : current;
  for (let i = 0; i < n; i += 1) {
    index = (index + step + n) % n;
    if (enabled[index]) return index;
  }
  return -1;
}

/** Minúsculas y sin acentos, para comparar el inicio de las etiquetas. */
export function foldLabel(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

export type TypeAheadBuffer = { readonly text: string; readonly at: number };
export const TYPE_AHEAD_MS = 600;
export const EMPTY_TYPE_AHEAD: TypeAheadBuffer = { text: "", at: 0 };

/** `true` si `key` es un carácter imprimible utilizable en type-ahead (no atajo, no tecla de control). */
export function isTypeAheadKey(event: { key: string; ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean }): boolean {
  return event.key.length === 1 && event.key.trim() !== "" && !event.ctrlKey && !event.altKey && !event.metaKey;
}

/** Añade `char` al buffer; si pasó más de `TYPE_AHEAD_MS` desde la última tecla, empieza de nuevo. */
export function pushTypeAhead(buffer: TypeAheadBuffer, char: string, now: number): TypeAheadBuffer {
  const base = now - buffer.at > TYPE_AHEAD_MS ? "" : buffer.text;
  return { text: base + foldLabel(char), at: now };
}

/**
 * Elemento que coincide con el buffer. Un solo carácter (o el mismo repetido) recorre las etiquetas que
 * empiezan por él a partir del siguiente al actual; varios caracteres distintos buscan el prefijo
 * completo desde el actual. `-1` si ninguno coincide.
 */
export function typeAheadIndex(labels: readonly string[], enabled: readonly boolean[], current: number, text: string): number {
  if (text === "") return -1;
  const n = labels.length;
  const repeated = text.length > 1 && [...text].every((c) => c === text[0]);
  const query = repeated ? text[0]! : text;
  const cycle = query.length === 1;
  const start = cycle ? current + 1 : Math.max(current, 0);
  for (let i = 0; i < n; i += 1) {
    const index = (start + i) % n;
    if (enabled[index] && foldLabel(labels[index]!).startsWith(query)) return index;
  }
  return -1;
}
