#!/usr/bin/env node
/**
 * Snapshot de rutas (Fase 3, paso P0 de docs/arquitectura-rutas.md).
 *
 * Contra un servidor ya arrancado (idealmente el standalone: `node .next/standalone/server.js`),
 * recorre cada <loc> de /sitemap.xml y cada `source` de lib/redirects.ts y guarda, por URL:
 * status, Location, <html lang>, <title>, canonical y og:url. Sin dependencias: `fetch` nativo.
 *
 * Uso:
 *   node scripts/snapshot-routes.mjs [baseUrl] [salida]
 *   node scripts/snapshot-routes.mjs http://127.0.0.1:3111 tests/fixtures/routes-baseline.json
 *   node scripts/snapshot-routes.mjs http://127.0.0.1:3111 -        ← imprime en stdout
 *
 * El JSON es determinista (orden fijo, sin fechas) para que dos ejecuciones sean idénticas
 * y un `git diff` muestre solo cambios reales de rutas.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const base = (process.argv[2] || "http://127.0.0.1:3111").replace(/\/+$/, "");
const out = process.argv[3] || resolve(root, "tests/fixtures/routes-baseline.json");

/** URLs extra que no están en el sitemap pero conviene vigilar (404 actuales). */
const probes = ["/no-existe/", "/proyectos/no-existe/"];

/**
 * Sources de lib/redirects.ts leídos del código fuente (es TypeScript con imports sin extensión:
 * no se puede importar desde Node sin compilar). tests/unit/routes.test.ts comprueba que esta
 * lista coincide con `wordpressRedirects`, así que si el formato cambia, el test lo detecta.
 */
async function redirectSources() {
  const source = await readFile(resolve(root, "lib/redirects.ts"), "utf8");
  return [...source.matchAll(/^\s*\["(\/[^"]*)",/gm)].map((match) => match[1]);
}

async function sitemapPaths() {
  const response = await fetch(`${base}/sitemap.xml`);
  if (!response.ok) throw new Error(`/sitemap.xml respondió ${response.status}`);
  const xml = await response.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => {
    const url = new URL(match[1].trim());
    return url.pathname + url.search;
  });
}

/** Decodifica las entidades que Next escribe en atributos y <title>. */
function decode(text) {
  return text
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'");
}

/** Valor de un atributo dentro de la etiqueta que contiene `marker` (orden de atributos libre). */
function tagAttr(html, marker, attr) {
  const tag = [...html.matchAll(/<(?:link|meta)\b[^>]*>/g)].map((m) => m[0]).find((t) => t.includes(marker));
  if (!tag) return null;
  const value = tag.match(new RegExp(`\\b${attr}="([^"]*)"`));
  return value ? decode(value[1]) : null;
}

async function snapshot(path, kind) {
  const response = await fetch(base + path, { redirect: "manual" });
  let location = response.headers.get("location");
  // Location relativo al origen: se quita el host local para que el snapshot no dependa del puerto.
  if (location?.startsWith(base)) location = location.slice(base.length) || "/";
  const entry = { path, kind, status: response.status, location: location ?? null, lang: null, title: null, canonical: null, ogUrl: null };
  const type = response.headers.get("content-type") ?? "";
  if (type.includes("text/html")) {
    const html = await response.text();
    entry.lang = html.match(/<html\b[^>]*\blang="([^"]*)"/)?.[1] ?? null;
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/);
    entry.title = title ? decode(title[1]) : null;
    entry.canonical = tagAttr(html, 'rel="canonical"', "href");
    entry.ogUrl = tagAttr(html, 'property="og:url"', "content");
  } else {
    await response.arrayBuffer();
  }
  return entry;
}

const targets = [
  ...(await sitemapPaths()).map((path) => [path, "sitemap"]),
  ...(await redirectSources()).map((path) => [path, "redirect"]),
  ...probes.map((path) => [path, "probe"]),
];

// Secuencial: el orden del resultado es el de la lista y no se satura el servidor.
const entries = [];
for (const [path, kind] of targets) entries.push(await snapshot(path, kind));

const json = `${JSON.stringify({ description: "Línea base de rutas (P0, docs/arquitectura-rutas.md). Regenerar con scripts/snapshot-routes.mjs contra el servidor standalone.", entries }, null, 2)}\n`;
if (out === "-") {
  process.stdout.write(json);
} else {
  await mkdir(dirname(resolve(out)), { recursive: true });
  await writeFile(resolve(out), json);
  console.log(`${entries.length} rutas → ${out}`);
}
