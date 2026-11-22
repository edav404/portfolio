"use client";

/* eslint-disable @next/next/no-img-element -- Last.fm devuelve dominios de portada variables. */

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
// Solo `content/profile.ts` (pequeño): nada de proyectos, servicios ni testimonios en el bundle cliente.
import { profile } from "@/content/profile";

type Track = { name: string; artist: string; album?: string; image?: string; url: string; nowPlaying: boolean };

/** Textos ya resueltos por el servidor (`uiFor(locale, "music")`). */
export type MusicCopy = {
  region: string; coverLink: string; coverAlt: string; titlebar: string; quality: string;
  loadingStatus: string; nowPlaying: string; offline: string; lastPlayed: string;
  loadingTitle: string; waitingTitle: string; loadingDetail: string; unavailable: string;
  noResponse: string; notConfigured: string; poweredBy: string; openLastfm: string; volume: string;
};

export function MusicWidget({ copy }: { copy: MusicCopy }) {
  const [track, setTrack] = useState<Track | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const endpoint = "/api/lastfm/";
    fetch(endpoint, { headers: { Accept: "application/json" } })
      .then((response) => {
        if (!response.ok) throw new Error(`Last.fm ${response.status}`);
        return response.json();
      })
      .then((data: Track) => { setTrack(data); setState("ready"); })
      .catch(() => setState("error"));
  }, []);

  const isLoading = state === "loading";
  const isError = state === "error" || !track;
  const trackUrl = track?.url ?? `https://www.last.fm/user/${profile.contact.lastfm}`;

  return <section className={`music-player ${isLoading ? "is-loading" : ""} ${isError ? "is-error" : ""}`} aria-label={copy.region}>
    <div className="music-player-titlebar"><strong><i aria-hidden="true"/> {copy.titlebar}</strong><span>{copy.quality}</span></div>
    <div className="music-player-screen" aria-live="polite">
      <a className="music-player-cover" href={trackUrl} target="_blank" rel="noreferrer" aria-label={copy.coverLink}>
        {track?.image ? <img src={track.image} alt={copy.coverAlt.replace("{track}", track.name)} width="96" height="96" /> : <span><Icon name="music"/></span>}
      </a>
      <div className="music-player-info">
        <span className="music-player-status">{isLoading ? copy.loadingStatus : track?.nowPlaying ? copy.nowPlaying : isError ? copy.offline : copy.lastPlayed}</span>
        <strong>{isLoading ? copy.loadingTitle : track?.name ?? copy.waitingTitle}</strong>
        <p>{isLoading ? copy.loadingDetail.replace("{user}", profile.contact.lastfm) : track ? `${track.artist}${track.album ? ` · ${track.album}` : ""}` : copy.unavailable}</p>
        <div className="music-player-spectrum" aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <i key={index} style={{ height: `${18 + ((index * 17) % 68)}%` }}/>)}</div>
        <div className="music-player-progress" aria-hidden="true"><span/></div>
      </div>
    </div>
    <div className="music-player-controls" aria-hidden="true"><span>◀◀</span><b>▶</b><span>▶▶</span><em>{copy.volume}</em><i/></div>
    <div className="music-player-footer"><span>{isError ? copy.noResponse : copy.poweredBy}</span><a href={`https://www.last.fm/user/${profile.contact.lastfm}`} target="_blank" rel="noreferrer">{copy.openLastfm}</a></div>
  </section>;
}
