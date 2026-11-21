import { beforeEach, describe, expect, it, vi } from "vitest";
import { isSameOriginRequest } from "@/lib/server/same-origin";

function req(headers: Record<string, string>): Request {
  return new Request("http://internal:3000/api/contact/", { method: "POST", headers });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://edav.com.co");
});

describe("isSameOriginRequest", () => {
  it.each<[string, Record<string, string>, boolean]>([
    // Aceptadas
    ["mismo origen (dominio canónico)", { host: "edav.com.co", origin: "https://edav.com.co", "sec-fetch-site": "same-origin" }, true],
    ["origen canónico aunque Host sea interno", { host: "app:3000", origin: "https://edav.com.co" }, true],
    ["Origin igual al Host por https (túnel o preview)", { host: "preview.example.dev", origin: "https://preview.example.dev" }, true],
    ["http://localhost con puerto (next dev)", { host: "localhost:3000", origin: "http://localhost:3000", "sec-fetch-site": "same-origin" }, true],
    ["http://127.0.0.1", { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" }, true],
    ["http://[::1]", { host: "[::1]:3000", origin: "http://[::1]:3000" }, true],
    ["sin Origin ni Sec-Fetch-Site (curl, navegador antiguo)", {}, true],
    ["Sec-Fetch-Site same-origin sin Origin", { "sec-fetch-site": "same-origin" }, true],
    ["Sec-Fetch-Site none sin Origin (navegación directa)", { "sec-fetch-site": "none" }, true],
    ["mayúsculas en Origin y Host", { host: "EDAV.com.co", origin: "HTTPS://EDAV.COM.CO" }, true],

    // Rechazadas
    ["Sec-Fetch-Site cross-site", { host: "edav.com.co", origin: "https://edav.com.co", "sec-fetch-site": "cross-site" }, false],
    ["Sec-Fetch-Site cross-site en mayúsculas", { "sec-fetch-site": "Cross-Site" }, false],
    ["Origin de otro sitio", { host: "edav.com.co", origin: "https://evil.example" }, false],
    ["Origin null", { host: "edav.com.co", origin: "null" }, false],
    ["Origin mal formado", { host: "edav.com.co", origin: "no es una url" }, false],
    ["esquema no http(s)", { host: "edav.com.co", origin: "file://edav.com.co" }, false],
    ["degradación http en el dominio público", { host: "edav.com.co", origin: "http://edav.com.co" }, false],
    ["degradación http en un host público cualquiera", { host: "preview.example.dev", origin: "http://preview.example.dev" }, false],
    ["puerto distinto al del Host", { host: "edav.com.co", origin: "https://edav.com.co:8443" }, false],
    ["same-site sin Origin (otro subdominio)", { host: "edav.com.co", "sec-fetch-site": "same-site" }, false],
    ["same-site con Origin de otro subdominio", { host: "edav.com.co", origin: "https://blog.edav.com.co", "sec-fetch-site": "same-site" }, false],
    ["subdominio que imita el dominio", { host: "edav.com.co", origin: "https://edav.com.co.evil.example" }, false],
    ["localhost con puerto distinto", { host: "localhost:3000", origin: "http://localhost:4000" }, false],
  ])("%s → %s", (_name, headers, expected) => {
    expect(isSameOriginRequest(req(headers))).toBe(expected);
  });

  it("same-site con Origin válido se acepta", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.edav.com.co");
    expect(isSameOriginRequest(req({ host: "app:3000", origin: "https://www.edav.com.co", "sec-fetch-site": "same-site" }))).toBe(true);
  });

  it("sin NEXT_PUBLIC_SITE_URL usa https://edav.com.co", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(isSameOriginRequest(req({ host: "app:3000", origin: "https://edav.com.co" }))).toBe(true);
  });

  it("NEXT_PUBLIC_SITE_URL mal formada: queda solo la comparación con Host", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "no-es-url");
    expect(isSameOriginRequest(req({ host: "app:3000", origin: "https://edav.com.co" }))).toBe(false);
    expect(isSameOriginRequest(req({ host: "edav.com.co", origin: "https://edav.com.co" }))).toBe(true);
  });

  it("http en el dominio de NEXT_PUBLIC_SITE_URL solo si esa URL es http", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://staging.example.dev");
    expect(isSameOriginRequest(req({ host: "app:3000", origin: "http://staging.example.dev" }))).toBe(true);
  });
});
