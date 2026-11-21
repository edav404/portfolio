"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { AppId } from "@/lib/os/window-reducer";
import { useOsStatic } from "../os-context";
import styles from "./apps.module.css";

function AppLoading() {
  const { copy } = useOsStatic();
  return <p className={styles.page} role="status">{copy.window.loading}</p>;
}

/**
 * Cada app (salvo Welcome y las ventanas de proyecto, que viajan en el HTML) es un componente
 * diferido: su código solo se pide al abrir la ventana. En O7 cada entrada apunta a su módulo real;
 * hoy todas comparten el marcador (un único chunk).
 */
const deferred = (): ComponentType<{ id: AppId }> => dynamic(() => import("./placeholder"), { loading: AppLoading });

export const DEFERRED_APPS: Record<Exclude<AppId, "welcome">, ComponentType<{ id: AppId }>> = {
  projects: deferred(),
  services: deferred(),
  about: deferred(),
  contact: deferred(),
  media: deferred(),
  terminal: deferred(),
  settings: deferred(),
};
