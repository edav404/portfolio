/**
 * Anunciador (docs/arquitectura-os.md §4, "Anuncios sobrios"): UN `role="status"` visualmente oculto,
 * montado siempre. La cola deduplica mensajes consecutivos iguales y deja al menos `MIN_GAP_MS` entre
 * mensajes para que el lector de pantalla no los pise. La lógica (`createAnnouncer`) es pura e
 * inyecta reloj y temporizadores para poder probarla.
 */
export const MIN_GAP_MS = 1000;
const MAX_QUEUE = 4;

export type AnnouncerClock = {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
};

export type Announcer = {
  announce(text: string): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): string;
  /** Cancela el temporizador pendiente y vacía la cola. */
  dispose(): void;
};

const realClock: AnnouncerClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function createAnnouncer(clock: AnnouncerClock = realClock): Announcer {
  const listeners = new Set<() => void>();
  const queue: string[] = [];
  let message = "";
  let lastAt = Number.NEGATIVE_INFINITY;
  let timer: unknown = null;
  let toggle = false;

  const emit = (text: string) => {
    // Un mismo texto seguido no cambia el nodo y no se vuelve a leer: se alterna un espacio fino final.
    toggle = text === message.trimEnd() ? !toggle : false;
    message = toggle ? `${text} ` : text;
    lastAt = clock.now();
    listeners.forEach((listener) => listener());
  };

  const pump = () => {
    timer = null;
    const next = queue.shift();
    if (next === undefined) return;
    emit(next);
    if (queue.length > 0) timer = clock.setTimeout(pump, MIN_GAP_MS);
  };

  return {
    announce(text) {
      if (text === "") return;
      if (queue.length > 0 ? queue[queue.length - 1] === text : false) return;
      const wait = lastAt + MIN_GAP_MS - clock.now();
      if (timer === null && wait <= 0) { emit(text); return; }
      queue.push(text);
      while (queue.length > MAX_QUEUE) queue.shift();
      if (timer === null) timer = clock.setTimeout(pump, Math.max(0, wait));
    },
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => message,
    dispose() {
      if (timer !== null) clock.clearTimeout(timer);
      timer = null;
      queue.length = 0;
    },
  };
}
