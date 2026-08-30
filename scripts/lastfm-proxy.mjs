import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const port = Number(process.env.LASTFM_PROXY_PORT || 8787);
const allowedOrigins = new Set(["http://127.0.0.1:3000", "http://localhost:3000"]);

function readEnvFile() {
  const values = {};
  for (const file of [".env", ".env.local"]) {
    try {
      const content = readFileSync(resolve(process.cwd(), file), "utf8");
      for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
        if (match && !match[1].startsWith("NEXT_PUBLIC_")) values[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
      }
    } catch {
      // Optional env files are expected to be absent in clean checkouts.
    }
  }
  return values;
}

function sendJson(response, status, body, origin) {
  if (allowedOrigins.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }
  response.writeHead(status, {
    "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  const origin = request.headers.origin || "";
  if (request.method === "OPTIONS") {
    response.writeHead(204, { "Access-Control-Allow-Headers": "Accept", "Access-Control-Allow-Methods": "GET, OPTIONS" });
    response.end();
    return;
  }
  if (request.method !== "GET" || new URL(request.url || "/", `http://${request.headers.host}`).pathname !== "/api/lastfm.php") {
    sendJson(response, 404, { message: "Ruta no encontrada." }, origin);
    return;
  }

  const env = { ...readEnvFile(), ...process.env };
  if (!env.LASTFM_API_KEY) {
    sendJson(response, 503, { message: "La integración con Last.fm aún no está configurada." }, origin);
    return;
  }

  const username = env.LASTFM_USERNAME || "edav404";
  const url = new URL("https://ws.audioscrobbler.com/2.0/");
  url.search = new URLSearchParams({ method: "user.getrecenttracks", user: username, api_key: env.LASTFM_API_KEY, format: "json", limit: "1" });
  try {
    const upstream = await fetch(url, { headers: { "User-Agent": "EDAV-OS/1.0" }, signal: AbortSignal.timeout(5000) });
    if (!upstream.ok) throw new Error("Last.fm upstream error");
    const payload = await upstream.json();
    const track = payload?.recenttracks?.track?.[0];
    if (!track) {
      sendJson(response, 404, { message: "No hay reproducciones recientes." }, origin);
      return;
    }
    const images = track.image || [];
    const image = images.at(-1);
    sendJson(response, 200, {
      name: track.name || "",
      artist: track.artist?.["#text"] || "",
      album: track.album?.["#text"] || "",
      image: image?.["#text"] || "",
      url: track.url || `https://www.last.fm/user/${encodeURIComponent(username)}`,
      nowPlaying: track["@attr"]?.nowplaying === "true",
    }, origin);
  } catch {
    sendJson(response, 502, { message: "No fue posible consultar Last.fm." }, origin);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Proxy Last.fm local activo en http://127.0.0.1:${port}/api/lastfm.php`);
});
