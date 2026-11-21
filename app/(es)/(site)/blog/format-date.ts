/**
 * Fecha "YYYY-MM-DD" en formato largo español. Zona UTC a propósito: `new Date("2024-05-24")`
 * es medianoche UTC y en America/Bogota se mostraría como el día anterior.
 */
const formatter = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function formatPostDate(date: string): string {
  return formatter.format(new Date(`${date}T00:00:00Z`));
}
