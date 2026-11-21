import { describe, expect, it } from "vitest";
import { osProjects, projectKinds } from "@/content/projects";
import { projectOwnershipLabels } from "@/content/project-labels";
import { countFilters, filterProjects, hasFilters, KIND_FILTERS, NO_FILTERS, OWNERSHIP_FILTERS } from "@/lib/os/gallery";

const list = [
  { slug: "a", kind: "client", ownership: "client" },
  { slug: "b", kind: "client", ownership: "client" },
  { slug: "c", kind: "personal", ownership: "own" },
  { slug: "d", kind: "personal", ownership: "co-created" },
  { slug: "e", kind: "automation", ownership: "own" },
] as const;

describe("filterProjects", () => {
  it("sin filtros devuelve todo, en orden y como copia", () => {
    const result = filterProjects(list, NO_FILTERS);
    expect(result.map((p) => p.slug)).toEqual(["a", "b", "c", "d", "e"]);
    expect(result).not.toBe(list);
  });

  it("filtra por tipo, por autoría y por ambos a la vez", () => {
    expect(filterProjects(list, { kind: "client", ownership: "all" }).map((p) => p.slug)).toEqual(["a", "b"]);
    expect(filterProjects(list, { kind: "all", ownership: "own" }).map((p) => p.slug)).toEqual(["c", "e"]);
    expect(filterProjects(list, { kind: "personal", ownership: "own" }).map((p) => p.slug)).toEqual(["c"]);
    expect(filterProjects(list, { kind: "automation", ownership: "client" })).toEqual([]);
  });

  it("hasFilters distingue el estado inicial", () => {
    expect(hasFilters(NO_FILTERS)).toBe(false);
    expect(hasFilters({ kind: "client", ownership: "all" })).toBe(true);
    expect(hasFilters({ kind: "all", ownership: "own" })).toBe(true);
  });
});

describe("countFilters", () => {
  it("sin filtros cuenta cada opción sobre el total", () => {
    const counts = countFilters(list, NO_FILTERS);
    expect(counts.kind).toEqual({ all: 5, client: 2, personal: 2, automation: 1 });
    expect(counts.ownership).toEqual({ all: 5, own: 2, "co-created": 1, collaboration: 0, client: 2 });
  });

  it("cada grupo respeta el OTRO filtro y nunca el suyo", () => {
    const counts = countFilters(list, { kind: "personal", ownership: "own" });
    // tipo: con autoría «own» → cliente 0, personal 1, automatización 1
    expect(counts.kind).toEqual({ all: 2, client: 0, personal: 1, automation: 1 });
    // autoría: con tipo «personal» → own 1, co-created 1
    expect(counts.ownership).toEqual({ all: 2, own: 1, "co-created": 1, collaboration: 0, client: 0 });
  });

  it("elegir una opción da exactamente el recuento que mostraba", () => {
    const base = { kind: "all", ownership: "client" } as const;
    const counts = countFilters(list, base);
    for (const kind of KIND_FILTERS) expect(filterProjects(list, { ...base, kind }).length).toBe(counts.kind[kind]);
    for (const ownership of OWNERSHIP_FILTERS) expect(filterProjects(list, { kind: "all", ownership }).length).toBe(countFilters(list, { kind: "all", ownership: "client" }).ownership[ownership]);
  });
});

describe("catálogo real", () => {
  it("los filtros cubren todos los tipos y autorías del contenido", () => {
    expect([...KIND_FILTERS].sort()).toEqual(projectKinds.map((kind) => kind.id).sort());
    expect([...OWNERSHIP_FILTERS].sort()).toEqual(Object.keys(projectOwnershipLabels).sort());
  });

  it("los recuentos de «todos» suman los proyectos del catálogo del SO", () => {
    const projects = osProjects();
    const counts = countFilters(projects, NO_FILTERS);
    expect(counts.kind.all).toBe(projects.length);
    expect(KIND_FILTERS.reduce((sum, id) => sum + counts.kind[id], 0)).toBe(projects.length);
    expect(OWNERSHIP_FILTERS.reduce((sum, id) => sum + counts.ownership[id], 0)).toBe(projects.length);
  });
});
