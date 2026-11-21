#!/usr/bin/env node
/**
 * E2E del modo Pocket del SO (docs/arquitectura-os.md §5.4, §8 punto 9). Edge/Chrome headless con CDP,
 * sin dependencias, emulando 390x844 con toque (`Emulation.setDeviceMetricsOverride` +
 * `setTouchEmulationEnabled`) contra el build standalone.
 *
 * Uso:  node scripts/os-e2e-pocket.mjs [baseUrl] [--serve]
 *   --serve   arranca `.next/standalone/server.js` (de E2E_ROOT o de este repo) en 127.0.0.1:3121 y lo detiene.
 *             Para no pisar el standalone compartido, sirve una copia: E2E_ROOT=<copia> node scripts/... --serve
 *   Sin --serve usa un servidor ya arrancado (por defecto http://127.0.0.1:3121). Navegador: E2E_BROWSER.
 *
 * Cubre: lanzador, abrir app, Atrás/✕/Escape equivalentes, pila local, deep link de proyecto (cierra al
 * lanzador con replace, sin back()), borrador de Contacto, hoja de Inicio (inert, foco contenido y retorno),
 * rotación 390<->844 con foco dentro de una ventana, objetivos >= 44 px, axe y consola limpia.
 */
import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.env.E2E_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const serve = args.includes("--serve");
const base = (args.find((a) => a.startsWith("http")) ?? "http://127.0.0.1:3121").replace(/\/+$/, "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SLUG = "civicoin";
const MOBILE = { width: 390, height: 844 };
const WIDE = { width: 844, height: 390 };

let server = null;
async function startServer() {
  const dir = join(root, ".next", "standalone");
  if (!existsSync(join(dir, "server.js"))) throw new Error("Falta .next/standalone/server.js: ejecuta `npm run build`.");
  cpSync(join(root, "public"), join(dir, "public"), { recursive: true });
  cpSync(join(root, ".next", "static"), join(dir, ".next", "static"), { recursive: true });
  const url = new URL(base);
  server = spawn(process.execPath, ["server.js"], { cwd: dir, env: { ...process.env, PORT: url.port || "3121", HOSTNAME: url.hostname, NODE_ENV: "production" }, stdio: "ignore" });
  for (let i = 0; i < 100; i++) { try { if ((await fetch(`${base}/os/`)).ok) return; } catch { /* aún no */ } await sleep(200); }
  throw new Error("El servidor standalone no arrancó.");
}
const stopServer = () => { try { server?.kill(); } catch { /* ya detenido */ } };

function findBrowser() {
  const candidates = [process.env.E2E_BROWSER, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/microsoft-edge"].filter(Boolean);
  const found = candidates.find((c) => existsSync(c));
  if (!found) throw new Error("No hay Edge/Chrome: define E2E_BROWSER.");
  return found;
}

const KEYCODES = { Escape: 27, Tab: 9 };

async function launch() {
  const profile = mkdtempSync(join(tmpdir(), "os-pocket-"));
  const port = 9600 + Math.floor(Math.random() * 300);
  const proc = spawn(findBrowser(), ["--headless=new", "--disable-gpu", "--no-first-run", `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, "about:blank"], { stdio: "ignore" });
  let targets;
  for (let i = 0; i < 100; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(100); } }
  if (!targets) throw new Error("El navegador no abrió el puerto de depuración.");
  const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0; const pending = new Map(); const listeners = [];
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method) listeners.forEach((l) => l(m)); });
  const send = (method, params = {}) => new Promise((r, reject) => {
    const i = ++id;
    const timer = setTimeout(() => { pending.delete(i); reject(new Error(`CDP sin respuesta (${method})`)); }, 20000);
    pending.set(i, (m) => { clearTimeout(timer); r(m); });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
  const until = async (expr, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch { /* transición */ } await sleep(60); } return false; };
  const logs = [];
  listeners.push((m) => {
    if (m.method === "Runtime.consoleAPICalled" && ["error", "warning", "assert"].includes(m.params.type)) logs.push(`[console.${m.params.type}] ${m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300)}`);
    if (m.method === "Runtime.exceptionThrown") logs.push(`[exception] ${(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 300)}`);
    if (m.method === "Log.entryAdded" && ["error", "warning"].includes(m.params.entry.level)) logs.push(`[log.${m.params.entry.level}] ${m.params.entry.text.slice(0, 200)} ${m.params.entry.url ?? ""}`);
  });
  for (const domain of ["Page", "Runtime", "Log"]) await send(`${domain}.enable`);
  const viewport = async ({ width, height }) => {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 2, mobile: true });
    await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    await sleep(350);
  };
  const goto = async (url) => { await send("Page.navigate", { url }); await sleep(300); await until("document.readyState === 'complete' && !!document.querySelector('.os-desktop-icons')"); await sleep(900); };
  /** Toque real (touchStart/touchEnd) en el centro del elemento. */
  const tap = async (selector) => {
    const box = await ev(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    if (!box) throw new Error(`tap: no existe ${selector}`);
    await send("Page.bringToFront");
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x, y: box.y, id: 0 }] });
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await sleep(250);
  };
  const key = async (k, extra = {}) => {
    const base = { key: k, code: k, windowsVirtualKeyCode: KEYCODES[k] ?? 0, ...extra };
    await send("Input.dispatchKeyEvent", { type: "keyDown", ...base });
    await send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
    await sleep(250);
  };
  const close = async () => { try { ws.close(); } catch { /* cerrado */ } proc.kill(); await sleep(500); try { rmSync(profile, { recursive: true, force: true }); } catch { /* en uso */ } };
  return { ev, until, logs, send, viewport, goto, tap, key, close };
}

const matrix = []; const failures = []; let group = "";
const check = (name, cond, detail = "") => { if (process.env.E2E_VERBOSE) console.log(`${cond ? "ok  " : "FAIL"} [${group}] ${name}${cond ? "" : " " + detail}`); matrix.push({ group, name, ok: !!cond }); if (!cond) failures.push(`[${group}] ${name} ${detail}`); };

const STATE = `(() => {
  const a = document.activeElement;
  const wins = [...document.querySelectorAll('.xp-window')].filter((w) => getComputedStyle(w).display !== 'none' && !w.hidden);
  const all = [...document.querySelectorAll('.xp-window')].map((w) => w.id.replace(/^win-/, ''));
  const top = wins[wins.length - 1];
  const r = top?.getBoundingClientRect();
  const back = top?.querySelector('.xp-back');
  return JSON.stringify({
    url: location.pathname, hist: history.length, pocket: matchMedia('(max-width: 768px)').matches,
    all, shown: wins.map((w) => w.id.replace(/^win-/, '')),
    role: top?.getAttribute('role') ?? null, modal: top?.getAttribute('aria-modal') ?? null,
    rect: r ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] : null,
    backLabel: back?.getAttribute('aria-label') ?? null, backVisible: !!back && getComputedStyle(back).display !== 'none',
    focus: { id: a.id || '', icon: a.getAttribute?.('data-icon') || '', cls: a.className?.toString?.().slice(0, 40) || '', tag: a.tagName, inWin: a.closest?.('.xp-window')?.id ?? '', inStart: !!a.closest?.('.xp-start') },
    startOpen: !document.getElementById('os-start-panel')?.hidden,
    deskInert: document.getElementById('os-desktop')?.hasAttribute('inert') ?? false,
    skipInert: document.querySelector('.xp-skip-link')?.hasAttribute('inert') ?? false,
    startBtnInert: !!document.querySelector('.xp-start-button')?.closest('[inert]'),
    iconsGrid: getComputedStyle(document.querySelector('.os-desktop-icons')).display,
  });
})()`;
const state = async (b) => JSON.parse(await b.ev(STATE));

const TARGETS = `(() => {
  const out = [];
  const sel = 'button, a[href], input:not([type=hidden]):not([tabindex="-1"]), select, textarea, [role=button], [role=link]';
  for (const el of document.querySelectorAll(sel)) {
    if (el.closest('[hidden], [inert], .xp-visually-hidden') || el.classList.contains('xp-skip-link')) continue;
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    // Casillas y radios: el objetivo es su etiqueta (la casilla nativa es pequeña pero la etiqueta la activa).
    const hit = el.matches('input[type=checkbox], input[type=radio]') ? (el.closest('label') ?? el) : el;
    const r = hit.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
    if (r.right < 0 || r.left > innerWidth) continue;
    out.push({ el: (el.className?.toString?.() || el.tagName).slice(0, 50) + ' | ' + (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) });
  }
  return JSON.stringify(out.filter((t) => t.w < 43.5 || t.h < 43.5));
})()`;

const axeSource = readFileSync(join(root, "node_modules", "axe-core", "axe.min.js"), "utf8");
async function axe(b, label) {
  await sleep(700);
  await b.ev(axeSource);
  const result = JSON.parse(await b.ev(`axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] } }).then((r) => JSON.stringify(r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ') + ' :: ' + (n.any[0]?.message ?? '') + ' :: ' + n.html.slice(0, 100)) }))))`));
  check(`axe sin violaciones: ${label}`, result.length === 0, JSON.stringify(result));
}

const APPS = ["projects", "services", "about", "contact", "media", "terminal", "settings"];
const openApp = async (b, id) => { await b.tap(`[data-icon="${id}"]`); await b.until(`document.getElementById('win-${id}')?.dataset.active === 'true'`); await sleep(250); };
const openStart = async (b) => { await b.tap(".xp-start-button"); await b.until("!document.getElementById('os-start-panel').hidden"); await sleep(200); };
/** Cierra con Escape todo lo que quede abierto para partir del lanzador. */
async function toLauncher(b) {
  for (let i = 0; i < 6; i++) {
    const s = await state(b);
    if (s.startOpen) { await b.key("Escape"); continue; }
    if (s.shown.length === 0) break;
    await b.tap(".xp-window[data-active=true] .xp-back");
    const asking = await b.ev(`!!document.querySelector('[role=alertdialog]')`);
    if (asking) await b.ev(`document.querySelector('[role=alertdialog] button:last-of-type').click()`);
  }
}

async function main() {
  if (serve) await startServer();
  const b = await launch();
  try {
    await b.viewport(MOBILE);

    group = "lanzador";
    await b.goto("about:blank");
    await b.goto(`${base}/os/`);
    let s = await state(b);
    check("Pocket activo (390 px)", s.pocket);
    check("el lanzador es una rejilla", s.iconsGrid === "grid", s.iconsGrid);
    check("Welcome es la pantalla activa a pantalla completa", s.shown.length === 1 && s.rect?.[0] === 0 && s.rect?.[2] === 390, JSON.stringify(s.rect));
    check("la ventana es region sin aria-modal", s.role === "region" && s.modal === null, `${s.role} ${s.modal}`);
    check("Atrás visible y nombrado «al lanzador»", s.backVisible && /lanzador/i.test(s.backLabel ?? ""), s.backLabel);
    await axe(b, "pantalla Welcome");
    const welcomeTargets = JSON.parse(await b.ev(TARGETS));
    check("objetivos >= 44 px en Welcome", welcomeTargets.length === 0, JSON.stringify(welcomeTargets));
    await b.tap(".xp-window[data-active=true] .xp-back");
    s = await state(b);
    check("Atrás desde Welcome deja el lanzador (ninguna ventana visible)", s.shown.length === 0, JSON.stringify(s.shown));
    check("la URL sigue en /os/", s.url === "/os/");
    await axe(b, "lanzador");
    const launcherTargets = JSON.parse(await b.ev(TARGETS));
    check("objetivos >= 44 px en el lanzador y la barra", launcherTargets.length === 0, JSON.stringify(launcherTargets));

    group = "Atrás, ✕ y Escape";
    const hist0 = (await state(b)).hist;
    for (const how of ["back", "close", "escape"]) {
      await openApp(b, "about");
      s = await state(b);
      check(`[${how}] about es la pantalla activa, foco dentro`, s.shown.join() === "about" && s.focus.inWin === "win-about", JSON.stringify(s.focus));
      if (how === "back") await b.tap("#win-about .xp-back");
      else if (how === "close") await b.tap("#win-about .xp-caption--close");
      else await b.key("Escape");
      s = await state(b);
      check(`[${how}] vuelve al lanzador y cierra la ventana`, s.shown.length === 0 && !s.all.includes("about"), JSON.stringify(s.all));
      check(`[${how}] el foco vuelve al icono del lanzador`, s.focus.icon === "about", JSON.stringify(s.focus));
      check(`[${how}] sin entradas de historial`, s.hist === hist0 && s.url === "/os/", `${s.hist} ${hist0} ${s.url}`);
    }

    group = "pila local";
    await openApp(b, "about");
    await openStart(b);
    await b.tap("#os-start-panel .xp-start__left > button.xp-start__item");
    s = await state(b);
    check("elegir en la hoja la cierra", !s.startOpen);
    check("la nueva app queda sobre la pila (una sola pantalla visible)", s.shown.length === 1 && s.all.includes("about") && s.shown[0] !== "about", JSON.stringify(s));
    const top = s.shown[0];
    check("Atrás nombra la ventana inferior", /^Atrás, a /.test(s.backLabel ?? ""), s.backLabel);
    check("el foco está en la ventana nueva", s.focus.inWin === `win-${top}`, JSON.stringify(s.focus));
    await b.tap(`#win-${top} .xp-back`);
    s = await state(b);
    check("Atrás vuelve a la ventana anterior (no al lanzador)", s.shown.join() === "about" && s.focus.inWin === "win-about", JSON.stringify([s.shown, s.focus]));
    await b.key("Escape");
    s = await state(b);
    check("Escape cierra la última y vuelve al lanzador", s.shown.length === 0 && s.url === "/os/", JSON.stringify([s.shown, s.url]));
    await toLauncher(b);

    group = "Inicio como hoja";
    await openApp(b, "about");
    await openStart(b);
    s = await state(b);
    check("la hoja está abierta", s.startOpen);
    check("el fondo (escritorio y enlace de salto) queda inert", s.deskInert && s.skipInert, JSON.stringify([s.deskInert, s.skipInert]));
    check("la barra de tareas sigue operable (Inicio no inerte)", !s.startBtnInert);
    check("el foco entra en la hoja", s.focus.inStart, JSON.stringify(s.focus));
    for (let i = 0; i < 30; i++) await b.key("Tab");
    s = await state(b);
    check("Tab no saca el foco de la hoja (foco contenido)", s.focus.inStart && s.startOpen, JSON.stringify(s.focus));
    await b.key("Tab", { modifiers: 8 });
    s = await state(b);
    check("Mayús+Tab tampoco", s.focus.inStart && s.startOpen, JSON.stringify(s.focus));
    const sheetTargets = JSON.parse(await b.ev(TARGETS));
    check("objetivos >= 44 px con la hoja abierta", sheetTargets.length === 0, JSON.stringify(sheetTargets));
    await axe(b, "hoja de Inicio");
    await b.key("Escape");
    s = await state(b);
    check("Escape cierra la hoja, no la ventana", !s.startOpen && s.shown.join() === "about", JSON.stringify([s.startOpen, s.shown]));
    check("el foco vuelve al botón de Inicio y se retira inert", s.focus.cls.includes("xp-start-button") && !s.deskInert && !s.skipInert, JSON.stringify(s.focus));
    await openStart(b);
    await b.tap(".xp-start-button");
    s = await state(b);
    check("el botón de Inicio cierra la hoja y recupera el foco", !s.startOpen && s.focus.cls.includes("xp-start-button") && !s.deskInert, JSON.stringify(s.focus));
    await toLauncher(b);

    group = "deep link";
    for (const [prefix, label, seg] of [["", "ES", "proyectos"], ["/en", "EN", "projects"]]) {
      await b.goto("about:blank");
      await b.goto(`${base}${prefix}/os/${seg}/${SLUG}/`);
      s = await state(b);
      const histBefore = s.hist;
      check(`[${label}] el proyecto es la pantalla activa`, s.shown.join() === `project:${SLUG}` && s.url.endsWith(`/${SLUG}/`), JSON.stringify([s.shown, s.url]));
      check(`[${label}] foco dentro de la ventana del proyecto`, s.focus.inWin === `win-project:${SLUG}`, JSON.stringify(s.focus));
      await axe(b, `proyecto ${label}`);
      await b.tap(`[id="win-project:${SLUG}"] .xp-back`);
      await b.until(`location.pathname === '${prefix}/os/'`);
      s = await state(b);
      check(`[${label}] Atrás cierra al lanzador con replace (sin history.back)`, s.shown.length === 0 && s.url === `${prefix}/os/` && s.hist === histBefore, JSON.stringify([s.url, s.hist, histBefore]));
    }

    group = "borrador de Contacto";
    await b.goto(`${base}/os/`);
    await toLauncher(b);
    await openApp(b, "contact");
    await b.ev(`document.querySelector('#win-contact input[name=name]').focus()`);
    await b.send("Input.insertText", { text: "Ana" });
    await sleep(200);
    for (const how of ["back", "close", "escape"]) {
      if (how === "back") await b.tap("#win-contact .xp-back");
      else if (how === "close") await b.tap("#win-contact .xp-caption--close");
      else { await b.ev(`document.querySelector('#win-contact input[name=name]').focus()`); await b.key("Escape"); }
      const asking = await b.until(`!!document.querySelector('#win-contact [role=alertdialog]')`, 2000);
      s = await state(b);
      check(`[${how}] con borrador pide confirmación y no cierra`, asking && s.shown.join() === "contact", JSON.stringify(s.shown));
      if (how !== "escape") { await b.ev(`document.querySelector('#win-contact [role=alertdialog] button').click()`); await sleep(200); } // «Seguir editando»
    }
    const draft = await b.ev(`document.querySelector('#win-contact input[name=name]').value`);
    check("el borrador sigue intacto tras «Seguir editando»", draft === "Ana", draft);
    await b.ev(`document.querySelector('#win-contact [role=alertdialog] button:last-of-type').click()`); // «Cerrar y descartar»
    await sleep(300);
    s = await state(b);
    check("«Cerrar y descartar» vuelve al lanzador y devuelve el foco al icono", s.shown.length === 0 && s.focus.icon === "contact", JSON.stringify([s.shown, s.focus]));

    group = "rotación 390 <-> 844";
    await openApp(b, "about");
    await openStart(b);
    await b.tap("#os-start-panel .xp-start__left > button.xp-start__item");
    await sleep(300);
    const before = await state(b);
    await b.ev(`document.querySelector('.xp-window[data-active=true] .xp-back').focus()`);
    check("foco inicial en Atrás de la ventana activa", (await state(b)).focus.cls.includes("xp-back"));
    await b.viewport(WIDE);
    await sleep(600);
    s = await state(b);
    check("al ensanchar (844) ya no es Pocket y no se pierde ninguna ventana", !s.pocket && s.all.length === before.all.length && s.shown.length === before.all.length, JSON.stringify([s.all, s.shown]));
    check("las ventanas vuelven a ser diálogos no modales", s.role === "dialog" && s.modal === "false", `${s.role} ${s.modal}`);
    check("el foco se conserva dentro de la ventana activa", s.focus.inWin !== "" && s.focus.tag !== "BODY", JSON.stringify(s.focus));
    await b.viewport(MOBILE);
    await sleep(600);
    s = await state(b);
    check("al volver a 390 hay una sola pantalla y la misma ventana activa", s.pocket && s.shown.join() === before.shown.join() && s.all.length === before.all.length, JSON.stringify([s.shown, before.shown]));
    check("el foco sigue dentro de la ventana", s.focus.inWin !== "" && s.focus.tag !== "BODY", JSON.stringify(s.focus));
    await toLauncher(b);

    group = "objetivos y axe por app";
    for (const id of APPS) {
      await openApp(b, id);
      const small = JSON.parse(await b.ev(TARGETS));
      check(`objetivos >= 44 px en ${id}`, small.length === 0, JSON.stringify(small));
      await axe(b, `app ${id}`);
      await toLauncher(b);
    }

    group = "movimiento reducido";
    await b.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await openApp(b, "about");
    const motion = await b.ev(`(() => { const cs = getComputedStyle(document.querySelector('.xp-window[data-active=true]')); return cs.animationName + '|' + cs.transitionDuration; })()`);
    check("sin animaciones ni transiciones con prefers-reduced-motion", motion.startsWith("none|0s"), motion);
    await b.send("Emulation.setEmulatedMedia", { features: [] });

    group = "consola";
    check("sin errores ni avisos de consola", b.logs.length === 0, b.logs.join(" || "));
  } finally {
    await b.close();
    stopServer();
  }
  for (const g of [...new Set(matrix.map((m) => m.group))]) {
    const rows = matrix.filter((m) => m.group === g);
    console.log(`\n${g} (${rows.filter((r) => r.ok).length}/${rows.length})`);
    for (const r of rows) console.log(`  ${r.ok ? "OK  " : "FAIL"} ${r.name}`);
  }
  console.log(`\n${matrix.length - failures.length}/${matrix.length} comprobaciones correctas`);
  if (failures.length) { console.log("\nFallos:\n" + failures.map((f) => ` - ${f}`).join("\n")); process.exit(1); }
}

main().catch((error) => { stopServer(); console.error(error); process.exit(1); });
