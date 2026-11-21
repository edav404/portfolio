import { projects } from "./projects";
import type { L, Locale } from "./types";

/**
 * Cifras del perfil derivadas de `content/` (decisión 10 · COD-02 · CNT-02).
 *
 * Vive aparte de `profile.ts` a propósito: importa `projects.ts` (texto largo) y por eso
 * solo deben usarlo componentes de servidor. Los componentes cliente que necesitan el
 * perfil (`music-widget`, `terminal-app`) importan `profile.ts`, que no arrastra proyectos.
 */

const clientProjects = projects.filter((project) => project.kind === "client");

/** País = último tramo de la ubicación ("Medellín, Colombia" → "Colombia"), sin repetir y en orden de aparición. */
function countries(locale: Locale): string[] {
  return [...new Set(clientProjects.map((project) => project.location[locale].split(",").at(-1)!.trim()))];
}

function countryList(locale: Locale): string {
  return new Intl.ListFormat(locale, { type: "conjunction" }).format(countries(locale));
}

/** Productos propios hechos con otras personas (cocreados o colaboraciones). */
const teamProducts = projects.filter(
  (project) => project.kind === "personal" && (project.ownership === "co-created" || project.ownership === "collaboration"),
);

// Los años de experiencia no van aquí: la UI dice "desde {experienceSince}" (decisión 5).
export type Stat = { id: string; value: string; label: L };

export const stats: Stat[] = [
  {
    id: "client-projects",
    value: String(clientProjects.length),
    label: { es: "Proyectos web para clientes", en: "Client web projects" },
  },
  {
    id: "countries",
    value: String(countries("es").length),
    label: { es: `Países: ${countryList("es")}`, en: `Countries: ${countryList("en")}` },
  },
  {
    id: "team-products",
    value: String(teamProducts.length),
    label: { es: "Productos en equipo", en: "Team products" },
  },
];
