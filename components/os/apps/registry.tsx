"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { AppId } from "@/lib/os/window-reducer";
import { APP_ICON } from "../app-meta";
import type { XpIconName } from "../icons";
import { useOsStatic } from "../os-context";
import styles from "./apps.module.css";

export type DeferredAppId = Exclude<AppId, "welcome">;

/**
 * Contrato de cada app diferida (docs/arquitectura-os.md §3 y §4):
 * - `icon`: icono Luna (única fuente: `APP_ICON`).
 * - `initialFocus`: `"content"` deja el foco en la raíz del contenido (el siguiente Tab entra a la app);
 *   `"control"` lo mueve a su campo principal al montar (terminal, formulario). Lo aplica la propia app
 *   con `useInitialControlFocus`, solo si el foco sigue en el contenido de su ventana.
 * - `suspend`: `"pause"` si la app tiene efectos continuos (sondeo, temporizadores, audio): debe pararlos
 *   mientras su ventana está minimizada (o fuera de pantalla) y reanudarlos al volver, con
 *   `useWindowHidden()` (apps/window-visibility.ts). `"none"` si no hace nada fuera de la interacción.
 */
export type AppDefinition = {
  id: DeferredAppId;
  icon: XpIconName;
  initialFocus: "content" | "control";
  suspend: "none" | "pause";
};

export const APP_DEFINITIONS: Record<DeferredAppId, AppDefinition> = {
  projects: { id: "projects", icon: APP_ICON.projects, initialFocus: "content", suspend: "none" },
  about: { id: "about", icon: APP_ICON.about, initialFocus: "content", suspend: "none" },
  services: { id: "services", icon: APP_ICON.services, initialFocus: "content", suspend: "none" },
  contact: { id: "contact", icon: APP_ICON.contact, initialFocus: "control", suspend: "none" },
  media: { id: "media", icon: APP_ICON.media, initialFocus: "content", suspend: "pause" },
  terminal: { id: "terminal", icon: APP_ICON.terminal, initialFocus: "control", suspend: "none" },
  settings: { id: "settings", icon: APP_ICON.settings, initialFocus: "content", suspend: "none" },
};

function AppLoading() {
  const { copy } = useOsStatic();
  return <p className={styles.page} role="status">{copy.window.loading}</p>;
}

type AppComponent = ComponentType<{ id: AppId }>;

/**
 * Cada app (salvo Welcome y las ventanas de proyecto, que viajan en el HTML) es un componente
 * diferido: su código solo se pide al abrir la ventana (un chunk por app).
 */
export const DEFERRED_APPS: Record<DeferredAppId, AppComponent> = {
  projects: dynamic(() => import("./projects-gallery"), { loading: AppLoading }),
  about: dynamic(() => import("./about"), { loading: AppLoading }),
  services: dynamic(() => import("./services"), { loading: AppLoading }),
  contact: dynamic(() => import("./contact"), { loading: AppLoading }),
  media: dynamic(() => import("./media"), { loading: AppLoading }),
  terminal: dynamic(() => import("./terminal"), { loading: AppLoading }),
  settings: dynamic(() => import("./settings"), { loading: AppLoading }),
};

/**
 * Precarga el chunk de una app (por intención: `onPointerEnter`/`onFocus` del icono). Cada loader es
 * el mismo `import()` que usa `dynamic`, así que el bundler comparte el chunk.
 */
const PRELOADERS: Record<DeferredAppId, () => Promise<unknown>> = {
  projects: () => import("./projects-gallery"),
  about: () => import("./about"),
  services: () => import("./services"),
  contact: () => import("./contact"),
  media: () => import("./media"),
  terminal: () => import("./terminal"),
  settings: () => import("./settings"),
};

export function preloadApp(id: AppId): void {
  if (id !== "welcome") void PRELOADERS[id]();
}
