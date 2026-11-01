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
  optimizeDeps: {
    // Ensure Vite prebundles the Rapier compat module once so static and
    // dynamic imports resolve to the same instance (avoids duplicate module
    // closures where `init` runs in one and `EventQueue` is created in another).
    include: ["@dimforge/rapier3d-compat", "@react-three/rapier"],
  },
  // Force all imports of the rapier compat package to resolve to the top-level
  // node_modules path. This avoids multiple different package copies being
  // bundled or prebundled which would create duplicate WASM runtimes.
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@dimforge/rapier3d-compat": path.resolve(
        import.meta.dirname,
        "node_modules",
        "@dimforge",
        "rapier3d-compat",
      ),
    },
  },
  worker: { format: "es" },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/@dimforge/rapier3d-compat/")) {
            return "rapier";
          }
          if (id.includes("/node_modules/@react-three/rapier/")) {
            return "rapier";
          }
          if (
            id.includes("/node_modules/three/") ||
            id.includes("/node_modules/@react-three/fiber/") ||
            id.includes("/node_modules/@react-three/drei/") ||
            id.includes("/node_modules/@react-three/postprocessing/") ||
            id.includes("/node_modules/postprocessing/")
          ) {
            return "three-stack";
          }
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/zustand/")
          ) {
            return "react-stack";
          }
          if (id.includes("/node_modules/r3f-perf/")) {
            return "debug-tools";
          }
          if (id.includes("/src/components/debug/")) {
            return "debug-tools";
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
