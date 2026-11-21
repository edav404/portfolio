/**
 * Fuente única de contenido del portafolio (ES principal, EN secundario).
 * Todo texto visible se escribe como `L<string>` para que ambas versiones
 * (/os y /classic) y ambos idiomas lean exactamente lo mismo.
 */
export const locales = ["es", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "es";

/** Texto localizado. */
export type L<T = string> = Record<Locale, T>;

/** Fecha en formato "YYYY-MM" o "YYYY". */
export type YearMonth = `${number}-${string}` | `${number}`;

export function t<T>(value: L<T>, locale: Locale): T {
  return value[locale];
}
