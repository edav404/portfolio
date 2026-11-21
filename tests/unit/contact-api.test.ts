import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contactErrorCodes } from "@/content/contact-errors";
import { ui } from "@/content/ui";

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

  it("mensajes ES previos por rama: 415 y 429 global incluidos", async () => {
    const response = await POST(request("{}", { "content-type": "application/json" }));
    expect(await response.json()).toEqual({ ok: false, code: "invalid", message: "Tipo de contenido no admitido." });
  });

  it("un único listado de códigos: ui, servidor y cliente", async () => {
    const { readFileSync } = await import("node:fs");
    // Microcopy: una traducción por código, ni más ni menos.
    expect(Object.keys(ui.contactForm.errors).sort()).toEqual([...contactErrorCodes].sort());
    // Servidor: usa todos los códigos y ninguno fuera del listado.
    const route = readFileSync("app/api/contact/route.ts", "utf8");
    const used = new Set([...route.matchAll(/fail\("([a-z_]+)"/g)].map((match) => match[1]));
    expect([...used].sort()).toEqual([...contactErrorCodes].sort());
    // Cliente y servidor importan el tipo del mismo módulo (no hay uniones literales duplicadas).
    expect(route).toMatch(/from "@\/content\/contact-errors"/);
    expect(readFileSync("components/contact-form.tsx", "utf8")).toMatch(/from "@\/content\/contact-errors"/);
  });
});

/** SMTP simulado y configurado: `sendMail` falla o acepta según la cola `outcomes`. */
describe("/api/contact con SMTP simulado", () => {
  const outcomes: ("fail" | "ok")[] = [];
  const sent: unknown[] = [];

  beforeEach(async () => {
    outcomes.length = 0;
    sent.length = 0;
    vi.resetModules();
    vi.doMock("@/lib/server/mailer", async (original) => ({
      ...(await original<typeof import("@/lib/server/mailer")>()),
      getMailConfig: () => ({ ok: true, config: { host: "smtp.test", port: 587, secure: false, user: "u", pass: "p", from: "from@test.co", recipient: "to@test.co" } }),
      sendMail: async (_config: unknown, message: unknown) => {
        if ((outcomes.shift() ?? "ok") === "fail") throw Object.assign(new Error("535 5.7.8 Authentication failed for secret-user@smtp.test"), { code: "EAUTH", responseCode: 535 });
        sent.push(message);
      },
    }));
    ({ POST } = await import("@/app/api/contact/route"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.doUnmock("@/lib/server/mailer");
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("fallo SMTP → 502 con cuerpo público exacto y sin detalle del SMTP; luego acepta", async () => {
    outcomes.push("fail", "ok");
    const failed = await POST(request(valid, { "x-forwarded-for": "198.51.100.20" }));
    expect(failed.status).toBe(502);
    const text = await failed.text();
    expect(JSON.parse(text)).toEqual({ ok: false, code: "server", message: "No fue posible enviar el mensaje. Intenta por WhatsApp." });
    expect(text).not.toMatch(/535|secret-user|smtp\.test|EAUTH/);

    const accepted = await POST(request(valid, { "x-forwarded-for": "198.51.100.20" }));
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toEqual({ ok: true, message: "Mensaje enviado correctamente." });
    expect(sent).toHaveLength(1);
  });

  it("los fallos SMTP devuelven la cuota global (40 fallos y el 41.º envío sigue entrando)", async () => {
    outcomes.push(...Array<"fail">(40).fill("fail"));
    for (let i = 0; i < 40; i++) expect((await POST(request(valid, { "x-forwarded-for": `192.0.2.${i + 1}` }))).status).toBe(502);
    const next = await POST(request(valid, { "x-forwarded-for": "192.0.2.200" }));
    expect(next.status).toBe(200);
  });

  it("los fallos SMTP no devuelven la cuota por IP (6.º intento de la misma IP → 429)", async () => {
    outcomes.push(...Array<"fail">(5).fill("fail"));
    const headers = { "x-forwarded-for": "198.51.100.30" };
    for (let i = 0; i < 5; i++) expect((await POST(request(valid, headers))).status).toBe(502);
    const blocked = await POST(request(valid, headers));
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ ok: false, code: "rate_limited", message: "Demasiados envíos. Intenta de nuevo en unos minutos." });
  });

  it("límite global con IP distintas → 429 rate_limited con el mensaje de WhatsApp y Retry-After", async () => {
    for (let i = 0; i < 40; i++) expect((await POST(request(valid, { "x-forwarded-for": `192.0.2.${i + 1}` }))).status).toBe(200);
    const blocked = await POST(request(valid, { "x-forwarded-for": "192.0.2.250" }));
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ ok: false, code: "rate_limited", message: "El formulario está recibiendo demasiados mensajes. Escríbeme por WhatsApp." });
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(sent).toHaveLength(40);
  });

  it("cuerpo que no termina de llegar → 408 timeout (stream controlado)", async () => {
    vi.useFakeTimers();
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(encoder.encode("name=Ana&")); } });
    const slow = new Request("http://localhost:3000/api/contact/", {
      method: "POST", body, duplex: "half",
      headers: { host: "localhost:3000", origin: "http://localhost:3000", "x-forwarded-for": "198.51.100.40", "content-type": "application/x-www-form-urlencoded" },
    } as RequestInit & { duplex: "half" });
    const pending = POST(slow);
    await vi.advanceTimersByTimeAsync(10_001);
    const response = await pending;
    expect(response.status).toBe(408);
    expect(await response.json()).toEqual({ ok: false, code: "timeout", message: "La solicitud tardó demasiado." });
  });
});
