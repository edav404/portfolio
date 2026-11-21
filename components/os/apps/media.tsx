"use client";

/* eslint-disable @next/next/no-img-element -- Last.fm devuelve dominios de portada variables. */

import { useEffect, useRef, useState } from "react";
import { format } from "@/content/format";
import { profile } from "@/content/profile";
import { useOsStatic } from "../os-context";
import { useWindowHidden } from "./window-visibility";
import styles from "./media.module.css";

type Track = { name: string; artist: string; album?: string; image?: string; url: string; nowPlaying: boolean };
type State = "loading" | "ready" | "error";

/** Cada cuánto se consulta Last.fm con la ventana visible (la API cachea 30 s). */
const POLL_MS = 30_000;
const BARS = Array.from({ length: 24 }, (_, index) => 18 + ((index * 17) % 68));

/**
 * Reproductor de Last.fm. Contrato de suspensión (docs/arquitectura-os.md §3): mientras la ventana está
 * minimizada (o la pestaña en segundo plano) no hay temporizador ni petición en curso: al ocultarse se
 * cancela la petición pendiente y se detiene el sondeo; al mostrarse se consulta de inmediato y se
 * reanuda. No reproduce audio (los datos son «lo que estoy escuchando»).
 */
export default function Media() {
  const { copy } = useOsStatic();
  const t = copy.music;
  const root = useRef<HTMLElement>(null);
  const hidden = useWindowHidden(root);
  const [track, setTrack] = useState<Track | null>(null);
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (hidden) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const load = () => {
      fetch("/api/lastfm/", { headers: { Accept: "application/json" }, signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error(`Last.fm ${response.status}`);
          return response.json() as Promise<Track>;
        })
        .then((data) => { setTrack(data); setState("ready"); })
        .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setState("error"); })
        .finally(() => { if (!controller.signal.aborted) timer = setTimeout(load, POLL_MS); });
    };
    load();
    return () => { controller.abort(); if (timer !== undefined) clearTimeout(timer); };
  }, [hidden]);

  const isLoading = state === "loading";
  const isError = state === "error" || !track;
  const user = profile.contact.lastfm;
  const profileUrl = `https://www.last.fm/user/${user}`;
  const trackUrl = track?.url ?? profileUrl;

  return (
    <section ref={root} className={styles.player} data-loading={isLoading} data-error={isError} data-paused={hidden} aria-label={t.region}>
      <div className={styles.titlebar}><strong>{t.titlebar}</strong><span>{t.quality}</span></div>
      <div className={styles.screen}>
        <a className={styles.cover} href={trackUrl} target="_blank" rel="noopener noreferrer" aria-label={t.coverLink}>
          {track?.image ? <img src={track.image} alt={format(t.coverAlt, { track: track.name })} width={96} height={96}/> : <span aria-hidden="true">♪</span>}
        </a>
        <div className={styles.info} aria-live="polite">
          <span className={styles.badge}>{isLoading ? t.loadingStatus : track?.nowPlaying ? t.nowPlaying : isError ? t.offline : t.lastPlayed}</span>
          <strong className={styles.track}>{isLoading ? t.loadingTitle : track?.name ?? t.waitingTitle}</strong>
          <p className={styles.artist}>{isLoading ? format(t.loadingDetail, { user }) : track ? `${track.artist}${track.album ? ` · ${track.album}` : ""}` : t.unavailable}</p>
          <div className={styles.spectrum} aria-hidden="true">{BARS.map((height, index) => <i key={index} style={{ height: `${height}%`, animationDelay: `${index * 40}ms` }}/>)}</div>
        </div>
      </div>
      <div className={styles.footer}>
        <span>{isError ? t.noResponse : t.poweredBy}</span>
        <a href={profileUrl} target="_blank" rel="noopener noreferrer">{t.openLastfm}</a>
      </div>
    </section>
  );
}
