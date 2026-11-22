"use client";

/**
 * Servicio preseleccionado de Contacto. Lo escribe Servicios (CTA «Pedir este servicio») justo antes de
 * abrir la ventana; Contacto lo CONSUME una vez (al montar, o al instante si ya está montada, también
 * minimizada). Al consumirlo desaparece: cerrar y descartar la ventana no deja un servicio pendiente que
 * se aplique a una apertura posterior desde el escritorio. Vive fuera de React porque Contacto puede estar
 * cargándose cuando se escribe.
 */
export type ContactPrefill = { service: string } | null;

let pending: ContactPrefill = null;
const listeners = new Set<() => void>();

export function setContactPrefill(service: string): void {
  pending = { service };
  for (const listener of [...listeners]) listener();
}

/** Devuelve el servicio pendiente y lo borra (consumo único). */
export function takeContactPrefill(): ContactPrefill {
  const found = pending;
  pending = null;
  return found;
}

export function subscribeContactPrefill(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
