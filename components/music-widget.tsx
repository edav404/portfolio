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
    const endpoint = process.env.NEXT_PUBLIC_LASTFM_ENDPOINT || "/api/lastfm.php";
    fetch(endpoint, { headers: { Accept: "application/json" } })
      .then((response) => {
        if (!response.ok) throw new Error("Last.fm no disponible");
        return response.json();
      })
      .then((data: Track) => { setTrack(data); setState("ready"); })
      .catch(() => setState("error"));
  }, []);

  if (state === "loading") return <div className="music-card" aria-live="polite"><div className="skeleton album-skeleton"/><div className="music-copy"><span className="skeleton line"/><span className="skeleton line short"/></div></div>;

  if (state === "error" || !track) return (
    <div className="music-card music-fallback">
      <span className="music-icon"><Icon name="music" /></span>
      <div><strong>La estación está iniciando…</strong><p>Conecta la API al publicar para mostrar la escucha en vivo.</p><a href={`https://www.last.fm/user/${site.lastfm}`} target="_blank" rel="noreferrer">Abrir perfil de Last.fm</a></div>
    </div>
  );

  return (
    <a className="music-card" href={track.url} target="_blank" rel="noreferrer">
      {track.image ? <img src={track.image} alt={`Portada de ${track.name}`} width="96" height="96" /> : <span className="music-icon"><Icon name="music" /></span>}
      <div className="music-copy"><span className="live-dot">{track.nowPlaying ? "Escuchando ahora" : "Última reproducción"}</span><strong>{track.name}</strong><p>{track.artist}{track.album ? ` · ${track.album}` : ""}</p><small>Powered by Last.fm</small></div>
    </a>
  );
}
