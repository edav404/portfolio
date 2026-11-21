import { connection } from "next/server";

// Solo el estado: el uptime revelaría cuándo se reinició el proceso (SEC-06) y el healthcheck no lo necesita.
export async function GET() {
  await connection();
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
