"use client";

import Image from "next/image";
import { memo, useMemo, useState } from "react";
import { format } from "@/content/format";
import { countFilters, filterProjects, KIND_FILTERS, NO_FILTERS, OWNERSHIP_FILTERS, type GalleryFilters } from "@/lib/os/gallery";
import { projectWindowId } from "@/lib/os/window-reducer";
import { useOsActions, useOsStatic } from "../os-context";
import type { OsProjectIndexItem } from "../types";
import { CreditBadge } from "./credit-badge";
import styles from "./gallery.module.css";

type CardProps = {
  project: OsProjectIndexItem;
  selected: boolean;
  onSelect: (slug: string) => void;
  onOpen: (slug: string) => void;
};

const ProjectCard = memo(function ProjectCard({ project, selected, onSelect, onOpen }: CardProps) {
  const { copy } = useOsStatic();
  return (
    <li className={styles.card} data-selected={selected}>
      <button
        type="button"
        className={styles.pick}
        data-slug={project.slug}
        aria-pressed={selected}
        aria-label={format(copy.gallery.select, { title: project.title })}
        onClick={() => onSelect(project.slug)}
        onDoubleClick={() => onOpen(project.slug)}
        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onOpen(project.slug); } }}
      >
        {project.image ? (
          <Image className={styles.thumb} src={project.image} alt="" width={240} height={150} sizes="160px" loading="lazy"/>
        ) : <span className={styles.nothumb} aria-hidden="true">{copy.gallery.noCover}</span>}
        <span className={styles.name}>{project.title}</span>
        <span className={styles.sub}>{project.category} · {project.year}</span>
      </button>
      <CreditBadge ownership={project.ownership} credits={project.credits} copy={copy.project}/>
    </li>
  );
});

/**
 * Galería «Mi trabajo» (docs/arquitectura-os.md §6): panel de filtros con recuentos (tipo y autoría),
 * cuadrícula del catálogo autorizado y barra de estado con el detalle del seleccionado. Un clic
 * selecciona; Intro, doble clic o «Abrir» abren la ventana del proyecto. El filtro es local (sin URL).
 */
export default function ProjectsGallery() {
  const { copy, projects } = useOsStatic();
  const actions = useOsActions();
  const [filters, setFilters] = useState<GalleryFilters>(NO_FILTERS);
  const [selected, setSelected] = useState<string | null>(null);
  const visible = useMemo(() => filterProjects(projects, filters), [projects, filters]);
  const counts = useMemo(() => countFilters(projects, filters), [projects, filters]);
  const current = selected === null ? null : visible.find((project) => project.slug === selected) ?? null;
  const g = copy.gallery;

  const open = (slug: string) => actions.open(projectWindowId(slug));
  const countText = format(visible.length === 1 ? g.resultsOne : g.results, { count: visible.length });
  const detail = current
    ? `${current.title}. ${format(g.selectedDetail, { category: current.category, year: current.year, status: current.status })}`
    : g.nothingSelected;

  return (
    <div className={styles.root}>
      <div className={styles.body}>
        <div className={styles.tasks} role="group" aria-label={g.filtersLabel}>
          <fieldset className={styles.group}>
            <legend>{g.kindGroup}</legend>
            {(["all", ...KIND_FILTERS] as const).map((id) => (
              <button
                key={id}
                type="button"
                className={styles.filter}
                aria-pressed={filters.kind === id}
                aria-label={format(g.filterCount, { label: id === "all" ? g.all : g.kinds[id], count: counts.kind[id] })}
                onClick={() => setFilters((before) => ({ ...before, kind: id }))}
              >
                <span aria-hidden="true">{id === "all" ? g.all : g.kinds[id]}</span>
                <span className={styles.count} aria-hidden="true">{counts.kind[id]}</span>
              </button>
            ))}
          </fieldset>
          <fieldset className={styles.group}>
            <legend>{g.ownershipGroup}</legend>
            {(["all", ...OWNERSHIP_FILTERS] as const).map((id) => (
              <button
                key={id}
                type="button"
                className={styles.filter}
                aria-pressed={filters.ownership === id}
                aria-label={format(g.filterCount, { label: id === "all" ? g.all : g.ownership[id], count: counts.ownership[id] })}
                onClick={() => setFilters((before) => ({ ...before, ownership: id }))}
              >
                <span aria-hidden="true">{id === "all" ? g.all : g.ownership[id]}</span>
                <span className={styles.count} aria-hidden="true">{counts.ownership[id]}</span>
              </button>
            ))}
          </fieldset>
        </div>
        <div className={styles.results}>
          {visible.length > 0 ? (
            <ul className={styles.grid} aria-label={g.list}>
              {visible.map((project) => (
                <ProjectCard key={project.slug} project={project} selected={project.slug === selected} onSelect={setSelected} onOpen={open}/>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>
              {g.noResults}
              <button type="button" className="xp-button" onClick={() => setFilters(NO_FILTERS)}>{g.clearFilters}</button>
            </p>
          )}
        </div>
      </div>
      <div className={styles.status}>
        <p>{format(g.status, { count: visible.length, selected: detail })}</p>
        <button type="button" className="xp-button" data-gallery-open disabled={current === null} onClick={() => current && open(current.slug)} aria-label={current ? format(g.openProject, { title: current.title }) : g.open}>{g.open}</button>
      </div>
      <p className="xp-visually-hidden" role="status">{countText}</p>
    </div>
  );
}
