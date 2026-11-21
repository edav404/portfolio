import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "@/lib/server/rate-limit";

const WINDOW = 60_000;

describe("createRateLimiter: ventana fija", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite hasta `limit` intentos por ventana y rechaza el siguiente", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: WINDOW });
    expect([1, 2, 3].map(() => limiter.check("a").ok)).toEqual([true, true, true]);
    const fourth = limiter.check("a");
    expect(fourth.ok).toBe(false);
    expect(fourth.retryAfter).toBe(60);
  });

  it("retryAfter son los segundos que faltan para el reinicio (mínimo 1)", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: WINDOW });
    limiter.check("a");
    vi.advanceTimersByTime(WINDOW - 30_500);
    expect(limiter.check("a").retryAfter).toBe(31);
    vi.advanceTimersByTime(30_400);
    expect(limiter.check("a").retryAfter).toBe(1);
  });

  it("el primer intento de una ventana devuelve retryAfter 0", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: WINDOW });
    expect(limiter.check("a")).toMatchObject({ ok: true, retryAfter: 0 });
  });

  it("reinicia el contador cuando la ventana caduca", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: WINDOW });
    limiter.check("a");
    expect(limiter.check("a").ok).toBe(false);
    vi.advanceTimersByTime(WINDOW);
    expect(limiter.check("a").ok).toBe(true);
  });

  it("cada clave tiene su propio contador", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: WINDOW });
    expect(limiter.check("a").ok).toBe(true);
    expect(limiter.check("b").ok).toBe(true);
    expect(limiter.check("a").ok).toBe(false);
  });
});

describe("createRateLimiter: bucket de desbordamiento (SEC-05)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("con el mapa lleno, las claves nuevas comparten un único bucket y no expulsan a las existentes", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const limiter = createRateLimiter({ limit: 1, windowMs: WINDOW, maxKeys: 2, name: "test" });
    limiter.check("a");
    limiter.check("b");
    // "c" cae en el bucket de desbordamiento; "d" lo comparte y ya está agotado.
    expect(limiter.check("c").ok).toBe(true);
    expect(limiter.check("d").ok).toBe(false);
    expect(limiter.check("e").ok).toBe(false);
    // Las claves existentes conservan su contador (no se expulsaron).
    expect(limiter.check("a").ok).toBe(false);
    expect(limiter.check("b").ok).toBe(false);
    // El aviso se registra una sola vez por ventana.
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("[test]");
  });

  it("purga las entradas caducadas antes de recurrir al desbordamiento", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const limiter = createRateLimiter({ limit: 1, windowMs: WINDOW, maxKeys: 2 });
    limiter.check("a");
    limiter.check("b");
    vi.advanceTimersByTime(WINDOW);
    expect(limiter.check("c").ok).toBe(true);
    expect(limiter.check("d").ok).toBe(true);
    expect(limiter.check("c").ok).toBe(false);
  });

  it("vuelve a avisar en la ventana siguiente si sigue lleno", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const limiter = createRateLimiter({ limit: 5, windowMs: WINDOW, maxKeys: 1 });
    limiter.check("a");
    limiter.check("x");
    limiter.check("y");
    expect(warn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(WINDOW);
    limiter.check("a");
    limiter.check("z");
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe("createRateLimiter: release()", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("devuelve el intento a su bucket", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: WINDOW });
    limiter.check("a");
    limiter.check("a").release();
    expect(limiter.check("a").ok).toBe(true);
    expect(limiter.check("a").ok).toBe(false);
  });

  it("es idempotente: llamarlo dos veces solo descuenta una", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: WINDOW });
    limiter.check("a");
    const second = limiter.check("a");
    second.release();
    second.release();
    expect(limiter.check("a").ok).toBe(true);
    expect(limiter.check("a").ok).toBe(false);
  });

  it("no descuenta de una ventana nueva si la suya ya caducó", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: WINDOW });
    const old = limiter.check("a");
    vi.advanceTimersByTime(WINDOW);
    limiter.check("a");
    limiter.check("a");
    old.release();
    // La ventana nueva sigue con 2 intentos contados: el tercero se rechaza.
    expect(limiter.check("a").ok).toBe(false);
  });

  it("tampoco descuenta si la ventana caducó pero aún no se ha creado la nueva", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: WINDOW });
    const old = limiter.check("a");
    vi.advanceTimersByTime(WINDOW);
    old.release();
    expect(limiter.check("a").ok).toBe(true);
    expect(limiter.check("a").ok).toBe(false);
  });

  it("los releases de claves distintas no se cruzan", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: WINDOW });
    limiter.check("a").release();
    limiter.check("b");
    expect(limiter.check("b").ok).toBe(false);
  });
});
