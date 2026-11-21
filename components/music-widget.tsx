"use client";

/* eslint-disable @next/next/no-img-element -- Last.fm devuelve dominios de portada variables. */

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { site } from "@/data/site";

type Track = { name: string; artist: string; album?: string; image?: string; url: string; nowPlaying: boolean };

export function MusicWidget() {
  const [track, setTrack] = useState<Track | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const endpoint = "/api/lastfm/";
    fetch(endpoint, { headers: { Accept: "application/json" } })
      .then((response) => {
        if (!response.ok) throw new Error("Last.fm no disponible");
        return response.json();
      })
      .then((data: Track) => { setTrack(data); setState("ready"); })
      .catch(() => setState("error"));
  }, []);

  const isLoading = state === "loading";
  const isError = state === "error" || !track;
  const trackUrl = track?.url ?? `https://www.last.fm/user/${site.lastfm}`;

  return <section className={`music-player ${isLoading ? "is-loading" : ""} ${isError ? "is-error" : ""}`} aria-label="Reproductor de música Last.fm">
    <div className="music-player-titlebar"><strong><i aria-hidden="true"/> EDAV.FM // WINAMP</strong><span>STEREO · 192 KBPS</span></div>
    <div className="music-player-screen" aria-live="polite">
      <a className="music-player-cover" href={trackUrl} target="_blank" rel="noreferrer" aria-label="Abrir perfil o canción en Last.fm">
        {track?.image ? <img src={track.image} alt={`Portada de ${track.name}`} width="96" height="96" /> : <span><Icon name="music"/></span>}
      </a>
      <div className="music-player-info">
        <span className="music-player-status">{isLoading ? "CARGANDO LASTFM.DRV" : track?.nowPlaying ? "● ESCUCHANDO AHORA" : isError ? "○ MODO OFFLINE" : "○ ÚLTIMA REPRODUCCIÓN"}</span>
        <strong>{isLoading ? "Buscando tu soundtrack…" : track?.name ?? "Last.fm espera conexión"}</strong>
        <p>{isLoading ? "Consultando a edav404" : track ? `${track.artist}${track.album ? ` · ${track.album}` : ""}` : "Last.fm no está disponible en este momento."}</p>
        <div className="music-player-spectrum" aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <i key={index} style={{ height: `${18 + ((index * 17) % 68)}%` }}/>)}</div>
        <div className="music-player-progress" aria-hidden="true"><span/></div>
      </div>
    </div>
    <div className="music-player-controls" aria-hidden="true"><span>◀◀</span><b>▶</b><span>▶▶</span><em>VOL</em><i/></div>
    <div className="music-player-footer"><span>{isError ? "LAST.FM SIN RESPUESTA" : "Powered by Last.fm"}</span><a href={`https://www.last.fm/user/${site.lastfm}`} target="_blank" rel="noreferrer">ABRIR LAST.FM ↗</a></div>
  </section>;
}
