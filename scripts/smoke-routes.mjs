#!/usr/bin/env node
/**
 * Smoke test de rutas contra un servidor arrancado (idealmente el standalone de producción:
 * `node .next/standalone/server.js`, como en el Dockerfile). Sin dependencias: `fetch` nativo.
 *
 * Uso: node scripts/smoke-routes.mjs [baseUrl]      (por defecto http://127.0.0.1:3111)
 *
 * Comprueba (docs/arquitectura-rutas.md §5 P2 y §9.3):
 * - cada <loc> del sitemap responde 200, HTML con lang="es" y sin redirección;
 * - cada redirección de lib/redirects.ts es un 308 de un solo salto a una URL que da 200;
 * - el 404 global (experimental.globalNotFound): /no-existe/, slug rechazado, /api/ y archivo
 *   inexistentes → 404 con lang="es", noindex y contenido EN EL HTML INICIAL, sin canonical.
 * Sale con código 1 si algo falla.
 */
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const base = (process.argv[2] || "http://127.0.0.1:3111").replace(/\/+$/, "");
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

async function get(path) {
  const response = await fetch(base + path, { redirect: "manual" });
  const type = response.headers.get("content-type") ?? "";
  const html = type.includes("text/html") ? await response.text() : (await response.arrayBuffer(), "");
  return { status: response.status, location: response.headers.get("location"), html };
}

const lang = (html) => html.match(/<html\b[^>]*\blang="([^"]*)"/)?.[1] ?? null;

// 1) Sitemap
const sitemap = await get("/sitemap.xml");
check(sitemap.status === 200, `/sitemap.xml → ${sitemap.status}`);
const xml = await (await fetch(`${base}/sitemap.xml`)).text();
const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1].trim()).pathname);
check(paths.length > 0, "el sitemap no tiene URLs");
for (const path of paths) {
  const page = await get(path);
  check(page.status === 200, `${path} → ${page.status}`);
  check(lang(page.html) === "es", `${path}: lang=${lang(page.html)}`);
}

// 2) Redirecciones (mismo parseo que scripts/snapshot-routes.mjs; el test unitario lo cuadra con lib/redirects.ts)
const redirects = (await readFile(resolve(root, "lib/redirects.ts"), "utf8")).matchAll(/^\s*\["(\/[^"]*)",/gm);
for (const [, source] of redirects) {
  const first = await get(source);
  check(first.status === 308 && first.location, `${source} → ${first.status} (se esperaba 308)`);
  if (!first.location) continue;
  const target = await get(new URL(first.location, base).pathname);
  check(target.status === 200, `${source} → ${first.location} → ${target.status} (se esperaba 200 sin más saltos)`);
}

// 3) 404 global en el HTML inicial
for (const path of ["/no-existe/", "/proyectos/no-existe/", "/blog/no-existe/", "/api/x-inexistente/", "/foo.png", "/cv/otro.pdf"]) {
  const page = await get(path);
  check(page.status === 404, `${path} → ${page.status} (se esperaba 404)`);
  check(lang(page.html) === "es", `${path}: el HTML inicial no tiene lang="es" (¿se perdió global-not-found?)`);
  check(/<meta name="robots" content="noindex"/.test(page.html), `${path}: sin noindex`);
  check(page.html.includes("Esta ruta se perdió"), `${path}: el HTML inicial no trae la UI del 404`);
  check(!/rel="canonical"/.test(page.html), `${path}: el 404 no debe tener canonical`);
}

if (failures.length) {
  console.error(`✗ ${failures.length} fallos:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`✓ smoke de rutas: ${paths.length} URLs del sitemap, redirecciones y 404 global`);
