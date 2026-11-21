import { connection } from "next/server";
import { getRecentTrack } from "@/lib/server/lastfm";
import { clientKey, createRateLimiter } from "@/lib/server/rate-limit";

const limiter = createRateLimiter({ name: "lastfm", limit: 30, windowMs: 60_000 });

export async function GET(request: Request) {
  await connection();
  const { ok, retryAfter } = limiter.check(clientKey(request));
  if (!ok) {
    return Response.json(
      { message: "Demasiadas solicitudes." },
      { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } },
    );
  }

  const result = await getRecentTrack();
  if (!result.ok) {
    return Response.json({ message: result.message }, { status: result.status, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json(result.track, {
    headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" },
  });
}
