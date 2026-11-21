import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `rate-limit.ts` lee CLIENT_IP_HEADER y TRUSTED_PROXY_HOPS una sola vez por proceso y guarda los
 * avisos ya emitidos: cada test reimporta el módulo (`vi.resetModules`) tras fijar el entorno.
 */
async function load(env: Record<string, string | undefined> = {}) {
  vi.stubEnv("CLIENT_IP_HEADER", undefined);
  vi.stubEnv("TRUSTED_PROXY_HOPS", undefined);
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  vi.resetModules();
  return import("@/lib/server/rate-limit");
}

function req(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/contact/", { method: "POST", headers });
}

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("clientIp con X-Forwarded-For (por defecto)", () => {
  it("con 1 salto de confianza toma la última IP de la cadena", async () => {
    const { clientIp } = await load();
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6, 203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("ignora lo que el cliente inventa al inicio de la cadena", async () => {
    const { clientIp } = await load();
    expect(clientIp(req({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("con TRUSTED_PROXY_HOPS=2 toma la penúltima", async () => {
    const { clientIp } = await load({ TRUSTED_PROXY_HOPS: "2" });
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6, 203.0.113.7, 10.0.0.2" }))).toBe("203.0.113.7");
  });

  it("CLIENT_IP_HEADER=x-forwarded-for equivale al valor por defecto", async () => {
    const { clientIp } = await load({ CLIENT_IP_HEADER: "X-Forwarded-For" });
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6, 203.0.113.7", "cf-connecting-ip": "9.9.9.9" }))).toBe("203.0.113.7");
    expect(warn).not.toHaveBeenCalled();
  });

  it("cadena más corta que los saltos de confianza → untrusted-chain con aviso único", async () => {
    const { clientIp } = await load({ TRUSTED_PROXY_HOPS: "2" });
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.7" }))).toBe("untrusted-chain");
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.8" }))).toBe("untrusted-chain");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("valor no IP en la posición de confianza → untrusted-chain", async () => {
    const { clientIp } = await load();
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.7, not-an-ip" }))).toBe("untrusted-chain");
  });

  it.each(["0", "6", "1.5", "abc", "-1"])("TRUSTED_PROXY_HOPS=%s no es válido: avisa y usa 1", async (hops) => {
    const { clientIp } = await load({ TRUSTED_PROXY_HOPS: hops });
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6, 203.0.113.7" }))).toBe("203.0.113.7");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("sin X-Forwarded-For usa X-Real-IP", async () => {
    const { clientIp } = await load();
    expect(clientIp(req({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("sin cabeceras de reenvío devuelve unknown (sin aviso fuera de producción)", async () => {
    const { clientIp } = await load({ NODE_ENV: "development" });
    expect(clientIp(req({}))).toBe("unknown");
    expect(warn).not.toHaveBeenCalled();
  });

  it("sin cabeceras de reenvío en producción avisa una vez", async () => {
    const { clientIp } = await load({ NODE_ENV: "production" });
    clientIp(req({}));
    clientIp(req({}));
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe("clientIp con CLIENT_IP_HEADER de un solo valor", () => {
  it("cf-connecting-ip: usa esa cabecera e ignora X-Forwarded-For", async () => {
    const { clientIp } = await load({ CLIENT_IP_HEADER: "cf-connecting-ip" });
    expect(clientIp(req({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "6.6.6.6" }))).toBe("203.0.113.7");
  });

  it("el nombre se normaliza (mayúsculas y espacios)", async () => {
    const { clientIp } = await load({ CLIENT_IP_HEADER: "  X-Real-IP " });
    expect(clientIp(req({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "6.6.6.6" }))).toBe("203.0.113.7");
  });

  it("si falta la cabecera configurada devuelve unknown (no cae a X-Forwarded-For)", async () => {
    const { clientIp } = await load({ CLIENT_IP_HEADER: "cf-connecting-ip" });
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.7" }))).toBe("unknown");
    expect(clientIp(req({ "cf-connecting-ip": "basura" }))).toBe("unknown");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("una cabecera no admitida avisa y vuelve a X-Forwarded-For", async () => {
    const { clientIp } = await load({ CLIENT_IP_HEADER: "x-client-ip" });
    expect(clientIp(req({ "x-client-ip": "6.6.6.6", "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("la configuración se cachea por proceso: cambiar el entorno no afecta sin reimportar", async () => {
    const { clientIp } = await load({ CLIENT_IP_HEADER: "cf-connecting-ip" });
    clientIp(req({ "cf-connecting-ip": "203.0.113.7" }));
    vi.stubEnv("CLIENT_IP_HEADER", "");
    expect(clientIp(req({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "6.6.6.6" }))).toBe("203.0.113.7");
  });
});

describe("normalización de IP", () => {
  it.each([
    ["203.0.113.7:5678", "203.0.113.7"],
    ["[2001:db8::1]:443", "2001:db8::1"],
    ["[2001:db8::1]", "2001:db8::1"],
    ["2001:DB8::ABCD", "2001:db8::abcd"],
    ["::ffff:203.0.113.7", "203.0.113.7"],
    ["::FFFF:203.0.113.7", "203.0.113.7"],
    ["  203.0.113.7  ", "203.0.113.7"],
  ])("%s → %s", async (raw, expected) => {
    const { clientIp } = await load();
    expect(clientIp(req({ "x-forwarded-for": raw }))).toBe(expected);
  });

  it("rechaza IPv4 con octetos fuera de rango", async () => {
    const { clientIp } = await load();
    expect(clientIp(req({ "x-forwarded-for": "999.1.1.1" }))).toBe("untrusted-chain");
  });
});

describe("clientKey", () => {
  it("IPv4 tal cual", async () => {
    const { clientKey } = await load();
    expect(clientKey(req({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("IPv4 mapeada en IPv6 comparte clave con la IPv4", async () => {
    const { clientKey } = await load();
    expect(clientKey(req({ "x-forwarded-for": "::ffff:203.0.113.7" }))).toBe("203.0.113.7");
  });

  it.each([
    ["2001:db8:abcd:12:1:2:3:4", "2001:db8:abcd:12::/64"],
    ["2001:0db8:0000:0012::1", "2001:db8:0:12::/64"],
    ["2001:DB8::1", "2001:db8:0:0::/64"],
    ["::1", "0:0:0:0::/64"],
    ["fe80::1%eth0", "fe80:0:0:0::/64"],
    ["64:ff9b::192.0.2.1", "64:ff9b:0:0::/64"],
    ["1:2:3:4:5:6:192.0.2.1", "1:2:3:4::/64"],
  ])("IPv6 %s → %s", async (raw, expected) => {
    const { clientKey } = await load();
    expect(clientKey(req({ "x-forwarded-for": raw }))).toBe(expected);
  });

  it("dos IPv6 del mismo /64 comparten clave; de /64 distintos, no", async () => {
    const { clientKey } = await load();
    const a = clientKey(req({ "x-forwarded-for": "2001:db8:1:2::aaaa" }));
    const b = clientKey(req({ "x-forwarded-for": "2001:db8:1:2:ffff:ffff:ffff:ffff" }));
    const c = clientKey(req({ "x-forwarded-for": "2001:db8:1:3::aaaa" }));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("los valores sin IP fiable se devuelven tal cual", async () => {
    const { clientKey } = await load();
    expect(clientKey(req({}))).toBe("unknown");
  });
});
