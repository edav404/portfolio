#!/usr/bin/env node
/**
 * E2E de navegación URL <-> ventana del SO (docs/arquitectura-os.md §1.3, §8 punto 8, §12).
 * Edge/Chrome headless con CDP, sin dependencias (Node 24 trae `fetch` y `WebSocket`), contra el build
 * standalone, en ES y EN.
 *
 * Uso:  node scripts/os-e2e.mjs [baseUrl] [--serve]
 *   --serve   prepara y arranca `.next/standalone/server.js` en 127.0.0.1:3111 (copia `public` y
 *             `.next/static` si faltan) y lo detiene al terminar. Sin él, usa un servidor ya arrancado
 *             (por defecto http://127.0.0.1:3111). Navegador: E2E_BROWSER o Edge/Chrome del sistema.
 *
 * Tras cada paso verifica URL, `document.title`, canonical, `og:url` (contra el HTML que sirve el
 * servidor para esa misma URL), ventanas abiertas, ventana activa y foco, y cuenta las peticiones RSC:
 * 1 por push/replace, 0 con Atrás/Adelante, enfocar o abrir una app local.
 *
 * Los proyectos se abren SIEMPRE por la galería (seleccionar y «Abrir»); si no funciona, el escenario
 * falla (sin atajos por `next.router.push`). Cada ventana de proyecto se compara con el HTML que el
 * servidor sirve para su slug (texto completo y enlaces): cabecera, reto, solución y enlaces de A y B.
 * Escenarios extra: URLs repetidas, salto de varias entradas y latencia de red (CDP) con intenciones
 * de navegación que Next descarta o sustituye.
 * Salida: matriz de resultados; código 1 si algo falla.
 */
import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.env.E2E_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const serve = args.includes("--serve");
const base = (args.find((a) => a.startsWith("http")) ?? "http://127.0.0.1:3111").replace(/\/+$/, "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Servidor standalone -------------------------------------------------------------------------

let server = null;
async function startServer() {
  const dir = join(root, ".next", "standalone");
  if (!existsSync(join(dir, "server.js"))) throw new Error("Falta .next/standalone/server.js: ejecuta `npm run build`.");
  cpSync(join(root, "public"), join(dir, "public"), { recursive: true });
  cpSync(join(root, ".next", "static"), join(dir, ".next", "static"), { recursive: true });
  const url = new URL(base);
  server = spawn(process.execPath, ["server.js"], { cwd: dir, env: { ...process.env, PORT: url.port || "3111", HOSTNAME: url.hostname, NODE_ENV: "production" }, stdio: "ignore" });
  for (let i = 0; i < 100; i++) { try { if ((await fetch(`${base}/os/`)).ok) return; } catch { /* aún no */ } await sleep(200); }
  throw new Error("El servidor standalone no arrancó.");
}
const stopServer = () => { try { server?.kill(); } catch { /* ya detenido */ } };

// --- Navegador (CDP) ------------------------------------------------------------------------------

function findBrowser() {
  const candidates = [process.env.E2E_BROWSER, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/microsoft-edge"].filter(Boolean);
  const found = candidates.find((c) => existsSync(c));
  if (!found) throw new Error("No hay Edge/Chrome: define E2E_BROWSER.");
  return found;
}

let nextDebugPort = 9500;
async function launch() {
  const profile = mkdtempSync(join(tmpdir(), "os-e2e-"));
  const port = nextDebugPort++;
  const proc = spawn(findBrowser(), ["--headless=new", "--disable-gpu", "--no-first-run", ...(process.env.E2E_NO_SANDBOX ? ["--no-sandbox"] : []), `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, "--window-size=1280,800", "about:blank"], { stdio: "ignore" });
  let targets;
  for (let i = 0; i < 100; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(100); } }
  if (!targets) throw new Error("El navegador no abrió el puerto de depuración.");
  const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0; const pending = new Map(); const listeners = [];
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method) listeners.forEach((l) => l(m)); });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
  const until = async (expr, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch { /* página en transición */ } await sleep(80); } return false; };
  const logs = []; const rsc = [];
  listeners.push((m) => {
    if (m.method === "Runtime.consoleAPICalled" && ["error", "warning", "assert"].includes(m.params.type)) logs.push(`[console.${m.params.type}] ${m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300)}`);
    if (m.method === "Runtime.exceptionThrown") logs.push(`[exception] ${(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 300)}`);
    if (m.method === "Log.entryAdded" && ["error", "warning"].includes(m.params.entry.level)) logs.push(`[log.${m.params.entry.level}] ${m.params.entry.text.slice(0, 200)} ${m.params.entry.url ?? ""}`);
    if (m.method === "Network.requestWillBeSent") {
      const { url, headers } = m.params.request;
      const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
      if (h.rsc === "1" || url.includes("_rsc=")) rsc.push({ url, prefetch: "next-router-prefetch" in h });
    }
  });
  for (const domain of ["Page", "Runtime", "Log", "Network"]) await send(`${domain}.enable`);
  const goto = async (url) => { await send("Page.navigate", { url }); await sleep(300); await until("document.readyState === 'complete'"); await sleep(900); };
  const reload = async () => { await send("Page.reload"); await sleep(300); await until("document.readyState === 'complete'"); await sleep(900); };
  const close = async () => { try { ws.close(); } catch { /* cerrado */ } proc.kill(); await sleep(500); try { rmSync(profile, { recursive: true, force: true }); } catch { /* perfil en uso */ } };
  return { ev, until, logs, rsc, goto, reload, close, send };
}

// --- Observación y verificación ---------------------------------------------------------------------

const OBSERVE = `(() => {
  const meta = (sel, attr) => document.querySelector(sel)?.getAttribute(attr) ?? null;
  const wins = [...document.querySelectorAll('.xp-window')].map((w) => ({ id: w.id.replace(/^win-/, ''), min: w.hidden, active: w.dataset.active === 'true' }));
  const a = document.activeElement;
  return JSON.stringify({
    url: location.pathname, title: document.title, lang: document.documentElement.lang,
    canonical: meta('link[rel=canonical]', 'href'), og: meta('meta[property="og:url"]', 'content'), robots: meta('meta[name=robots]', 'content'),
    wins, hist: history.length,
    focus: { id: a.id || '', task: a.getAttribute?.('data-task') || '', icon: a.getAttribute?.('data-icon') || '', tag: a.tagName },
  });
})()`;

const observe = async (b) => JSON.parse(await b.ev(OBSERVE));
const winsOf = (o) => o.wins.filter((w) => w.id !== "projects").map((w) => `${w.id}${w.min ? "(min)" : ""}${w.active ? "*" : ""}`);
const pick = (html, re) => html.match(re)?.[1] ?? null;
const unescapeHtml = (s) => s?.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">") ?? null;

/** Lo que el servidor sirve en `<head>` para esa URL: la verdad contra la que se compara el DOM. */
async function serverHead(path) {
  const html = await (await fetch(base + path)).text();
  return {
    title: unescapeHtml(pick(html, /<title[^>]*>([^<]*)<\/title>/)),
    canonical: pick(html, /<link rel="canonical" href="([^"]*)"/),
    og: pick(html, /<meta property="og:url" content="([^"]*)"/),
  };
}

const decode = (s) => s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const squash = (s) => s.replace(/\s+/g, " ").trim();
const articleCache = new Map();

/** Texto y enlaces del `<article>` de la ventana del proyecto en el HTML que sirve el servidor para su ruta. */
async function serverArticle(path) {
  if (articleCache.has(path)) return articleCache.get(path);
  const html = await (await fetch(base + path)).text();
  const i = html.indexOf("<article");
  const j = html.indexOf("</article>", i);
  const frag = i >= 0 && j > i ? html.slice(i, j) : "";
  const result = {
    text: squash(decode(frag.replace(/<!--.*?-->/g, "").replace(/<[^>]*>/g, ""))),
    hrefs: [...frag.matchAll(/href="([^"]*)"/g)].map((m) => decode(m[1])),
  };
  articleCache.set(path, result);
  return result;
}

const ARTICLE = (slug) => `(() => { const w = document.getElementById(${JSON.stringify(`win-project:${slug}`)}); const a = w?.querySelector('article'); return a ? JSON.stringify({ text: a.textContent, hrefs: [...a.querySelectorAll('a[href]')].map((x) => x.getAttribute('href')) }) : null; })()`;

/** El contenido de la ventana de `slug` (cabecera, reto, solución, enlaces) es el de SU proyecto. */
async function checkDetail(b, ctx, slug, label) {
  const raw = await b.ev(ARTICLE(slug));
  if (!raw) { check(`${label}: ventana ${slug} con contenido`, false, "sin <article>"); return; }
  const dom = JSON.parse(raw);
  const server = await serverArticle(ctx.proj(slug));
  check(`${label}: detalle de ${slug} (texto)`, server.text.length > 200 && squash(dom.text) === server.text, `dom=${squash(dom.text).slice(0, 120)} | srv=${server.text.slice(0, 120)}`);
  check(`${label}: detalle de ${slug} (enlaces)`, JSON.stringify(dom.hrefs) === JSON.stringify(server.hrefs), `${dom.hrefs} != ${server.hrefs}`);
}

const matrix = [];
const failures = [];
let currentGroup = "";
function check(name, cond, detail = "") {
  matrix.push({ group: currentGroup, name, ok: !!cond });
  if (!cond) failures.push(`[${currentGroup}] ${name} ${detail}`);
}

const rscCount = (b, since) => b.rsc.slice(since).filter((r) => !r.prefetch).length;

/**
 * Comprueba un paso: URL, cabecera (contra el servidor), ventanas, foco y peticiones RSC.
 * `exp`: { url, wins (sin la galería, ordenadas por barra de tareas), rsc, focus?, hist? ('same'|'+1') }
 */
async function verify(b, label, exp, ctx) {
  await sleep(700);
  const o = await observe(b);
  const sub = (s) => `${label}: ${s}`;
  check(sub("URL"), o.url === exp.url, `${o.url} != ${exp.url}`);
  const head = await serverHead(o.url);
  check(sub("document.title = título del servidor"), !!o.title && o.title === head.title, `${o.title} != ${head.title}`);
  check(sub("canonical = URL"), o.canonical !== null && o.canonical.endsWith(o.url) && o.canonical === head.canonical, `${o.canonical} (${head.canonical})`);
  check(sub("og:url = URL"), o.og !== null && o.og.endsWith(o.url) && o.og === head.og, `${o.og} (${head.og})`);
  check(sub("noindex"), /noindex/.test(o.robots ?? ""), String(o.robots));
  check(sub("lang"), o.lang === ctx.locale, o.lang);
  check(sub("ventanas"), JSON.stringify(winsOf(o)) === JSON.stringify(exp.wins), `${winsOf(o)} != ${exp.wins}`);
  if (exp.rsc !== undefined) check(sub(`RSC = ${exp.rsc}`), rscCount(b, ctx.mark) === exp.rsc, `hubo ${rscCount(b, ctx.mark)}`);
  if (exp.focus) check(sub(`foco ${exp.focus}`), exp.focus(o.focus), JSON.stringify(o.focus));
  if (exp.hist) check(sub(`historial ${exp.hist}`), exp.hist === "+1" ? o.hist === ctx.hist + 1 : o.hist === ctx.hist, `${ctx.hist} -> ${o.hist}`);
  if (exp.details !== false) {
    for (const w of o.wins.filter((x) => x.id.startsWith("project:") && !x.min)) {
      const slug = w.id.slice("project:".length);
      if (await b.until(`!!document.querySelector('[id="win-project:${slug}"] article dt')`, 8000)) await checkDetail(b, ctx, slug, label);
      else check(sub(`detalle de ${slug} cargado (no queda en estado de carga)`), false);
    }
  }
  ctx.hist = o.hist;
  ctx.mark = b.rsc.length;
  return o;
}

// --- Acciones del usuario --------------------------------------------------------------------------

const click = (b, sel) => b.ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error('sin ${sel.replace(/'/g, "")}'); el.click(); return true; })()`);
const back = (b) => b.ev("history.back(), true");
const forward = (b) => b.ev("history.forward(), true");

/**
 * Abre un proyecto como lo haría el usuario: icono de la galería -> seleccionar la tarjeta -> «Abrir»,
 * y cierra la galería (deja el escritorio como estaba). Sin atajos: si algo falta, lanza error.
 */
async function openProject(b, ctx, slug) {
  const gallery = await b.ev(`(() => { const w = document.getElementById('win-projects'); return !w ? 'none' : w.hidden ? 'min' : 'open'; })()`);
  if (gallery === "none") await click(b, '[data-icon="projects"]');
  else if (gallery === "min") await click(b, '[data-task="projects"]');
  const card = `#win-projects [data-slug="${slug}"]`;
  if (!(await b.until(`!!document.querySelector(${JSON.stringify(card)})`, 10000))) throw new Error(`La galería no expone ${card}`);
  await click(b, card);
  if (!(await b.until(`document.querySelector('#win-projects [data-gallery-open]')?.disabled === false`, 5000))) throw new Error("«Abrir» no se habilitó tras seleccionar");
  await click(b, "#win-projects [data-gallery-open]");
  if (!(await b.until(`!!document.getElementById(${JSON.stringify(`win-project:${slug}`)})`, 5000))) throw new Error(`«Abrir» no abrió la ventana de ${slug}`);
  await click(b, "#win-projects .xp-caption--close");
  return "ui";
}

// --- Escenarios ---------------------------------------------------------------------------------------

const focusOnBody = (id) => (f) => f.id === `win-${id}-body`;
const focusInWindow = (id) => (f) => f.id === `win-${id}-body` || f.tag === "INPUT" || f.tag === "TEXTAREA";

async function sequence(b, ctx, slugs, upTo, reloadAtEnd) {
  const [A, B] = slugs;
  const wA = `project:${A}`, wB = `project:${B}`;
  const steps = [
    ["abrir A (push)", () => openProject(b, ctx, A), { url: ctx.proj(A), wins: ["welcome", `${wA}*`], rsc: 1, hist: "+1", focus: focusOnBody(wA) }],
    ["abrir B (push)", () => openProject(b, ctx, B), { url: ctx.proj(B), wins: ["welcome", wA, `${wB}*`], rsc: 1, hist: "+1", focus: focusOnBody(wB) }],
    ["enfocar A (sin historial)", () => click(b, `[data-task="${wA}"]`), { url: ctx.proj(B), wins: ["welcome", `${wA}*`, wB], rsc: 0, hist: "same" }],
    ["Atrás -> A (B se deshace)", () => back(b), { url: ctx.proj(A), wins: ["welcome", `${wA}*`], rsc: 0, focus: focusOnBody(wA) }],
    ["Atrás -> /os/ (A se deshace)", () => back(b), { url: ctx.os, wins: ["welcome*"], rsc: 0 }],
    ["Adelante -> A", () => forward(b), { url: ctx.proj(A), wins: ["welcome", `${wA}*`], rsc: 0, focus: focusOnBody(wA) }],
    ["Adelante -> B", () => forward(b), { url: ctx.proj(B), wins: ["welcome", wA, `${wB}*`], rsc: 0, focus: focusOnBody(wB) }],
  ];
  for (let i = 0; i < upTo; i++) {
    const [label, run, exp] = steps[i];
    ctx.mark = b.rsc.length;
    await run();
    await verify(b, `${label}${reloadAtEnd ? "" : ""}`, exp, ctx);
  }
  if (reloadAtEnd) {
    const before = await observe(b);
    await b.reload();
    const after = await observe(b);
    const sel = after.url.includes("/proyectos/") || after.url.includes("/projects/");
    check(`recarga tras paso ${upTo}: misma URL`, after.url === before.url, `${before.url} -> ${after.url}`);
    check(`recarga tras paso ${upTo}: ${sel ? "solo el proyecto seleccionado" : "solo Welcome"}`,
      JSON.stringify(winsOf(after)) === JSON.stringify(sel ? [`project:${after.url.split("/").filter(Boolean).pop()}*`] : ["welcome*"]), winsOf(after).join());
    ctx.hist = after.hist; ctx.mark = b.rsc.length;
  }
}

async function runLocale(locale) {
  const ctx = {
    locale,
    os: locale === "es" ? "/os/" : "/en/os/",
    proj: (s) => (locale === "es" ? `/os/proyectos/${s}/` : `/en/os/projects/${s}/`),
    otherProj: (s) => (locale === "es" ? `/en/os/projects/${s}/` : `/os/proyectos/${s}/`),
    otherOs: locale === "es" ? "/en/os/" : "/os/",
    home: locale === "es" ? "/" : "/en/",
    hist: 0, mark: 0,
  };
  const html = await (await fetch(base + ctx.os)).text();
  const slugs = [...new Set([...html.matchAll(/\/(?:os\/proyectos|en\/os\/projects)\/([a-z0-9-]+)\//g)].map((m) => m[1]))].slice(0, 3);
  currentGroup = `${locale} · catálogo`;
  check("catálogo con al menos 3 proyectos en el HTML", slugs.length >= 3, slugs.join());
  const [A] = slugs;

  // -- A. Carga fría y apps locales ---------------------------------------------------------------
  currentGroup = `${locale} · carga y apps`;
  let b = await launch();
  try {
    await b.goto(base + ctx.os);
    ctx.hist = (await observe(b)).hist; ctx.mark = b.rsc.length;
    await verify(b, "carga fría /os/", { url: ctx.os, wins: ["welcome*"], rsc: 0, focus: (f) => !f.id.endsWith("-body") }, ctx);
    check("carga fría: consola limpia", b.logs.length === 0, b.logs.join(" | "));
    check("carga fría: HTML sin JS ya trae Welcome", html.includes("win-welcome"));

    ctx.mark = b.rsc.length;
    await click(b, '[data-icon="contact"]');
    await verify(b, "abrir app sin URL (Contacto)", { url: ctx.os, wins: ["welcome", "contact*"], rsc: 0, hist: "same", focus: focusInWindow("contact") }, ctx);
    ctx.mark = b.rsc.length;
    await click(b, "#win-contact .xp-caption--close");
    await verify(b, "cerrar activa (Contacto)", { url: ctx.os, wins: ["welcome*"], rsc: 0, hist: "same", focus: (f) => f.icon === "contact" }, ctx);

    // -- B. Abrir A, abrir B, apps, minimizar/cerrar la seleccionada --------------------------------
    currentGroup = `${locale} · push/replace`;
    ctx.mark = b.rsc.length;
    const via = await openProject(b, ctx, A);
    check(`apertura de A vía ${via} (galería)`, via === "ui");
    await verify(b, "abrir A", { url: ctx.proj(A), wins: ["welcome", `project:${A}*`], rsc: 1, hist: "+1", focus: focusOnBody(`project:${A}`) }, ctx);
    ctx.mark = b.rsc.length;
    await click(b, '[data-icon="contact"]');
    await verify(b, "abrir Contacto con A seleccionada (URL sigue en A)", { url: ctx.proj(A), wins: ["welcome", `project:${A}`, "contact*"], rsc: 0, hist: "same" }, ctx);
    ctx.mark = b.rsc.length;
    await click(b, `[data-task="project:${A}"]`);
    await b.ev(`document.getElementById("win-project:${A}-body").focus(), true`); // el clic sintético no mueve el foco
    await click(b, `#win-project\\:${A} .xp-caption--min`);
    await verify(b, "minimizar A seleccionada (replace a /os/)", { url: ctx.os, wins: ["welcome", `project:${A}(min)`, "contact*"], rsc: 1, hist: "same", focus: (f) => f.task === `project:${A}` }, ctx);
    ctx.mark = b.rsc.length;
    await click(b, `[data-task="project:${A}"]`);
    await verify(b, "restaurar A desde la barra (push)", { url: ctx.proj(A), wins: ["welcome", `project:${A}*`, "contact"], rsc: 1, hist: "+1", focus: focusOnBody(`project:${A}`) }, ctx);
    ctx.mark = b.rsc.length;
    await click(b, `#win-project\\:${A} .xp-caption--close`);
    await verify(b, "cerrar A seleccionada (replace a /os/)", { url: ctx.os, wins: ["welcome", "contact*"], rsc: 1, hist: "same" }, ctx);
    check("push/replace: consola limpia", b.logs.length === 0, b.logs.join(" | "));
  } finally { await b.close(); }

  // -- C. Secuencia de §1.3: Atrás/Adelante, y recarga en cada paso ------------------------------------
  currentGroup = `${locale} · Atrás/Adelante`;
  b = await launch();
  try {
    await b.goto(base + ctx.os);
    ctx.hist = (await observe(b)).hist; ctx.mark = b.rsc.length;
    await sequence(b, ctx, slugs, 7, false);
    check("Atrás/Adelante: consola limpia", b.logs.length === 0, b.logs.join(" | "));
  } finally { await b.close(); }

  currentGroup = `${locale} · recarga en cada paso`;
  for (let k = 1; k <= 7; k++) {
    b = await launch();
    try {
      await b.goto(base + ctx.os);
      ctx.hist = (await observe(b)).hist; ctx.mark = b.rsc.length;
      await sequence(b, ctx, slugs, k, true);
    } finally { await b.close(); }
  }

  // -- D. Deep link, salir del SO y volver con Atrás -------------------------------------------------
  currentGroup = `${locale} · deep link y salida`;
  b = await launch();
  try {
    await b.goto(base + ctx.proj(A));
    ctx.hist = (await observe(b)).hist; ctx.mark = b.rsc.length;
    const raw = await (await fetch(base + ctx.proj(A))).text();
    check("deep link: la ventana del proyecto está en el HTML inicial", raw.includes(`win-project:${A}`) || raw.includes(`win-project%3A${A}`));
    await verify(b, "deep link", { url: ctx.proj(A), wins: [`project:${A}*`], rsc: 0, focus: focusOnBody(`project:${A}`) }, ctx);
    check("deep link: consola limpia (sin error de hidratación)", b.logs.length === 0, b.logs.join(" | "));
    await click(b, `.xp-start a[href="${ctx.home}"]`);
    check("salir del SO: llega a la web", await b.until(`location.pathname === ${JSON.stringify(ctx.home)}`));
    await sleep(900);
    check("salir del SO: ya no hay shell", await b.ev("!document.querySelector('.os-root')"));
    b.logs.length = 0; ctx.mark = b.rsc.length;
    await back(b);
    check("volver con Atrás: URL del proyecto", await b.until(`location.pathname === ${JSON.stringify(ctx.proj(A))} && !!document.querySelector('.xp-window')`));
    await verify(b, "volver con Atrás", { url: ctx.proj(A), wins: [`project:${A}*`] }, ctx);
    check("volver con Atrás: consola limpia", b.logs.length === 0, b.logs.join(" | "));
    check("volver con Atrás: peticiones RSC", true, `(informativo) ${rscCount(b, 0)} en total`);
  } finally { await b.close(); }

  // -- E. Cambio de idioma desde la barra de tareas ----------------------------------------------------
  currentGroup = `${locale} · cambio de idioma`;
  b = await launch();
  try {
    await b.goto(base + ctx.proj(A));
    ctx.hist = (await observe(b)).hist; ctx.mark = b.rsc.length;
    const href = await b.ev("document.querySelector('.xp-tray a[hreflang]').getAttribute('href')");
    check("selector de idioma: equivalencia del proyecto", href === ctx.otherProj(A), href);
    await click(b, ".xp-tray a[hreflang]");
    check("cambio de idioma: URL equivalente", await b.until(`location.pathname === ${JSON.stringify(ctx.otherProj(A))} && !!document.querySelector('.xp-window')`));
    await sleep(900);
    const other = locale === "es" ? "en" : "es";
    await verify(b, "tras cambiar de idioma", { url: ctx.otherProj(A), wins: [`project:${A}*`] }, { ...ctx, locale: other, proj: ctx.otherProj });
    await click(b, ".xp-tray a[hreflang]");
    check("cambio de idioma: de vuelta", await b.until(`location.pathname === ${JSON.stringify(ctx.proj(A))} && !!document.querySelector('.xp-window')`));
    await sleep(500);
    check("cambio de idioma: consola limpia", b.logs.length === 0, b.logs.join(" | "));
    // Escritorio: equivalencia de /os/
    await b.goto(base + ctx.os);
    check("selector de idioma: equivalencia de /os/", (await b.ev("document.querySelector('.xp-tray a[hreflang]').getAttribute('href')")) === ctx.otherOs);
  } finally { await b.close(); }

  // -- C2. URLs repetidas: /os/ -> A -> B -> minimizar A -> restaurar A -------------------------------------------
  currentGroup = `${locale} · URLs repetidas`;
  const [, B, C] = slugs;
  const wA = `project:${A}`, wB = `project:${B}`, wC = `project:${C}`;
  const stepper = (b) => async (label, run, exp) => { ctx.mark = b.rsc.length; await run(); return verify(b, label, exp, ctx); };
  b = await launch();
  try {
    await b.goto(base + ctx.os);
    ctx.hist = (await observe(b)).hist; ctx.mark = b.rsc.length;
    const step = stepper(b);
    await step("abrir A", () => openProject(b, ctx, A), { url: ctx.proj(A), wins: ["welcome", `${wA}*`], rsc: 1, hist: "+1" });
    await step("abrir B", () => openProject(b, ctx, B), { url: ctx.proj(B), wins: ["welcome", wA, `${wB}*`], rsc: 1, hist: "+1" });
    await step("minimizar A (B seleccionada: sin historial)", () => click(b, `#win-project\\:${A} .xp-caption--min`), { url: ctx.proj(B), wins: ["welcome", `${wA}(min)`, `${wB}*`], rsc: 0, hist: "same" });
    await step("restaurar A desde la barra (push con URL repetida)", () => click(b, `[data-task="${wA}"]`), { url: ctx.proj(A), wins: ["welcome", `${wA}*`, wB], rsc: 1, hist: "+1" });
    await step("Atrás -> B (vecino inequívoco)", () => back(b), { url: ctx.proj(B), wins: ["welcome", wA, `${wB}*`], rsc: 0 });
    await step("Atrás -> A (URL repetida = ambigua: fallback, B no se cierra)", () => back(b), { url: ctx.proj(A), wins: ["welcome", `${wA}*`, wB], rsc: 0 });
    await step("Atrás -> /os/ (fallback: cierra solo la seleccionada)", () => back(b), { url: ctx.os, wins: ["welcome", `${wB}*`], rsc: 0 });
    check("URLs repetidas: consola limpia", b.logs.length === 0, b.logs.join(" | "));
  } finally { await b.close(); }

  // -- C3. Salto de varias entradas ---------------------------------------------------------------------------
  currentGroup = `${locale} · salto de entradas`;
  b = await launch();
  try {
    await b.goto(base + ctx.os);
    ctx.hist = (await observe(b)).hist; ctx.mark = b.rsc.length;
    const step = stepper(b);
    await step("abrir A", () => openProject(b, ctx, A), { url: ctx.proj(A), wins: ["welcome", `${wA}*`], rsc: 1, hist: "+1" });
    await step("abrir B", () => openProject(b, ctx, B), { url: ctx.proj(B), wins: ["welcome", wA, `${wB}*`], rsc: 1, hist: "+1" });
    await step("history.go(-2) -> /os/ (fallback por URL)", () => b.ev("history.go(-2), true"), { url: ctx.os, wins: ["welcome", `${wA}*`], rsc: 0 });
    await step("history.go(2) -> B (reabre B por URL)", () => b.ev("history.go(2), true"), { url: ctx.proj(B), wins: ["welcome", wA, `${wB}*`], rsc: 0 });
    await step("history.go(-1) -> A", () => b.ev("history.go(-1), true"), { url: ctx.proj(A), wins: ["welcome", `${wA}*`, wB], rsc: 0 });
    await step("abrir C tras el salto (push, alineado)", () => openProject(b, ctx, C), { url: ctx.proj(C), wins: ["welcome", wA, wB, `${wC}*`], rsc: 1 });
    await step("Atrás desde C -> A (se deshace C)", () => back(b), { url: ctx.proj(A), wins: ["welcome", `${wA}*`, wB], rsc: 0 });
    check("salto de entradas: consola limpia", b.logs.length === 0, b.logs.join(" | "));
  } finally { await b.close(); }

  // -- C4. Latencia: Next descarta una navegación pendiente si llega otra ---------------------------------------
  currentGroup = `${locale} · latencia`;
  for (const [first, second] of [[A, B], [B, A]]) {
    const wf = `project:${first}`, ws = `project:${second}`;
    b = await launch();
    try {
      await b.goto(base + ctx.os);
      // Calienta el chunk de la galería para que abrir proyectos no dependa de la red estrangulada.
      await click(b, '[data-icon="projects"]');
      await b.until("!!document.querySelector('#win-projects [data-slug]')", 10000);
      await click(b, "#win-projects .xp-caption--close");
      await sleep(500);
      ctx.hist = (await observe(b)).hist; ctx.mark = b.rsc.length;
      const h0 = ctx.hist;
      await b.send("Network.emulateNetworkConditions", { offline: false, latency: 2500, downloadThroughput: -1, uploadThroughput: -1 });
      await openProject(b, ctx, first);
      await openProject(b, ctx, second);
      await verify(b, `latencia ${first}->${second}: antes de confirmar (optimista)`, { url: ctx.os, wins: ["welcome", wf, `${ws}*`], details: false }, ctx);
      check(`latencia ${first}->${second}: Next confirma la ruta de la última`, await b.until(`location.pathname === ${JSON.stringify(ctx.proj(second))}`, 40000));
      await b.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      const after = await verify(b, `latencia ${first}->${second}: tras confirmar`, { url: ctx.proj(second), wins: ["welcome", wf, `${ws}*`] }, ctx);
      check(`latencia ${first}->${second}: entradas nuevas (1 si Next descarta la primera, 2 si no)`, after.hist - h0 >= 1 && after.hist - h0 <= 2, `${h0} -> ${after.hist}`);
      const stepL = stepper(b);
      await stepL(`latencia ${first}->${second}: Atrás deshace las dos aperturas`, () => back(b), { url: ctx.os, wins: ["welcome*"], rsc: 0 });
      await stepL(`latencia ${first}->${second}: Adelante reabre la de la entrada`, () => forward(b), { url: ctx.proj(second), wins: ["welcome", `${ws}*`], rsc: 0 });
      check(`latencia ${first}->${second}: consola limpia`, b.logs.length === 0, b.logs.join(" | "));
    } finally { await b.close(); }
  }

  b = await launch();
  try {
    await b.goto(base + ctx.os);
    await click(b, '[data-icon="projects"]');
    await b.until("!!document.querySelector('#win-projects [data-slug]')", 10000);
    await click(b, "#win-projects .xp-caption--close");
    await sleep(500);
    ctx.hist = (await observe(b)).hist; ctx.mark = b.rsc.length;
    await b.send("Network.emulateNetworkConditions", { offline: false, latency: 2500, downloadThroughput: -1, uploadThroughput: -1 });
    await openProject(b, ctx, A);
    await click(b, `#win-project\\:${A} .xp-caption--min`); // sustituye la navegación pendiente por replace a /os/
    check("latencia: abrir y minimizar A antes de confirmar: la URL se queda en /os/", await b.until(`location.pathname === ${JSON.stringify(ctx.os)}`, 5000));
    await sleep(7000); // el push de A, si siguiera en vuelo, ya habría llegado
    await b.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await verify(b, "latencia: push de A cancelado por minimizar", { url: ctx.os, wins: ["welcome*", `${wA}(min)`], hist: "same", details: false }, ctx);
    check("latencia: consola limpia", b.logs.length === 0, b.logs.join(" | "));
  } finally { await b.close(); }

  // -- F. Entrada directa sin barra, slug no autorizado ----------------------------------------------------
  currentGroup = `${locale} · redirecciones y 404`;
  for (const path of [ctx.os.slice(0, -1), ctx.proj(A).slice(0, -1)]) {
    const res = await fetch(base + path, { redirect: "manual" });
    const loc = res.headers.get("location") ?? "";
    check(`${path} sin barra -> 308 a la URL con barra`, res.status === 308 && (loc === path + "/" || loc === base + path + "/"), `${res.status} ${loc}`);
  }
  const bad = locale === "es" ? "/os/proyectos/no-autorizado/" : "/en/os/projects/no-autorizado/";
  const res = await fetch(base + bad);
  const page = await res.text();
  check(`${bad} -> 404`, res.status === 404, String(res.status));
  check(`${bad} -> noindex y sin canonical`, /noindex/.test(page) && !/rel="canonical"/.test(page));
}

// --- Principal ------------------------------------------------------------------------------------------------

try {
  if (serve) await startServer();
  await runLocale("es");
  await runLocale("en");
} catch (error) {
  failures.push(`Excepción: ${error?.stack ?? error}`);
} finally {
  stopServer();
}

const groups = new Map();
for (const row of matrix) {
  const g = groups.get(row.group) ?? { ok: 0, fail: 0 };
  if (row.ok) g.ok++; else g.fail++;
  groups.set(row.group, g);
}
console.log("\nMatriz de resultados (grupo: correctas / fallidas)");
for (const [group, g] of groups) console.log(`  ${g.fail === 0 ? "OK  " : "FAIL"} ${group}: ${g.ok} / ${g.fail}`);
console.log(`\nTotal: ${matrix.filter((r) => r.ok).length} correctas, ${failures.length} fallidas.`);
if (failures.length) { console.log("\nFallos:"); for (const f of failures) console.log(`  - ${f}`); process.exit(1); }
