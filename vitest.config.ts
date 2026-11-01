import path from "node:path";
import { defineConfig } from "vitest/config";

// Pure-simulation tests run in the node environment. Anything that needs the
// DOM (React components, hooks, canvas/WebGL mocks) lives in the jsdom project.
const DOM_TESTS = [
  "tests/**/*.{test,spec}.tsx",
  "src/**/*.{test,spec}.tsx",
  "tests/ui/**/*.{test,spec}.ts",
  "tests/visuals/**/*.{test,spec}.ts",
  "tests/state/quality/qualityDefaults.test.ts", // reads window.devicePixelRatio
];

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    globals: true,
    exclude: ["node_modules/**", "dist/**", "playwright/**"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      reporter: ["text-summary", "text"],
      // Measured (all src): stmts 70.11, branches 62.12, funcs 57.94, lines
      // 70.95. Global floors are floor(measured) - 1; per-file floors for the
      // simulation core are floor(measured) - 2. `battleRunner.ts` dropped from
      // 89.5 to 84.61 branch % in #184 because the deleted Rapier accessors were
      // covered; the remaining gap is the `?? generateSeed()` fallback, which is
      // deliberately not exercised.
      thresholds: {
        statements: 64,
        branches: 57,
        functions: 56,
        lines: 65,
        "src/ecs/systems/combatSystem.ts": {
          statements: 96,
          branches: 94,
          functions: 98,
          lines: 96,
        },
        "src/runtime/simulation/battleRunner.ts": {
          statements: 98,
          branches: 82,
          functions: 98,
          lines: 98,
        },
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["tests/**/*.{test,spec}.ts", "src/**/*.{test,spec}.ts"],
          exclude: [
            "node_modules/**",
            "dist/**",
            "playwright/**",
            ...DOM_TESTS,
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          environment: "jsdom",
          setupFiles: "./tests/setup.ts",
          include: DOM_TESTS,
          exclude: ["node_modules/**", "dist/**", "playwright/**"],
        },
      },
    ],
  },
});
