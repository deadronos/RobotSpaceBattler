import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

// plugins we'll add
import svgr from "vite-plugin-svgr";
import glsl from "vite-plugin-glsl";
import checker from "vite-plugin-checker";
import AutoImport from "unplugin-auto-import/vite";
import { visualizer } from "rollup-plugin-visualizer";
import { setupPlugins as responsiveSetupPlugins } from "@responsive-image/vite-plugin";

export default defineConfig({
  // Build base for GitHub Pages (repo published at /RobotSpaceBattler/)
  base: "/RobotSpaceBattler/",
  oxc: false,
  plugins: [
    react({ tsDecorators: true }),
    svgr(),
    glsl(),
    checker({ typescript: true }),
    AutoImport({ imports: ["react"], dts: "src/auto-imports.d.ts" }),
    // responsive image plugin will generate responsive variants and LQIP placeholders
    ...responsiveSetupPlugins({
      // only process image files (prevent plugin from trying to process HTML or other assets)
      include: ["**/*.{png,jpg,jpeg,webp,avif,svg}"],
      // keep other default config; customize in future if needed
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  worker: { format: "es" },
  server: {
    port: 5173,
  },
  build: {
    // three.js alone is ~770 kB minified in one chunk, which trips Vite's
    // generic 500 kB hint. Raw size is the wrong signal here: the gzip budget in
    // scripts/bundle-budget.json is the gate (`npm run check:bundle`).
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split `node_modules` by runtime layer so no single chunk dominates and
        // a change to one layer does not invalidate the others (#159). Order
        // matters: the first matching group wins. Debug tooling and `r3f-perf`
        // are left out so they stay in their own lazy chunks at startup.
        advancedChunks: {
          groups: [
            {
              name: "react",
              test: /node_modules[\\/](react|react-dom|scheduler|use-sync-external-store)[\\/]/,
            },
            {
              name: "three",
              test: /node_modules[\\/](three|three-stdlib)[\\/]/,
            },
            {
              name: "r3f",
              // `postprocessing` / `@react-three/postprocessing` are left out:
              // they are only imported by the lazily-loaded PostProcessing
              // component, so keeping them here would put ~35 kB gzip of
              // optional visual polish into the initial load.
              test: /node_modules[\\/](@react-three(?!\/postprocessing)|its-fine)[\\/]/,
            },
          ],
        },
        plugins: [visualizer({ filename: "dist/stats.html", open: false })],
      },
    },
  },
});
