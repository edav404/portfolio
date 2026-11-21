/**
 * Plantillas de microcopy (`"Paso {n} de {total}"`). Módulo aparte y sin dependencias para que lo
 * usen también los componentes cliente, que no pueden importar `content/ui.ts` (§4.3).
 */

/** Rellena marcadores `{nombre}`. Un marcador sin valor se deja tal cual (se ve en la revisión). */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}

/**
 * Un cargo dentro de una frase: en español va en minúscula ("Soy Ana, desarrolladora…"); en inglés
 * se conserva tal cual ("I'm Ana, Full-Stack Developer").
 */
export function roleInSentence(role: string, locale: "es" | "en"): string {
  return locale === "es" ? role.charAt(0).toLowerCase() + role.slice(1) : role;
}
