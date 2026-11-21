"use client";

/**
 * Servicio preseleccionado de Contacto. Lo escribe Servicios (CTA «Pedir este servicio») justo antes
 * de abrir la ventana; Contacto lo lee al montar y cuando cambia (`nonce` distingue peticiones
 * repetidas del mismo servicio). Vive fuera de React porque Contacto puede estar cargándose o minimizada.
 */
export type ContactPrefill = { service: string; nonce: number } | null;

let current: ContactPrefill = null;
const listeners = new Set<() => void>();

export function setContactPrefill(service: string): void {
  current = { service, nonce: (current?.nonce ?? 0) + 1 };
  for (const listener of [...listeners]) listener();
}

export function subscribeContactPrefill(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export const getContactPrefill = (): ContactPrefill => current;
export const getServerContactPrefill = (): ContactPrefill => null;
