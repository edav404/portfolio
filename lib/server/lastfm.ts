import "server-only";

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
        // Solo aceptamos portadas https para no romper la CSP ni servir contenido mixto.
        image: image.startsWith("https://") ? image : "",
        url: track.url?.startsWith("https://") ? track.url : `https://www.last.fm/user/${encodeURIComponent(username)}`,
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
