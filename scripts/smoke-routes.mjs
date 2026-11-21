#!/usr/bin/env node
/**
 * Smoke test de rutas contra un servidor arrancado (idealmente el standalone de producción:
 * `node .next/standalone/server.js`, como en el Dockerfile). Sin dependencias: `fetch` nativo.
 *
 * Uso: node scripts/smoke-routes.mjs [baseUrl]      (por defecto http://127.0.0.1:3111)
 *
 * Comprueba (docs/arquitectura-rutas.md §5 P2 y §9.3):
 * - cada <loc> del sitemap responde 200, HTML con lang="es", sin redirección, canonical y og:url
 *   iguales a su propia URL y sin hreflang (solo ES publicado);
 * - cada redirección de lib/redirects.ts es un 308 de un solo salto a una URL que da 200;
 * - el 404 global (experimental.globalNotFound): /no-existe/, slug rechazado, /api/ y archivo
 *   inexistentes → 404 con lang="es", noindex y contenido EN EL HTML INICIAL, sin canonical;
 * - árbol EN (P6), rastreado desde /en/ (P7: sin enlaces internos fuera de /en/ salvo /cv/, /api/ y
 *   el selector de idioma): 200, lang="en", canonical y og:url propios, noindex y sin
 *   hreflang mientras content/publication.ts no publique "en"; 404 del catch-all EN con noindex.
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

/** Valor de un atributo de la etiqueta <link>/<meta> que contiene `marker`. */
function attr(html, marker, name) {
  const tag = [...html.matchAll(/<(?:link|meta)\b[^>]*>/g)].map((match) => match[0]).find((text) => text.includes(marker));
  return tag?.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? null;
}

// 1) Sitemap
const sitemap = await get("/sitemap.xml");
check(sitemap.status === 200, `/sitemap.xml → ${sitemap.status}`);
const xml = await (await fetch(`${base}/sitemap.xml`)).text();
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
check(locs.length > 0, "el sitemap no tiene URLs");
const paths = locs.map((loc) => new URL(loc).pathname);
for (const loc of locs) {
  const path = new URL(loc).pathname;
  const page = await get(path);
  check(page.status === 200, `${path} → ${page.status}`);
  check(lang(page.html) === "es", `${path}: lang=${lang(page.html)}`);
  // P3: canonical y og:url propios de cada página (SEO-02); sin hreflang mientras solo ES esté publicado.
  check(attr(page.html, 'rel="canonical"', "href") === loc, `${path}: canonical ≠ ${loc}`);
  check(attr(page.html, 'property="og:url"', "content") === loc, `${path}: og:url ≠ ${loc}`);
  check(!/<link rel="alternate" hrefLang=/i.test(page.html), `${path}: hreflang antes de publicar el EN`);
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

// 4) Árbol EN (P6): rastreo desde /en/ por los enlaces internos bajo /en/.
const publication = await readFile(resolve(root, "content/publication.ts"), "utf8");
const enPublished = /publishedLocales[^=]*=\s*\[[^\]]*"en"/.test(publication);
const enSeeds = ["/en/", "/en/projects/", "/en/services/", "/en/about/", "/en/blog/", "/en/now/", "/en/contact/"];
const enSeen = new Set();
const enQueue = [...enSeeds];
const enPages = new Map();
while (enQueue.length) {
  const path = enQueue.shift();
  if (enSeen.has(path)) continue;
  enSeen.add(path);
  const page = await get(path);
  enPages.set(path, page.html);
  check(page.status === 200, `${path} → ${page.status}`);
  check(lang(page.html) === "en", `${path}: lang=${lang(page.html)}`);
  const own = `${new URL(attr(page.html, 'rel="canonical"', "href") ?? "x:", base).pathname}`;
  check(own === path, `${path}: canonical ${own}`);
  check(new URL(attr(page.html, 'property="og:url"', "content") ?? "x:", base).pathname === path, `${path}: og:url no es la propia`);
  const noindex = /<meta name="robots" content="noindex/.test(page.html);
  check(enPublished ? !noindex : noindex, `${path}: noindex=${noindex} con EN ${enPublished ? "publicado" : "sin publicar"}`);
  if (!enPublished) check(!/<link rel="alternate" hrefLang=/i.test(page.html), `${path}: hreflang antes de publicar el EN`);
  for (const [, href] of page.html.matchAll(/<a\b[^>]*\bhref="(\/en\/[^"#?]*)/g)) if (!enSeen.has(href)) enQueue.push(href);
}
check(enSeen.size >= 9, `árbol EN: solo ${enSeen.size} páginas alcanzables`);

// 4b) P7: ningún enlace interno de una página EN sale de /en/ (salvo /cv/, /api/, externos y el
// selector de idioma, que es el único que apunta a ES a propósito, con hreflang="es").
for (const [path, html] of enPages) {
  for (const [tag] of html.matchAll(/<a\b[^>]*>/g)) {
    const target = tag.match(/\bhref="([^"]*)"/)?.[1];
    if (!target || !target.startsWith("/") || target.startsWith("//")) continue;
    if (/^\/(en|cv|api)\//.test(target) || target.startsWith("#")) continue;
    if (/\bhrefLang="es"/i.test(tag) && /\blang="es"/.test(tag)) continue;
    check(false, `${path}: enlace interno fuera de /en/ → ${target}`);
  }
  const switchTag = [...html.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]).find((tag) => /class="language-switch"/.test(tag) && /\bhrefLang="es"/i.test(tag));
  check(Boolean(switchTag), `${path}: sin selector de idioma`);
}

// 5) 404 EN: catch-all del árbol EN. El HTML inicial es el "error shell" de Next 16.4.6 (§9.1):
// aquí solo status y noindex; lang="en" y la UI EN se comprueban con navegador.
for (const path of ["/en/no-existe/", "/en/projects/no-existe/", "/en/blog/no-existe/"]) {
  const page = await get(path);
  check(page.status === 404, `${path} → ${page.status} (se esperaba 404)`);
  check(/<meta name="robots" content="noindex"/.test(page.html), `${path}: sin noindex`);
  check(!/rel="canonical"/.test(page.html), `${path}: el 404 no debe tener canonical`);
}

if (failures.length) {
  console.error(`✗ ${failures.length} fallos:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`✓ smoke de rutas: ${paths.length} URLs del sitemap, redirecciones, 404 global, ${enSeen.size} páginas EN y 404 EN`);
