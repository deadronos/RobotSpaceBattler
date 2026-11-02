# Gotchas

Short, learned lessons. Append new ones.

- **Instanced colours:** instanced meshes use `setColorAt` with `vertexColors: true`. The geometry
  needs an all-white `color` attribute (`ensureGeometryHasVertexColors` in
  `src/visuals/instanceColorUtils.ts`), or instances render black. `instanceColor` is
  created lazily. Initialise the slots once, and set `material.needsUpdate = true` if it
  appears after the first shader compile.
- **No physics engine:** Rapier was removed in #184. Static geometry is tested with
  plain 2D segment tests (`src/simulation/environment/staticOcclusionIndex.ts`) and dynamic
  obstacles with `segmentIntersectsAABB`/`segmentIntersectsCircle`. Don't reintroduce a
  physics engine for line-of-sight or avoidance without reading #184 first.
- **Collider heights:** the old Rapier wall colliders started at y = 0.025 and the pillars at
  y = 0.015, so rays at robot height (y = 0) passed underneath them. Anything that tests rays
  against arena geometry must state which height it assumes.
- **Best-of scans:** use a linear `findBestEntity`-style scan instead of
  `sort(...)[0]`, which is O(n log n) and allocates.
- **Keyboard shortcuts:** ignore `e.repeat` for toggles, and skip events whose target is an input.
- **Slow devices:** each frame runs at most 5 fixed steps, so on slow GPUs the sim runs
  slower than real time. CI's software GL is slow too.
- **Telemetry store:** see [architecture.md](architecture.md). Subscribing to `events` causes renders on every event.
