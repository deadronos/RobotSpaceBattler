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
import { resolveRapierPackageDir } from "./scripts/rapierAlias.ts";

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
  optimizeDeps: {
    // Ensure Vite prebundles the Rapier compat module once so static and
    // dynamic imports resolve to the same instance (avoids duplicate module
    // closures where `init` runs in one and `EventQueue` is created in another).
    include: ["@dimforge/rapier3d-compat", "@react-three/rapier"],
  },
  // Force all imports of the rapier compat package to resolve to a single copy of
  // the package. This avoids multiple different copies being bundled or
  // prebundled, which would create duplicate WASM runtimes. The path comes from
  // Node resolution rather than a hard-coded `node_modules` path so the config
  // also works in git worktrees, which have no `node_modules` of their own and
  // rely on resolution walking up to the parent checkout (#204).
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@dimforge/rapier3d-compat": resolveRapierPackageDir(import.meta.url),
    },
  },
  worker: { format: "es" },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        // Put all `node_modules` into a single `vendor` chunk. Finer-grained
        // splits (react/three/debug stacks) caused cross-chunk initialization
        // races (React runtime undefined) and let rolldown hoist shared deps
        // into the lazy debug chunk, which then got preloaded at startup.
        // Only the self-contained Rapier wasm package is split out, so its size
        // is visible for #159; lazy-loaded debug tooling splits on its own.
        manualChunks(id) {
          if (id.includes("/node_modules/@dimforge/rapier3d-compat/")) {
            return "rapier";
          }
          // r3f-perf is only used by the lazy perf overlay; leave it out of
          // vendor so it ships with that chunk instead of at startup.
          if (id.includes("/node_modules/r3f-perf/")) {
            return undefined;
          }
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
        plugins: [visualizer({ filename: "dist/stats.html", open: false })],
      },
    },
  },
});
