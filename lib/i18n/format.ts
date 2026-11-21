/**
 * Fechas con `Intl` según el idioma de la página (`intlLocale` de content/routes.ts).
 * Zona UTC a propósito: `new Date("2024-05-24")` es medianoche UTC y en America/Bogota se
 * mostraría como el día anterior.
 */
import { intlLocale } from "@/content/routes";
import type { Locale } from "@/content/types";

/** "YYYY-MM-DD" → fecha larga ("24 de mayo de 2024" / "May 24, 2024"). */
export function formatDate(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

/**
 * "2026-07" → "jul 2026" / "Jul 2026"; "2023" → "2023". Mes abreviado de Intl sin el "de" ni el
 * punto que añade es-CO ("sept." → "sept").
 */
export function formatYearMonth(value: string, locale: Locale): string {
  const [year, month] = value.split("-");
  if (!month) return year;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  const name = new Intl.DateTimeFormat(intlLocale[locale], { month: "short", timeZone: "UTC" }).format(date).replace(/\.$/, "");
  return `${name} ${year}`;
}

/** Espacio fino (U+2009) a ambos lados de la raya de intervalo. */
const RANGE_SEPARATOR = " – ";

/** Intervalo "jul 2026 – dic 2026" (o "jul 2026 – actualidad" sin fin), con espacios finos. */
export function formatPeriod(start: string, end: string | null | undefined, present: string, locale: Locale): string {
  return `${formatYearMonth(start, locale)}${RANGE_SEPARATOR}${end ? formatYearMonth(end, locale) : present}`;
}
