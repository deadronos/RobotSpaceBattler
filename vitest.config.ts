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
