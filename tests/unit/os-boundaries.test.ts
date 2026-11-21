import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Fronteras de `lib/os/**` (docs/arquitectura-os.md §2.3): lógica pura, sin React, sin `next/*` y
 * sin copy ni contenido pesado. Se revisa también de forma transitiva.
 */
const root = process.cwd();
const osDir = join(root, "lib", "os");
const norm = (path: string) => relative(root, path).split(sep).join("/");
const files = existsSync(osDir) ? readdirSync(osDir).filter((name) => /\.tsx?$/.test(name)).map((name) => join(osDir, name)) : [];

const forbiddenModules = ["content/ui.ts", "content/pages.ts", "content/posts.ts", "content/projects.ts"];
const forbiddenPackages = /^(react|react-dom|next|server-only)(\/|$)/;

function specifiers(file: string): string[] {
  const source = readFileSync(file, "utf8");
  const found = [...source.matchAll(/^\s*(?:import|export)\s+(?!type\b)(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']/gm)].map((m) => m[1]);
  found.push(...[...source.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]));
  found.push(...[...source.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]));
  return found;
}

function resolveLocal(from: string, specifier: string): string | null {
  const base = specifier.startsWith("@/") ? join(root, specifier.slice(2)) : specifier.startsWith(".") ? resolve(dirname(from), specifier) : null;
  if (!base) return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

describe("lib/os/** es lógica pura", () => {
  it("existen los módulos del núcleo", () => {
    const names = files.map((f) => norm(f));
    for (const name of ["window-reducer", "window-geometry", "window-url", "persistence", "prefs", "events"]) {
      expect(names, name).toContain(`lib/os/${name}.ts`);
    }
  });

  it.each(files.map((file) => [norm(file), file] as const))("%s no importa React, next/* ni copy/contenido", (_name, file) => {
    const source = readFileSync(file, "utf8");
    expect(source).not.toMatch(/^\s*["']use client["']/m);
    for (const specifier of specifiers(file)) {
      expect(specifier, `${_name}: ${specifier}`).not.toMatch(forbiddenPackages);
      const local = resolveLocal(file, specifier);
      if (local) expect(forbiddenModules, `${_name} → ${norm(local)}`).not.toContain(norm(local));
    }
  });

  it("ningún módulo alcanzable desde lib/os/** importa React ni el copy (transitivo)", () => {
    const seen = new Set<string>();
    const queue = [...files];
    while (queue.length) {
      const current = queue.pop()!;
      if (seen.has(current)) continue;
      seen.add(current);
      for (const specifier of specifiers(current)) {
        expect(specifier, `${norm(current)}: ${specifier}`).not.toMatch(forbiddenPackages);
        const local = resolveLocal(current, specifier);
        if (!local) continue;
        expect(forbiddenModules, `${norm(current)} → ${norm(local)}`).not.toContain(norm(local));
        queue.push(local);
      }
    }
    expect(seen.size).toBeGreaterThan(files.length - 1);
  });

  it("no usa APIs de DOM ni escribe history.state", () => {
    for (const file of files) {
      const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      expect(code, norm(file)).not.toMatch(/\b(document|window)\./);
      expect(code, norm(file)).not.toMatch(/history\.(pushState|replaceState|state)\b/);
    }
  });
});
