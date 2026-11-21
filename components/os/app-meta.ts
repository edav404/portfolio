import type { AppId, WindowId } from "@/lib/os/window-reducer";
import { slugOf } from "@/lib/os/window-reducer";
import type { XpIconName } from "./icons";

/** Icono de cada app (por ahora el único dueño; el registro de apps de O7 lo absorbe). */
export const APP_ICON: Record<AppId, XpIconName> = {
  welcome: "welcome",
  projects: "projects",
  services: "services",
  about: "about",
  contact: "contact",
  media: "media",
  terminal: "terminal",
  settings: "properties",
};

/** Orden de los iconos del escritorio. */
export const DESKTOP_APPS: readonly AppId[] = ["welcome", "projects", "about", "services", "contact", "media", "terminal", "settings"];
/** Apps fijadas en la columna izquierda del menú Inicio. */
export const START_PINNED: readonly AppId[] = ["projects", "about", "services", "contact"];
/** Apps de la columna derecha del menú Inicio (además del CV). */
export const START_SYSTEM: readonly AppId[] = ["terminal", "settings"];

export function iconFor(id: WindowId): XpIconName {
  return slugOf(id) === null ? APP_ICON[id as AppId] : "projects";
}

/** Icono del escritorio que devuelve el foco al cerrar la ventana `id`. */
export function iconKeyFor(id: WindowId): AppId {
  return slugOf(id) === null ? (id as AppId) : "projects";
}
