/** Periodos de experiencia («jul. 2026 – actualidad»). Puro. */
import type { Locale } from "@/content/types";

const MONTH_RE = /^(\d{4})(?:-(\d{2}))?$/;

/** «2026-07» → «jul. 2026»; «2026» → «2026». Un valor no reconocido se devuelve tal cual. */
export function formatYearMonth(value: string, locale: Locale): string {
  const match = MONTH_RE.exec(value);
  if (!match) return value;
  const [, year, month] = match;
  if (!month) return year;
  const monthIndex = Number(month) - 1;
  if (monthIndex < 0 || monthIndex > 11) return year;
  const label = new Intl.DateTimeFormat(locale === "es" ? "es-CO" : "en-US", { month: "short", timeZone: "UTC" }).format(Date.UTC(2000, monthIndex, 1));
  return `${label} ${year}`;
}
