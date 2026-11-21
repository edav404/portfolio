/**
 * Filtros de la galería «Mi trabajo» (docs/arquitectura-os.md §6). Puro: sin React ni copy.
 * El servidor entrega la lista ya proyectada; aquí solo se filtra y se cuenta.
 */
import type { Ownership, ProjectKind } from "@/content/projects";

export type KindFilter = ProjectKind | "all";
export type OwnershipFilter = Ownership | "all";
export type GalleryFilters = { readonly kind: KindFilter; readonly ownership: OwnershipFilter };
export type Filterable = { readonly kind: ProjectKind; readonly ownership: Ownership };

export const NO_FILTERS: GalleryFilters = Object.freeze({ kind: "all", ownership: "all" });
export const KIND_FILTERS = ["client", "personal", "automation"] as const satisfies readonly ProjectKind[];
export const OWNERSHIP_FILTERS = ["own", "co-created", "collaboration", "client"] as const satisfies readonly Ownership[];

export function hasFilters(filters: GalleryFilters): boolean {
  return filters.kind !== "all" || filters.ownership !== "all";
}

/** Proyectos que cumplen ambos filtros (conserva el orden de entrada; devuelve una copia). */
export function filterProjects<T extends Filterable>(list: readonly T[], filters: GalleryFilters): T[] {
  return list.filter((item) => (filters.kind === "all" || item.kind === filters.kind) && (filters.ownership === "all" || item.ownership === filters.ownership));
}

export type FilterCounts = {
  kind: Record<KindFilter, number>;
  ownership: Record<OwnershipFilter, number>;
};

/**
 * Recuentos por opción. Cada grupo cuenta lo que daría elegir esa opción manteniendo el OTRO filtro
 * (así ninguna opción promete resultados que no habrá). `all` cuenta el grupo sin su propio filtro.
 */
export function countFilters<T extends Filterable>(list: readonly T[], filters: GalleryFilters): FilterCounts {
  const byOwnership = filterProjects(list, { kind: "all", ownership: filters.ownership });
  const byKind = filterProjects(list, { kind: filters.kind, ownership: "all" });
  const kind = { all: byOwnership.length } as Record<KindFilter, number>;
  for (const id of KIND_FILTERS) kind[id] = byOwnership.filter((item) => item.kind === id).length;
  const ownership = { all: byKind.length } as Record<OwnershipFilter, number>;
  for (const id of OWNERSHIP_FILTERS) ownership[id] = byKind.filter((item) => item.ownership === id).length;
  return { kind, ownership };
}
