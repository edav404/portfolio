import { connection } from "next/server";
import { getRecentTrack } from "@/lib/server/lastfm";
import { clientIp, createRateLimiter } from "@/lib/server/rate-limit";

const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

export async function GET(request: Request) {
  await connection();
  const { ok, retryAfter } = limiter(clientIp(request));
  if (!ok) {
    return Response.json({ message: "Demasiadas solicitudes." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  const result = await getRecentTrack();
  if (!result.ok) {
    return Response.json({ message: result.message }, { status: result.status, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json(result.track, {
    headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" },
  });
}
