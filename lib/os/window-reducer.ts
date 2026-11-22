/**
 * Reducer puro del escritorio del SO (docs/arquitectura-os.md §2.1, §1.3, §12).
 * Sin React ni DOM. Estabilidad referencial: una acción sin efecto devuelve el MISMO estado y las
 * ventanas no tocadas conservan su objeto.
 *
 * Historial (sin `history.state`): `entries` es la pila en memoria de entradas de historial propias,
 * cada una con un id y la selección que la URL expresa. `ROUTE_CHANGED` deduce Atrás/Adelante
 * comparando el destino con las entradas vecinas; lo demás es el fallback por URL.
 */
import { isValidSegment } from "@/content/routes";
import type { Locale } from "@/content/types";
import {
  DEFAULT_VIEWPORT, clampRect, defaultRect, isRect, isViewport, moveRect, nudgeRect, resizeRect, sameRect, snapRect,
  type Rect, type SnapTarget, type Viewport,
} from "./window-geometry";
import { intentFromPath, planHistory, type HistoryPlan } from "./window-url";

export type { Rect, Viewport } from "./window-geometry";

export const APP_IDS = ["welcome", "projects", "services", "about", "contact", "media", "terminal", "settings"] as const;
export type AppId = (typeof APP_IDS)[number];
export type WindowId = AppId | `project:${string}`;
export type Origin = "user" | "route" | "hydrate";
export type RouteTarget = { kind: "desktop" } | { kind: "project"; slug: string };

export type WindowState = {
  id: WindowId;
  minimized: boolean;
  maximized: boolean;
  /** Geometría restaurada (nunca la maximizada). */
  rect: Rect;
};

export type SavedGeometry = Rect & { maximized?: boolean };

/** Entrada de historial propia: id único dentro de la sesión y proyecto seleccionado que expresa su URL. */
export type HistoryEntry = {
  id: string;
  sel: string | null;
  /** Tras un fallback por URL: hay entradas anteriores desconocidas (Atrás desde aquí no es identificable). */
  unknownBefore?: true;
};

/**
 * Intención de navegación pendiente: la que `act` ya lanzó a Next y este aún no ha confirmado. Se lleva
 * aparte del historial confirmado (`entries`) porque Next descarta una navegación pendiente si llega
 * otra. `created`: ventanas abiertas de forma optimista por intenciones aún sin confirmar; `superseded`:
 * destinos de intenciones sustituidas (Next pudo confirmarlos antes de descartarlos).
 */
export type PendingNav = { kind: "push" | "replace"; sel: string | null; created: WindowId[]; superseded: (string | null)[] };

export type OsState = {
  /** Presentes = abiertas (incluidas las minimizadas). El orden de las claves es el orden de la barra de tareas. */
  windows: Partial<Record<WindowId, WindowState>>;
  /** z-order: el último es el tope; z-index = índice. */
  order: WindowId[];
  viewport: Viewport;
  /** Contador para posiciones en cascada. */
  cascade: number;
  /** Slug del proyecto seleccionado (espejo de la URL). */
  selection: string | null;
  /** Id de la entrada de historial que creó cada ventana de proyecto. */
  openedBy: Partial<Record<WindowId, string>>;
  entries: HistoryEntry[];
  entryIndex: number;
  /** Contador de ids de entrada (en el estado, no en el módulo: el HTML estático hornearía el valor, §12.6). */
  entrySeq: number;
  /** Intención lanzada a Next y sin confirmar (`null` si no hay). `entries` solo recoge lo confirmado. */
  pending: PendingNav | null;
  /** Catálogo autorizado de slugs (inyectado). */
  known: readonly string[];
  /** Geometría recordada: cargada de almacenamiento o de ventanas ya cerradas. */
  saved: Partial<Record<WindowId, SavedGeometry>>;
};

export type Action = { origin?: Origin } & (
  | { type: "OPEN"; id: WindowId }
  | { type: "CLOSE"; id: WindowId }
  | { type: "FOCUS"; id: WindowId }
  | { type: "MINIMIZE"; id: WindowId }
  | { type: "TOGGLE_MAXIMIZE"; id: WindowId }
  | { type: "MOVE"; id: WindowId; x: number; y: number }
  | { type: "RESIZE"; id: WindowId; w: number; h: number; x?: number; y?: number }
  | { type: "NUDGE"; id: WindowId; dx: number; dy: number; dw: number; dh: number }
  | { type: "SNAP"; id: WindowId; to: SnapTarget }
  | { type: "RESET_GEOMETRY"; id?: WindowId }
  | { type: "HYDRATE"; viewport: Viewport; saved: Readonly<Record<string, unknown>>; /** Ajusta a la posición por defecto las abiertas sin geometría guardada (todo en la misma transición). */ snapUnsaved?: boolean }
  | { type: "SET_VIEWPORT"; w: number; h: number }
  | { type: "ROUTE_CHANGED"; target: RouteTarget }
  | { type: "NAV_TIMEOUT" }
  | { type: "POCKET_BACK" }
  | { type: "MINIMIZE_ALL" }
  | { type: "CLOSE_ALL" }
  | { type: "CYCLE"; dir: 1 | -1 }
);

// --- Ids ---------------------------------------------------------------------------------------

export function projectWindowId(slug: string): WindowId {
  return `project:${slug}`;
}

export function isAppId(value: unknown): value is AppId {
  return typeof value === "string" && (APP_IDS as readonly string[]).includes(value);
}

export function isWindowId(value: unknown): value is WindowId {
  return isAppId(value) || (typeof value === "string" && value.startsWith("project:") && isValidSegment(value.slice(8)));
}

/** Slug de una ventana de proyecto; `null` si es una app. */
export function slugOf(id: WindowId): string | null {
  return id.startsWith("project:") ? id.slice(8) : null;
}

// --- Selectores --------------------------------------------------------------------------------

/** Ids abiertos en orden de la barra de tareas (orden de apertura). */
export function taskbarIds(state: OsState): WindowId[] {
  return Object.keys(state.windows) as WindowId[];
}

export function visibleIds(state: OsState): WindowId[] {
  return state.order.filter((id) => state.windows[id]?.minimized === false);
}

/** Ventana activa derivada: la última de `order` no minimizada. */
export function activeId(state: OsState): WindowId | null {
  for (let i = state.order.length - 1; i >= 0; i--) {
    if (state.windows[state.order[i]]?.minimized === false) return state.order[i];
  }
  return null;
}

export function zIndexOf(state: OsState, id: WindowId): number {
  return state.order.indexOf(id);
}

/** Qué ventana quedaría activa si `id` desapareciera o se minimizara. */
export function nextAfterClose(state: OsState, id: WindowId): WindowId | null {
  for (let i = state.order.length - 1; i >= 0; i--) {
    const other = state.order[i];
    if (other !== id && state.windows[other]?.minimized === false) return other;
  }
  return null;
}

/** Geometría a persistir: la recordada más la de las ventanas abiertas. */
export function collectGeometry(state: OsState): Partial<Record<WindowId, SavedGeometry>> {
  const result: Partial<Record<WindowId, SavedGeometry>> = { ...state.saved };
  for (const id of Object.keys(state.windows) as WindowId[]) {
    const w = state.windows[id]!;
    result[id] = { ...w.rect, maximized: w.maximized };
  }
  return result;
}

/** Acciones tras las cuales hay que persistir la geometría. */
export function persistsGeometry(action: Action): boolean {
  switch (action.type) {
    case "MOVE": case "RESIZE": case "NUDGE": case "TOGGLE_MAXIMIZE": case "SNAP": case "RESET_GEOMETRY": return true;
    default: return false;
  }
}

/**
 * Política común de cierre (✕, Atrás, Escape, atajo): `confirm` indica que hay borrador y la UI
 * debe pedir confirmación antes de despachar `action`. En Pocket la acción es `POCKET_BACK`.
 */
export function requestClose(id: WindowId, opts: { dirty?: boolean; pocket?: boolean } = {}): { confirm: boolean; action: Action } {
  return { confirm: opts.dirty === true, action: opts.pocket ? { type: "POCKET_BACK" } : { type: "CLOSE", id } };
}

// --- Estado inicial ----------------------------------------------------------------------------

export function createInitialState(opts: { path: string; locale?: Locale; knownSlugs: readonly string[]; viewport?: Viewport }): OsState {
  const viewport = opts.viewport && isViewport(opts.viewport) ? opts.viewport : DEFAULT_VIEWPORT;
  const target = intentFromPath(opts.path, opts.knownSlugs);
  const slug = target?.kind === "project" ? target.slug : null;
  const id: WindowId = slug === null ? "welcome" : projectWindowId(slug);
  const base: OsState = {
    windows: {}, order: [], viewport, cascade: 0, selection: slug, openedBy: slug === null ? {} : { [id]: "e0" },
    entries: [{ id: "e0", sel: slug }], entryIndex: 0, entrySeq: 1, pending: null, known: opts.knownSlugs, saved: {},
  };
  return raise(base, id);
}

// --- Piezas internas ---------------------------------------------------------------------------

function top(order: WindowId[], id: WindowId): WindowId[] {
  return order[order.length - 1] === id ? order : [...order.filter((x) => x !== id), id];
}

function omit<T>(record: Partial<Record<WindowId, T>>, id: WindowId): Partial<Record<WindowId, T>> {
  if (!(id in record)) return record;
  const copy = { ...record };
  delete copy[id];
  return copy;
}

/** Abre (usa la geometría recordada o la de cascada), restaura y lleva al tope. */
function raise(s: OsState, id: WindowId): OsState {
  const w = s.windows[id];
  if (w) {
    if (!w.minimized && s.order[s.order.length - 1] === id) return s;
    return { ...s, windows: w.minimized ? { ...s.windows, [id]: { ...w, minimized: false } } : s.windows, order: top(s.order, id) };
  }
  const saved = s.saved[id];
  const rect = saved ? clampRect(saved, s.viewport) : defaultRect(id, s.cascade, s.viewport);
  const created: WindowState = { id, minimized: false, maximized: saved?.maximized === true, rect };
  return { ...s, windows: { ...s.windows, [id]: created }, order: [...s.order, id], cascade: saved ? s.cascade : s.cascade + 1, saved: omit(s.saved, id) };
}

function removeWindow(s: OsState, id: WindowId): OsState {
  const w = s.windows[id];
  if (!w) return s;
  return {
    ...s,
    windows: omit(s.windows, id),
    order: s.order.filter((x) => x !== id),
    openedBy: omit(s.openedBy, id),
    saved: { ...s.saved, [id]: { ...w.rect, maximized: w.maximized } },
  };
}

function selectedVisible(s: OsState): boolean {
  return s.selection !== null && s.windows[projectWindowId(s.selection)]?.minimized === false;
}

/**
 * Lanza una intención de navegación (la URL manda sobre la selección: `selection` pasa ya a `sel`).
 * Si había otra pendiente, Next descarta la anterior: se funde en esta (sus ventanas optimistas se
 * conservan y se atribuyen a la entrada que acabe confirmándose). Si el destino es el de la entrada
 * confirmada, no hay nada que confirmar: se cancela lo pendiente (el plan emite un `replace` que
 * sustituye la navegación en vuelo).
 */
function startIntent(s: OsState, kind: "push" | "replace", sel: string | null, createdId: WindowId | null): OsState {
  const before = s.pending;
  const confirmed = s.entries[s.entryIndex]?.sel ?? null;
  if (before !== null && sel === confirmed) return { ...s, selection: sel, pending: null };
  if (before === null && kind === "replace" && sel === confirmed) return { ...s, selection: sel };
  const created = createdId ? [...(before?.created ?? []), createdId] : before?.created ?? [];
  const superseded = before ? [...before.superseded, before.sel] : [];
  return { ...s, selection: sel, pending: { kind, sel, created, superseded } };
}

/** Si la ventana seleccionada ya no está visible, `selection = null` (y, por el usuario, se sustituye la entrada). */
function clearSelection(s: OsState, origin: Origin): OsState {
  if (s.selection === null || selectedVisible(s)) return s;
  if (origin !== "user") return { ...s, selection: null };
  return startIntent(s, "replace", null, null);
}

/** Confirma la intención pendiente: Next ya muestra su ruta. Las ventanas optimistas quedan atribuidas a la entrada. */
function commitPending(s: OsState): OsState {
  const p = s.pending;
  if (p === null) return s;
  const id = `e${s.entrySeq}`;
  const replaced = s.entries[s.entryIndex];
  const entry: HistoryEntry = { id, sel: p.sel, ...(p.kind === "replace" && replaced?.unknownBefore ? { unknownBefore: true as const } : {}) };
  const openedBy = { ...s.openedBy };
  for (const w of p.created) if (s.windows[w]) openedBy[w] = id;
  const entries = p.kind === "push" ? [...s.entries.slice(0, s.entryIndex + 1), entry] : s.entries.map((e, i) => (i === s.entryIndex ? entry : e));
  return { ...s, entries, entryIndex: p.kind === "push" ? s.entryIndex + 1 : s.entryIndex, entrySeq: s.entrySeq + 1, openedBy, pending: null };
}

/** OPEN y FOCUS: reglas de §1.3. OPEN de un proyecto no seleccionado lo selecciona; FOCUS de uno visible solo cambia el z-order. */
function activate(s: OsState, id: WindowId, origin: Origin, create: boolean): OsState {
  if (!isWindowId(id)) return s;
  const existing = s.windows[id];
  if (!existing && !create) return s;
  const slug = slugOf(id);
  if (slug !== null && !existing && !s.known.includes(slug)) return s;
  const raised = raise(s, id);
  if (slug === null || origin !== "user") return raised;
  if (s.selection === slug) return raised;
  if (!create && existing !== undefined && !existing.minimized) return raised;
  return startIntent(raised, "push", slug, existing ? null : id);
}

function minimizeOne(s: OsState, id: WindowId): OsState {
  const w = s.windows[id];
  if (!w || w.minimized) return s;
  return { ...s, windows: { ...s.windows, [id]: { ...w, minimized: true } } };
}

function mapWindows(s: OsState, fn: (w: WindowState) => WindowState): OsState {
  let changed = false;
  const windows: Partial<Record<WindowId, WindowState>> = {};
  for (const id of Object.keys(s.windows) as WindowId[]) {
    const before = s.windows[id]!;
    const after = fn(before);
    if (after !== before) changed = true;
    windows[id] = after;
  }
  return changed ? { ...s, windows } : s;
}

function withRect(w: WindowState, rect: Rect): WindowState {
  return sameRect(w.rect, rect) ? w : { ...w, rect };
}

function replaceWindow(s: OsState, id: WindowId, next: WindowState): OsState {
  return next === s.windows[id] ? s : { ...s, windows: { ...s.windows, [id]: next } };
}

function parseSaved(raw: unknown): Partial<Record<WindowId, SavedGeometry>> {
  const result: Partial<Record<WindowId, SavedGeometry>> = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return result;
  for (const [key, value] of Object.entries(raw)) {
    if (!isWindowId(key) || !isRect(value)) continue;
    const v = value as Rect & { maximized?: unknown };
    result[key] = { x: v.x, y: v.y, w: v.w, h: v.h, ...(typeof v.maximized === "boolean" ? { maximized: v.maximized } : {}) };
  }
  return result;
}

function sameSaved(a: SavedGeometry | undefined, b: SavedGeometry | undefined): boolean {
  return a !== undefined && b !== undefined && sameRect(a, b) && a.maximized === b.maximized;
}

/** Abre/restaura/enfoca el proyecto de una navegación (Atrás, Adelante, URL ajena) y lo selecciona. */
function openForNavigation(s: OsState, slug: string, entryId: string): OsState {
  const id = projectWindowId(slug);
  const created = !s.windows[id];
  const raised = raise(s, id);
  return { ...raised, selection: slug, openedBy: created ? { ...raised.openedBy, [id]: entryId } : raised.openedBy };
}

/**
 * Fallback por URL (destino ambiguo, no adyacente o ajeno): la posición en el historial real es
 * desconocida, así que la pila propia se reinicia en esta entrada. No se deshace ninguna apertura salvo
 * la de la ventana seleccionada al volver al escritorio (si la abrió una entrada).
 */
function fallbackByUrl(s: OsState, key: string | null): OsState {
  const id = `e${s.entrySeq}`;
  let out: OsState = { ...s, entries: [{ id, sel: key, unknownBefore: true }], entryIndex: 0, entrySeq: s.entrySeq + 1 };
  if (key !== null) return openForNavigation(out, key, id);
  if (s.selection !== null && s.openedBy[projectWindowId(s.selection)] !== undefined) out = removeWindow(out, projectWindowId(s.selection));
  return { ...out, selection: null };
}

/**
 * La ruta observada cambió. Se reconcilia con la intención pendiente (la confirma, o la descarta si es
 * otra navegación) y, si no era nuestra, se deduce Atrás/Adelante SOLO cuando el destino es la entrada
 * vecina e inequívoca; si no, fallback por URL.
 */
function routeChanged(s: OsState, target: RouteTarget): OsState {
  const key = target.kind === "project" ? target.slug : null;
  if (key !== null && !s.known.includes(key)) return s;
  let st = s;
  const p = st.pending;
  if (p !== null) {
    if (p.sel === key) return commitPending(st);
    // Next confirmó una intención ya sustituida antes de descartarla: no es una navegación nueva.
    if (p.superseded.includes(key)) return st;
    // Otra navegación (Atrás, enlace...) sustituye a la nuestra: se descarta; las ventanas optimistas se quedan abiertas.
    st = { ...st, pending: null, selection: st.entries[st.entryIndex]?.sel ?? null };
  }
  // Transición idempotente: ya estamos ahí (misma selección y, si hay proyecto, ventana visible).
  if (st.selection === key && (key === null || selectedVisible(st))) return st;
  // La entrada confirmada ya expresa este destino (se canceló lo pendiente): solo se vuelve a seleccionar.
  if (st !== s && st.entries[st.entryIndex]?.sel === key) {
    return key === null ? st : raise({ ...st, selection: key }, projectWindowId(key));
  }

  // Entradas consecutivas con la misma URL (p. ej. dos `/os/` tras un replace) no cambian la ruta observada:
  // el cursor puede estar en cualquier punto de esa racha, así que los vecinos son los de sus extremos.
  const here = st.entries[st.entryIndex]?.sel;
  let lo = st.entryIndex;
  let hi = st.entryIndex;
  while (lo > 0 && st.entries[lo - 1].sel === here) lo--;
  while (hi < st.entries.length - 1 && st.entries[hi + 1].sel === here) hi++;
  const prev = st.entries[lo - 1];
  const next = st.entries[hi + 1];
  const hitPrev = prev !== undefined && prev.sel === key;
  // Con entradas anteriores desconocidas, ir «atrás» a la URL de la siguiente es indistinguible de ir adelante.
  const hitNext = next !== undefined && next.sel === key && !(lo === 0 && st.entries[0].unknownBefore);
  if (hitPrev === hitNext) return fallbackByUrl(st, key);

  const j = hitPrev ? lo - 1 : hi + 1;
  let out = st;
  if (j < st.entryIndex) {
    // Atrás: se deshacen las aperturas de las entradas posteriores a la destino.
    for (const id of Object.keys(st.openedBy) as WindowId[]) {
      if (st.entries.findIndex((e) => e.id === st.openedBy[id]) > j) out = removeWindow(out, id);
    }
  }
  const entry = st.entries[j];
  out = entry.sel !== null ? openForNavigation(out, entry.sel, entry.id) : { ...out, selection: null };
  return { ...out, entryIndex: j };
}

/** La navegación pendiente no se confirmó: la URL sigue en la entrada confirmada; las ventanas optimistas siguen abiertas. */
function navTimeout(s: OsState): OsState {
  if (s.pending === null) return s;
  const sel = s.entries[s.entryIndex]?.sel ?? null;
  const out: OsState = { ...s, pending: null, selection: sel !== null && s.windows[projectWindowId(sel)] ? sel : null };
  return out.selection === null ? out : raise(out, projectWindowId(out.selection));
}

// --- Reducer -----------------------------------------------------------------------------------

export function reduce(state: OsState, action: Action): OsState {
  const origin = action.origin ?? "user";
  switch (action.type) {
    case "OPEN": return activate(state, action.id, origin, true);
    case "FOCUS": return activate(state, action.id, origin, false);

    case "CLOSE": {
      const next = removeWindow(state, action.id);
      return next === state ? state : clearSelection(next, origin);
    }
    case "POCKET_BACK": {
      const id = activeId(state);
      return id === null ? state : clearSelection(removeWindow(state, id), origin);
    }
    case "MINIMIZE": {
      const next = minimizeOne(state, action.id);
      return next === state ? state : clearSelection(next, origin);
    }
    case "MINIMIZE_ALL": {
      if (visibleIds(state).length === 0) return state;
      return clearSelection(mapWindows(state, (w) => (w.minimized ? w : { ...w, minimized: true })), origin);
    }
    case "CLOSE_ALL": {
      const ids = Object.keys(state.windows) as WindowId[];
      if (ids.length === 0) return state;
      return clearSelection(ids.reduce(removeWindow, state), origin);
    }

    case "TOGGLE_MAXIMIZE": {
      const w = state.windows[action.id];
      if (!w) return state;
      const toggled = { ...state, windows: { ...state.windows, [action.id]: { ...w, maximized: !w.maximized, minimized: false } } };
      return raise(toggled, action.id);
    }
    case "MOVE": {
      const w = state.windows[action.id];
      if (!w || w.maximized) return state;
      return replaceWindow(state, action.id, withRect(w, moveRect(w.rect, action.x, action.y, state.viewport)));
    }
    case "RESIZE": {
      const w = state.windows[action.id];
      if (!w || w.maximized) return state;
      return replaceWindow(state, action.id, withRect(w, resizeRect(w.rect, action, state.viewport)));
    }
    case "NUDGE": {
      const w = state.windows[action.id];
      if (!w || w.maximized) return state;
      return replaceWindow(state, action.id, withRect(w, nudgeRect(w.rect, action, state.viewport)));
    }
    case "SNAP": {
      const w = state.windows[action.id];
      if (!w) return state;
      const rect = snapRect(action.to, state.viewport, w.rect, action.id);
      return sameRect(w.rect, rect) && !w.maximized ? state : replaceWindow(state, action.id, { ...w, rect, maximized: false });
    }
    case "RESET_GEOMETRY": {
      if (action.id !== undefined) {
        const w = state.windows[action.id];
        const saved = omit(state.saved, action.id);
        const base = saved === state.saved ? state : { ...state, saved };
        if (!w) return base;
        const rect = defaultRect(action.id, 0, state.viewport);
        return replaceWindow(base, action.id, sameRect(w.rect, rect) && !w.maximized ? w : { ...w, rect, maximized: false });
      }
      let slot = 0;
      const reset = mapWindows(state, (w) => {
        const rect = defaultRect(w.id, slot++, state.viewport);
        return sameRect(w.rect, rect) && !w.maximized ? w : { ...w, rect, maximized: false };
      });
      return Object.keys(state.saved).length === 0 ? reset : { ...reset, saved: {} };
    }

    case "SET_VIEWPORT": {
      const viewport = { w: action.w, h: action.h };
      if (!isViewport(viewport) || (viewport.w === state.viewport.w && viewport.h === state.viewport.h)) return state;
      return mapWindows({ ...state, viewport }, (w) => withRect(w, clampRect(w.rect, viewport)));
    }
    case "HYDRATE": {
      const viewport = isViewport(action.viewport) ? { w: action.viewport.w, h: action.viewport.h } : state.viewport;
      const saved = parseSaved(action.saved);
      const sameViewport = viewport.w === state.viewport.w && viewport.h === state.viewport.h;
      const mergedSaved: Partial<Record<WindowId, SavedGeometry>> = { ...state.saved };
      let savedChanged = false;
      for (const id of Object.keys(saved) as WindowId[]) {
        if (state.windows[id]) continue; // las abiertas se aplican abajo
        if (!sameSaved(mergedSaved[id], saved[id])) { mergedSaved[id] = saved[id]; savedChanged = true; }
      }
      const withVp = sameViewport ? state : { ...state, viewport };
      const windows = mapWindows(withVp, (w) => {
        const stored = saved[w.id];
        const rect = stored === undefined && action.snapUnsaved ? snapRect("default", viewport, w.rect, w.id) : clampRect(stored ?? w.rect, viewport);
        const maximized = stored?.maximized ?? w.maximized;
        return sameRect(w.rect, rect) && w.maximized === maximized ? w : { ...w, rect, maximized };
      });
      return savedChanged ? { ...windows, saved: mergedSaved } : windows;
    }

    case "CYCLE": {
      const list = taskbarIds(state).filter((id) => state.windows[id]!.minimized === false);
      if (list.length < 2) return state;
      const active = activeId(state);
      const index = active === null ? -1 : list.indexOf(active);
      const nextId = list[(index + action.dir + list.length) % list.length];
      return raise(state, nextId);
    }

    case "ROUTE_CHANGED": return routeChanged(state, action.target);
    case "NAV_TIMEOUT": return navTimeout(state);
  }
}

/** Reducer + plan de historial en un paso (lo usa `useOsNavigation`: despacha y ejecuta el plan). */
export function reduceWithHistory(state: OsState, action: Action, locale: Locale): { state: OsState; plan: HistoryPlan } {
  const next = reduce(state, action);
  return { state: next, plan: planHistory(state, next, action, locale) };
}
