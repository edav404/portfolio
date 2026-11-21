#!/usr/bin/env node
/**
 * Smoke test de rutas contra un servidor arrancado (idealmente el standalone de producción:
 * `node .next/standalone/server.js`, como en el Dockerfile). Sin dependencias: `fetch` nativo.
 *
 * Uso: node scripts/smoke-routes.mjs [baseUrl]      (por defecto http://127.0.0.1:3111)
 *
 * Comprueba (docs/arquitectura-rutas.md §5 P2 y §9.3):
 * - cada <loc> del sitemap responde 200, HTML con su lang, sin redirección ni noindex, canonical y
 *   og:url iguales a su propia URL; hreflang (sitemap y <head>) solo si content/publication.ts
 *   publica "en", y entonces idéntico en ambos, recíproco y con x-default = ES (P8/P9);
 * - cada redirección de lib/redirects.ts es un 308 de un solo salto a una URL que da 200;
 * - el 404 global (experimental.globalNotFound): /no-existe/, slug rechazado, /api/ y archivo
 *   inexistentes → 404 con lang="es", noindex y contenido EN EL HTML INICIAL, sin canonical;
 * - árbol EN (P6), rastreado desde /en/ (P7: sin enlaces internos fuera de /en/ salvo /cv/, /api/ y
 *   el selector de idioma): 200, lang="en", canonical y og:url propios; desde P9 sin noindex, con
 *   hreflang recíproco y og:locale:alternate (antes, noindex y sin hreflang); 404 del catch-all EN
 *   con noindex.
 * - SO (Fase 4): /os/, /en/os/ y un proyecto en cada idioma: 200, noindex, canonical y og:url propios,
 *   sin hreflang, fuera del sitemap; 404 con noindex bajo /os/.
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

// 1) Sitemap. P8: hreflang (sitemap y <head>) solo cuando EN esté publicado (content/publication.ts).
const publication = await readFile(resolve(root, "content/publication.ts"), "utf8");
const enPublished = /publishedLocales[^=]*=\s*\[[^\]]*"en"/.test(publication);
const sitemap = await get("/sitemap.xml");
check(sitemap.status === 200, `/sitemap.xml → ${sitemap.status}`);
const xml = await (await fetch(`${base}/sitemap.xml`)).text();
const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);
const sitemapAlternates = new Map(blocks.map((block) => [
  block.match(/<loc>([^<]+)<\/loc>/)[1].trim(),
  Object.fromEntries([...block.matchAll(/<xhtml:link\b[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"/g)].map((match) => [match[1], match[2]])),
]));
const locs = [...sitemapAlternates.keys()];
check(locs.length > 0, "el sitemap no tiene URLs");
const paths = locs.map((loc) => new URL(loc).pathname);
const headAlternates = (html) => Object.fromEntries([...html.matchAll(/<link\b[^>]*rel="alternate"[^>]*>/g)]
  .map(([tag]) => [tag.match(/\bhrefLang="([^"]+)"/i)?.[1], tag.match(/\bhref="([^"]+)"/)?.[1]])
  .filter(([key]) => key));
const same = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
for (const loc of locs) {
  const path = new URL(loc).pathname;
  const page = await get(path);
  const expectedLang = path.startsWith("/en/") ? "en" : "es";
  check(page.status === 200, `${path} → ${page.status}`);
  check(lang(page.html) === expectedLang, `${path}: lang=${lang(page.html)}`);
  check(!/<meta name="robots" content="noindex/.test(page.html), `${path}: noindex en una URL del sitemap`);
  // P3: canonical y og:url propios de cada página (SEO-02).
  check(attr(page.html, 'rel="canonical"', "href") === loc, `${path}: canonical ≠ ${loc}`);
  check(attr(page.html, 'property="og:url"', "content") === loc, `${path}: og:url ≠ ${loc}`);
  const head = headAlternates(page.html);
  const listed = sitemapAlternates.get(loc);
  if (!enPublished) {
    check(Object.keys(head).length === 0, `${path}: hreflang en <head> antes de publicar el EN`);
    check(Object.keys(listed).length === 0, `${path}: alternates en el sitemap antes de publicar el EN`);
    check(expectedLang === "es", `${path}: URL EN en el sitemap antes de publicarla`);
    continue;
  }
  // P9: el grupo de hreflang del <head> = el del sitemap; incluye la propia URL; x-default = ES; recíproco.
  check(same(head, listed), `${path}: hreflang del <head> ≠ sitemap`);
  check(listed[expectedLang] === loc && listed["x-default"] === listed.es && listed.es && listed.en, `${path}: grupo hreflang incompleto`);
  for (const other of Object.values(listed)) check(same(sitemapAlternates.get(other) ?? {}, listed), `${path}: hreflang no recíproco con ${other}`);
  const ogAlternate = attr(page.html, 'property="og:locale:alternate"', "content");
  check(ogAlternate === (expectedLang === "es" ? "en_US" : "es_CO"), `${path}: og:locale:alternate=${ogAlternate}`);
}
if (enPublished) {
  const enCount = paths.filter((path) => path.startsWith("/en/")).length;
  check(enCount * 2 === paths.length, `sitemap: ${enCount} URLs EN de ${paths.length} (se esperaba la mitad)`);
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

// 6) Selector de idioma (P7) en ambos sentidos: página estática, proyecto y post de slug traducido.
// En el HTML del servidor el enlace va a la ruta sola (query y hash los añade el cliente).
const switchOf = (html) => {
  const tag = [...html.matchAll(/<a\b[^>]*>/g)].map((match) => match[0]).find((text) => /class="language-switch"/.test(text));
  return tag && { href: tag.match(/\bhref="([^"]*)"/)?.[1], hreflang: tag.match(/\bhrefLang="([^"]*)"/i)?.[1], lang: tag.match(/\blang="([^"]*)"/)?.[1] };
};
const postsSource = await readFile(resolve(root, "content/posts.ts"), "utf8");
const [, postEs, postEn] = postsSource.match(/slug:\s*\{\s*es:\s*"([^"]+)",\s*en:\s*"([^"]+)"\s*\}/) ?? [];
check(Boolean(postEs && postEn), "no se pudo leer un slug de post traducido de content/posts.ts");
const pairs = [["/", "/en/"], ["/proyectos/cia-sur/", "/en/projects/cia-sur/"], [`/blog/${postEs}/`, `/en/blog/${postEn}/`]];
let switchChecks = 0;
for (const [es, en] of pairs) {
  for (const [from, to, target] of [[es, en, "en"], [en, es, "es"]]) {
    const page = await get(from);
    const link = switchOf(page.html);
    check(link?.href === to && link?.hreflang === target && link?.lang === target, `${from}: selector ${JSON.stringify(link)} (se esperaba ${to}, ${target})`);
    // Navegación real: el destino responde 200 con su idioma y su selector vuelve al origen.
    const next = await get(to);
    check(next.status === 200 && lang(next.html) === target && switchOf(next.html)?.href === from, `${from} → ${to}: ${next.status}, lang=${lang(next.html)}, vuelta=${switchOf(next.html)?.href}`);
    switchChecks += 1;
  }
}
// Desde el 404 ES (HTML completo en el servidor): el selector lleva a la portada EN.
const notFoundSwitch = switchOf((await get("/no-existe/")).html);
check(notFoundSwitch?.href === "/en/" && notFoundSwitch?.lang === "en", `/no-existe/: selector ${JSON.stringify(notFoundSwitch)}`);
// El 404 EN es el "error shell" (§9.1): su selector solo existe tras hidratar; la navegación real
// desde /en/no-existe/ se comprueba con navegador (ver docs §11.5).

// 7) SO (Fase 4, docs/arquitectura-os.md §1.6): 200, noindex, canonical y og:url propios, sin hreflang
// ni og:locale:alternate, fuera del sitemap y con enlaces reales a los proyectos autorizados.
// Slug autorizado conocido (osProjectSlugs: casos de estudio con portada).
const osSlug = "cia-sur";
const osPages = [["/os/", "es"], ["/en/os/", "en"], [`/os/proyectos/${osSlug}/`, "es"], [`/en/os/projects/${osSlug}/`, "en"]];
for (const [path, expectedLang] of osPages) {
  const page = await get(path);
  check(page.status === 200, `${path} → ${page.status}`);
  check(lang(page.html) === expectedLang, `${path}: lang=${lang(page.html)}`);
  check(/<meta name="robots" content="noindex, follow"/.test(page.html), `${path}: sin noindex, follow`);
  check(new URL(attr(page.html, 'rel="canonical"', "href") ?? "x:", base).pathname === path, `${path}: canonical no es el propio`);
  check(new URL(attr(page.html, 'property="og:url"', "content") ?? "x:", base).pathname === path, `${path}: og:url no es el propio`);
  check(!/<link rel="alternate" hrefLang=/i.test(page.html), `${path}: hreflang en una ruta noindex`);
  check(!attr(page.html, 'property="og:locale:alternate"', "content"), `${path}: og:locale:alternate en una ruta noindex`);
  check(!paths.includes(path), `${path}: está en el sitemap`);
  check(/class="os-root"/.test(page.html) && /<noscript>/.test(page.html), `${path}: sin os-root o <noscript> en el HTML inicial`);
}
for (const [path, prefix] of [["/os/", "/os/proyectos/"], ["/en/os/", "/en/os/projects/"]]) {
  check((await get(path)).html.includes(`href="${prefix}${osSlug}/"`), `${path}: sin enlace real a ${prefix}${osSlug}/`);
}
// Slug fuera del catálogo (vaulto existe en content/projects.ts pero no tiene portada) y rutas inexistentes bajo /os/: 404 con noindex y sin canonical.
for (const path of ["/os/proyectos/no-existe/", "/en/os/projects/no-existe/", "/os/proyectos/vaulto/", "/en/os/projects/vaulto/", "/os/no-existe/", "/en/os/no-existe/"]) {
  const page = await get(path);
  check(page.status === 404, `${path} → ${page.status} (se esperaba 404)`);
  check(/<meta name="robots" content="noindex"/.test(page.html), `${path}: sin noindex`);
  check(!/rel="canonical"/.test(page.html), `${path}: el 404 no debe tener canonical`);
}

if (failures.length) {
  console.error(`✗ ${failures.length} fallos:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`✓ smoke de rutas: ${paths.length} URLs del sitemap, redirecciones, 404 global, ${enSeen.size} páginas EN, 404 EN, ${osPages.length} páginas del SO y ${switchChecks} cambios de idioma`);
