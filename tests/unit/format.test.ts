import { describe, expect, it } from "vitest";
import { formatPeriod, formatYearMonth } from "@/lib/i18n/format";

const THIN = String.fromCharCode(0x2009);

describe("fechas cortas de experiencia (QA O3)", () => {
  it("mes corto + año por idioma, sin 'de' ni punto", () => {
    expect(formatYearMonth("2026-07", "es")).toBe("jul 2026");
    expect(formatYearMonth("2026-07", "en")).toBe("Jul 2026");
    expect(formatYearMonth("2025-09", "es")).not.toMatch(/\.|\bde\b/);
    expect(formatYearMonth("2023", "es")).toBe("2023");
  });

  it("intervalo con raya y espacios finos; sin fin → etiqueta de actualidad", () => {
    expect(formatPeriod("2026-07", "2026-12", "Actualidad", "es")).toBe(`jul 2026${THIN}–${THIN}dic 2026`);
    expect(formatPeriod("2024-01", null, "Present", "en")).toBe(`Jan 2024${THIN}–${THIN}Present`);
  });
});
