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

/** "2026-07" → "jul 2026" / "Jul 2026"; "2023" → "2023". */
export function formatYearMonth(value: string, locale: Locale): string {
  const [year, month] = value.split("-");
  if (!month) return year;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return new Intl.DateTimeFormat(intlLocale[locale], { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}
