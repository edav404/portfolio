import { beforeEach, describe, expect, it, vi } from "vitest";
import { contactErrorCodes } from "@/content/ui";

/**
 * Contrato de errores de `/api/contact` (P4): `{ ok: false, code, message }`, con `code` de
 * `contactErrorCodes` (el formulario lo traduce) y `message` en ES por compatibilidad.
 */
type Route = typeof import("@/app/api/contact/route");
let POST: Route["POST"];

beforeEach(async () => {
  // Sin SMTP: el envío válido termina en `not_configured`. Módulo nuevo por test (rate limit limpio).
  for (const name of ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "CONTACT_RECIPIENT"]) vi.stubEnv(name, "");
  vi.resetModules();
  ({ POST } = await import("@/app/api/contact/route"));
});

let ip = 0;
function request(body: Record<string, string> | string, headers: Record<string, string> = {}) {
  ip += 1;
  const init: RequestInit & { headers: Record<string, string> } = {
    method: "POST",
    headers: { host: "localhost:3000", origin: "http://localhost:3000", "x-forwarded-for": `203.0.113.${ip}`, ...headers },
  };
  if (typeof body === "string") init.body = body;
  else {
    init.body = new URLSearchParams(body).toString();
    init.headers["content-type"] ??= "application/x-www-form-urlencoded";
  }
  return new Request("http://localhost:3000/api/contact/", init);
}

const valid = { name: "Ana", email: "ana@example.com", message: "Quiero una tienda en línea para mi negocio." };

async function expectError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  const data = await response.json();
  expect(data).toMatchObject({ ok: false, code });
  expect(contactErrorCodes).toContain(data.code);
  expect(typeof data.message).toBe("string");
  expect(response.headers.get("cache-control")).toBe("no-store");
}

describe("/api/contact: códigos de error", () => {
  it("origen cruzado → 403 origin", async () => {
    await expectError(await POST(request(valid, { origin: "https://evil.example" })), 403, "origin");
  });

  it("tipo de contenido no admitido → 415 invalid", async () => {
    await expectError(await POST(request("{}", { "content-type": "application/json" })), 415, "invalid");
  });

  it("campos inválidos → 422 invalid", async () => {
    await expectError(await POST(request({ ...valid, email: "no-es-correo" })), 422, "invalid");
  });

  it("cuerpo demasiado grande → 413 too_large", async () => {
    await expectError(await POST(request({ ...valid, message: "x".repeat(25_000) })), 413, "too_large");
  });

  it("sin SMTP configurado → 503 not_configured", async () => {
    await expectError(await POST(request(valid)), 503, "not_configured");
  });

  it("límite por IP → 429 rate_limited con Retry-After", async () => {
    const headers = { "x-forwarded-for": "198.51.100.7" };
    let last: Response | undefined;
    for (let i = 0; i < 6; i++) last = await POST(request(valid, headers));
    await expectError(last!, 429, "rate_limited");
    expect(Number(last!.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("honeypot → 200 ok sin enviar", async () => {
    const response = await POST(request({ ...valid, website: "spam" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
  });

  it("el formulario cliente conoce exactamente los mismos códigos", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("components/contact-form.tsx", "utf8");
    const declared = source.match(/export type ContactErrorCode = ([^;]+);/)?.[1].match(/"([a-z_]+)"/g)?.map((code) => code.slice(1, -1)).sort();
    expect(declared).toEqual([...contactErrorCodes].sort());
  });
});
