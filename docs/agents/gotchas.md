# Gotchas

Short, learned lessons. Append new ones.

- **Instanced colours:** instanced meshes use `setColorAt` with `vertexColors: true`. The geometry
  needs an all-white `color` attribute (`ensureGeometryHasVertexColors` in
  `src/visuals/instanceColorUtils.ts`), or instances render black. `instanceColor` is
  created lazily. Initialise the slots once, and set `material.needsUpdate = true` if it
  appears after the first shader compile.
- **Rapier types:** `@dimforge/rapier3d-compat` and the copy bundled with
  `@react-three/rapier` can disagree on types, so some call sites need assertions.
  The Vite alias keeps one runtime copy.
- **Best-of scans:** use a linear `findBestEntity`-style scan instead of
  `sort(...)[0]`, which is O(n log n) and allocates.
- **Keyboard shortcuts:** ignore `e.repeat` for toggles, and skip events whose target is an input.
- **Slow devices:** each frame runs at most 5 fixed steps, so on slow GPUs the sim runs
  slower than real time. CI's software GL is slow too.
- **Telemetry store:** see [architecture.md](architecture.md). Subscribing to `events` causes renders on every event.
