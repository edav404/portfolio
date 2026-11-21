import { describe, expect, it } from "vitest";
import { contactErrorCodes } from "@/content/contact-errors";
import { failureMessage, parseRetryAfter, waitText, type ContactMessages } from "@/lib/os/contact-submit";
import { formatYearMonth } from "@/lib/os/period";

const copy: ContactMessages = {
  errors: Object.fromEntries(contactErrorCodes.map((code) => [code, `E:${code}`])) as ContactMessages["errors"],
  generic: "generic",
  network: "network",
  rateLimitedWait: "espera {wait}",
  waitUnits: { second: "1 segundo", seconds: "{n} segundos", minute: "1 minuto", minutes: "{n} minutos" },
};

describe("failureMessage", () => {
  it("traduce cada código conocido", () => {
    for (const code of contactErrorCodes) expect(failureMessage({ status: 400, retryAfter: null, code }, copy)).toBe(`E:${code}`);
  });

  it("un código desconocido o ausente da el mensaje genérico", () => {
    expect(failureMessage({ status: 500, retryAfter: null, code: "raro" }, copy)).toBe("generic");
    expect(failureMessage({ status: 500, retryAfter: null }, copy)).toBe("generic");
  });

  it("un 429 con Retry-After legible muestra la espera; sin él, el código", () => {
    expect(failureMessage({ status: 429, retryAfter: "90", code: "rate_limited" }, copy)).toBe("espera 2 minutos");
    expect(failureMessage({ status: 429, retryAfter: null, code: "rate_limited" }, copy)).toBe("E:rate_limited");
    expect(failureMessage({ status: 400, retryAfter: "90", code: "invalid" }, copy)).toBe("E:invalid");
  });
});

describe("parseRetryAfter / waitText", () => {
  it("segundos, fecha HTTP e inválidos", () => {
    expect(parseRetryAfter("30")).toBe(30);
    expect(parseRetryAfter("1.2")).toBe(2);
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter("mañana")).toBeNull();
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    expect(parseRetryAfter(new Date(now + 45_000).toUTCString(), now)).toBe(45);
    expect(parseRetryAfter(new Date(now - 45_000).toUTCString(), now)).toBe(0);
  });

  it("singular y plural en segundos y minutos", () => {
    expect(waitText(1, copy.waitUnits)).toBe("1 segundo");
    expect(waitText(45, copy.waitUnits)).toBe("45 segundos");
    expect(waitText(60, copy.waitUnits)).toBe("1 minuto");
    expect(waitText(61, copy.waitUnits)).toBe("2 minutos");
  });
});

describe("formatYearMonth", () => {
  it("mes y año, solo año y valores no reconocidos", () => {
    expect(formatYearMonth("2026-07", "es")).toMatch(/jul.* 2026/i);
    expect(formatYearMonth("2026-07", "en")).toBe("Jul 2026");
    expect(formatYearMonth("2020", "es")).toBe("2020");
    expect(formatYearMonth("2026-13", "es")).toBe("2026");
    expect(formatYearMonth("hoy", "es")).toBe("hoy");
  });
});
