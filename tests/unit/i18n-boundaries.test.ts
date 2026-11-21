import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Fronteras de la i18n (docs/arquitectura-rutas.md §4.3, P4):
 * - ningún componente cliente importa (ni de forma transitiva) content/ui.ts, pages.ts o posts.ts:
 *   el servidor resuelve los textos y los pasa por props (un solo idioma en el bundle);
 * - las vistas, la cabecera y el pie no llevan literales de texto en el JSX (salvo marca).
 */
const root = process.cwd();
const norm = (path: string) => relative(root, path).split(sep).join("/");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "node_modules" || name.startsWith(".")) return [];
    return statSync(path).isDirectory() ? walk(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const sources = ["app", "components", "content", "lib"].flatMap((dir) => walk(join(root, dir)));

/** Resuelve un especificador `@/x` o relativo a un archivo del proyecto (o null si es un paquete). */
function resolveImport(from: string, specifier: string): string | null {
  const base = specifier.startsWith("@/") ? join(root, specifier.slice(2)) : specifier.startsWith(".") ? resolve(dirname(from), specifier) : null;
  if (!base) return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function imports(file: string): string[] {
  const source = readFileSync(file, "utf8");
  // `import type` no llega al bundle.
  const specifiers = [...source.matchAll(/^\s*(?:import|export)\s+(?!type\b)(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']/gm)].map((match) => match[1]);
  // import() dinámicos (p. ej. next/dynamic).
  specifiers.push(...[...source.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)].map((match) => match[1]));
  return specifiers.map((specifier) => resolveImport(file, specifier)).filter((path): path is string => path !== null);
}

/** Todos los módulos que alcanza un archivo, con la cadena que lleva a cada uno. */
function reachable(entry: string): Map<string, string[]> {
  const seen = new Map<string, string[]>([[entry, [norm(entry)]]]);
  const queue = [entry];
  while (queue.length) {
    const current = queue.shift()!;
    for (const next of imports(current)) {
      if (seen.has(next)) continue;
      seen.set(next, [...seen.get(current)!, norm(next)]);
      queue.push(next);
    }
  }
  return seen;
}

const clientFiles = sources.filter((file) => /^\s*["']use client["']/.test(readFileSync(file, "utf8")));
const serverOnlyCopy = ["content/ui.ts", "content/pages.ts", "content/posts.ts"];

describe("componentes cliente", () => {
  it("hay componentes cliente que revisar", () => {
    expect(clientFiles.length).toBeGreaterThan(3);
  });

  it.each(clientFiles.map((file) => [norm(file), file] as const))("%s no alcanza content/ui.ts, pages.ts ni posts.ts", (_name, file) => {
    for (const [module, chain] of reachable(file)) {
      expect(serverOnlyCopy, chain.join(" → ")).not.toContain(norm(module));
    }
  });
});

/** Fragmentos visibles permitidos en el JSX: marca y decoración (no son texto traducible). */
const allowed = new Set([
  "ED", "404", "/", "·", "✦", "“", "©",
  // Escritorio: marca, nombres propios y rótulos decorativos iguales en ambos idiomas.
  "EDAV", "EDAV BIOS", "v98.04.04", "EDAV PERSONAL COMPUTER", "EDAV Desktop", "EDAV Desktop 98", "FULL STACK", "AUTOMATION",
  "LinkedIn", "GitHub", "WEB", "CRT", "HELP", "Esc",
]);

function jsxLiterals(code: string): string[] {
  const found: string[] = [];
  // Sin comentarios de bloque ni de línea completa: pueden mencionar etiquetas (`<main>`, `<body>`).
  const source = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  // Texto justo después de una etiqueta JSX de apertura o cierre y antes de la siguiente (sin llaves).
  for (const match of source.matchAll(/(?:<[A-Za-z][\w.]*(?:\s[^<>]*)?>|<>|<\/[\w.]*>)([^<>{}]*)(?=<)/g)) {
    const text = match[1].trim();
    // Código entre un cierre de JSX y la siguiente expresión (`</h2>; … return <ul>`), no texto.
    if (/^;|\breturn$/.test(text)) continue;
    // Genéricos de TypeScript (`useRef<HTMLDivElement>(null); …`) y objetos: código, no texto.
    if (/[;=(]|,\s*\n/.test(text)) continue;
    if (text && /\p{L}/u.test(text) && !allowed.has(text)) found.push(text);
  }
  // Atributos de texto con valor literal.
  for (const match of source.matchAll(/\b(aria-label|alt|title|placeholder|label|eyebrow|copy)="([^"]*)"/g)) {
    if (/\p{L}/u.test(match[2])) found.push(`${match[1]}="${match[2]}"`);
  }
  return found;
}

// El escritorio (portada y `/en/?view=retro`) también: sus textos llegan de `ui.os` por props.
const viewFiles = [...walk(join(root, "components/views")), ...walk(join(root, "components/desktop")), ...walk(join(root, "components/shell"))]
  .concat(["header.tsx", "footer.tsx", "portfolio-experience.tsx", "contact-form.tsx", "music-widget.tsx"].map((name) => join(root, "components", name)));

describe("sin literales de texto en el JSX", () => {
  it.each(viewFiles.map((file) => [norm(file), file] as const))("%s", (_name, file) => {
    expect(jsxLiterals(readFileSync(file, "utf8"))).toEqual([]);
  });
});
