import "server-only";
import { LASTFM_IMAGE_HOSTS, LASTFM_LINK_HOSTS } from "@/lib/server/lastfm-hosts";

export type LastfmTrack = {
  name: string;
  artist: string;
  album: string;
  image: string;
  url: string;
  nowPlaying: boolean;
};

export type LastfmResult =
  | { ok: true; track: LastfmTrack }
  | { ok: false; status: 404 | 502 | 503; message: string };

const CACHE_TTL_MS = 30_000;
let cache: { value: LastfmResult; expiresAt: number } | null = null;
let inflight: Promise<LastfmResult> | null = null;

type RawTrack = {
  name?: string;
  url?: string;
  artist?: { "#text"?: string };
  album?: { "#text"?: string };
  image?: { "#text"?: string }[];
  "@attr"?: { nowplaying?: string };
};

/** Devuelve la URL normalizada si es https y su host está en la lista; si no, `null`. */
function safeUrl(value: string | undefined, hosts: readonly string[]): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && hosts.includes(url.hostname.toLowerCase()) ? url.href : null;
  } catch {
    return null;
  }
}

async function fetchRecentTrack(): Promise<LastfmResult> {
  const apiKey = process.env.LASTFM_API_KEY;
  const username = process.env.LASTFM_USERNAME || "edav404";
  if (!apiKey) return { ok: false, status: 503, message: "La integración con Last.fm aún no está configurada." };

  const url = new URL("https://ws.audioscrobbler.com/2.0/");
  url.search = new URLSearchParams({ method: "user.getrecenttracks", user: username, api_key: apiKey, format: "json", limit: "1" }).toString();

  try {
    const upstream = await fetch(url, { headers: { "User-Agent": "EDAV-OS/1.0" }, signal: AbortSignal.timeout(5000), cache: "no-store" });
    if (!upstream.ok) throw new Error(`Last.fm ${upstream.status}`);
    const payload = (await upstream.json()) as { recenttracks?: { track?: RawTrack[] } };
    const track = payload.recenttracks?.track?.[0];
    if (!track) return { ok: false, status: 404, message: "No hay reproducciones recientes." };
    const image = track.image?.at(-1)?.["#text"] ?? "";
    return {
      ok: true,
      track: {
        name: track.name ?? "",
        artist: track.artist?.["#text"] ?? "",
        album: track.album?.["#text"] ?? "",
        // Solo portadas https de los hosts permitidos en la CSP (img-src); otras se descartan aquí
        // para no mostrar una imagen rota ni servir contenido mixto.
        image: safeUrl(image, LASTFM_IMAGE_HOSTS) ?? "",
        url: safeUrl(track.url, LASTFM_LINK_HOSTS) ?? `https://www.last.fm/user/${encodeURIComponent(username)}`,
        nowPlaying: track["@attr"]?.nowplaying === "true",
      },
    };
  } catch {
    return { ok: false, status: 502, message: "No fue posible consultar Last.fm." };
  }
}

/** Devuelve la última canción con caché en memoria y deduplicación de peticiones concurrentes. */
export async function getRecentTrack(): Promise<LastfmResult> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;
  inflight ??= fetchRecentTrack().finally(() => { inflight = null; });
  const value = await inflight;
  cache = { value, expiresAt: Date.now() + (value.ok ? CACHE_TTL_MS : CACHE_TTL_MS / 3) };
  return value;
}
