import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// plugins we'll add
import svgr from 'vite-plugin-svgr'
import glsl from 'vite-plugin-glsl'
import checker from 'vite-plugin-checker'
import AutoImport from 'unplugin-auto-import/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { setupPlugins as responsiveSetupPlugins } from '@responsive-image/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    svgr(),
    glsl(),
    checker({ typescript: true }),
    AutoImport({ imports: ['react'], dts: 'src/auto-imports.d.ts' }),
    // responsive image plugin will generate responsive variants and LQIP placeholders
    ...responsiveSetupPlugins({
      // only process image files (prevent plugin from trying to process HTML or other assets)
      include: ['**/*.{png,jpg,jpeg,webp,avif,svg}']
      // keep other default config; customize in future if needed
    })
  ],
  optimizeDeps: {
    // Ensure Vite prebundles the Rapier compat module once so static and
    // dynamic imports resolve to the same instance (avoids duplicate module
    // closures where `init` runs in one and `EventQueue` is created in another).
    include: ['@dimforge/rapier3d-compat']
  },
  server: {
    port: 5173
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three')) return 'vendor_three'
            if (id.includes('@react-three')) return 'vendor_r3'
            if (id.includes('@react-three/rapier') || id.includes('rapier')) return 'vendor_rapier'
            if (id.includes('miniplex')) return 'vendor_miniplex'
            return 'vendor'
          }
        }
      },
      plugins: [visualizer({ filename: 'dist/stats.html', open: false })]
    }
  }
})
