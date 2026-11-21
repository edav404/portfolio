import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL("./", import.meta.url));

/**
 * Tests unitarios de lógica pura (DX-01). Entorno Node: no se renderizan componentes.
 * Guía: node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md
 */
export default defineConfig({
  resolve: {
    alias: [
      // Mismo alias que tsconfig.json (`@/*` → raíz del proyecto).
      { find: /^@\//, replacement: root },
      // `server-only` lanza fuera del runtime de React Server Components: en tests es un módulo vacío.
      { find: /^server-only$/, replacement: fileURLToPath(new URL("./tests/helpers/server-only.ts", import.meta.url)) },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Cada test parte de variables de entorno y mocks limpios.
    unstubEnvs: true,
    restoreMocks: true,
  },
});
