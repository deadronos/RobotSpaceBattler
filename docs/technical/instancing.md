# Rendering Instancing Overview

This note captures the developer-facing guidance for the Weapon Diversity (005) instancing work. It supplements the feature spec and quickstart with practical details for debugging and performance investigations.

## Feature Flag & Runtime Control

- **Quality Manager flag**: `qualityManager.getSettings().visuals.instancing.enabled`
- **Environment toggle**: set `REACT_APP_VFX_INSTANCING=1` (or pass `?instancing=1` in the URL) to enable instancing on load.
- **Runtime API**: `window.__qualityManager.setInstancingEnabled(true | false)` switches modes without a reload.
- **Debug override**: legacy renderers remain available; any projectile/effect that fails to allocate an instance falls back to React components and emits `VFX:Instancing:Fallback` telemetry.

## VisualInstanceManager

The manager owns fixed-capacity pools per category (`bullets`, `rockets`, `lasers`,
`effects`, `flashes`). It exposes:

- `allocateIndex(category, entityId)` → stable instance slot or `null` (capacity exhausted)
- `releaseIndex(category, entityId)` → returns the slot to the free list
- `getIndex(category, entityId)` → introspection for React components and tests
- `reset()` → clears all allocations (used when resetting the battle world)

Telemetry events (`VFX:Instancing:Alloc/Release/Fallback`) are mirrored to `window.__rendererStats.instancingTelemetry` and the console (`console.debug`) for quick inspection.

## Static arena (#229)

- The arena layout is data in `src/visuals/arena/arenaConfig.ts` (walls,
  pillars, lamp panels, floor, neon pulse groups). Add static geometry there, not
  as a new component: `src/components/SpaceStation/ArenaMeshes.tsx` builds the
  meshes from those arrays.
- `src/visuals/arena/arenaGeometry.ts` merges them with
  `BufferGeometryUtils.mergeGeometries`: the floor, **one** solid mesh (walls,
  pillars and lamp housings, per-part colours in vertex colours) and **one mesh
  per neon pulse group**. That is 6 environment draw calls in total, and only the
  solid mesh casts a shadow (#231: the directional light in `visuals/Lighting` is
  the single shadow caster).
- Neon is unlit: `MeshBasicMaterial` with `vertexColors`, `toneMapped: false`
  and `colour × intensity` baked into the vertex colours, with the intensity kept
  above the bloom threshold (`POSTPROCESSING_PRESETS.bloomThreshold`). Do not
  convert it back to a lit `MeshStandardMaterial`/`MeshPhysicalMaterial`: a lit
  strip costs a program and loses the HDR value that feeds bloom.
- The arena has no lights of its own (#230): the scene rig lives in
  `src/visuals/lightRig.ts` (6 lights, one shadow caster) and the lamp panels,
  strips and beacons are emissive. Do not add a point light per lamp or beacon.
- The pulse is one `useFrame` in `ArenaMeshes`, scaling each pulsing group's
  material colour by `neonPulse(elapsed, flickerSpeed)` (0.8×–1.2×). A new group
  is an entry in `ARENA_NEON_GROUPS`; `flickerSpeed: 0` means no per-frame write
  at all. `NeonGeometry` (one `useFrame` and one material per strip) is gone.
- Tests: `tests/visuals/arenaGeometry.spec.ts` checks merged triangle counts,
  bounds against the config arrays and the baked vertex colours.

## Live instance counts (#233)

- Every instanced mesh draws only what is live. Densely filled layers (robots per
  role, health bars, team markers) set `count` to the live count; the sparse VFX
  pools (`bullets`, `rockets`, `effects`, `flashes`) set it to
  `highWaterCount(activeIndexes)` from `src/visuals/instanceCountWindow.ts` — the
  highest live slot + 1, because a freed slot can be re-used by a later entity and
  a hole below the top must stay a hidden instance.
- Buffers are still allocated at capacity, so slot indices stay stable and nothing
  reallocates mid-match. What changes is how many instances the GPU
  vertex-processes: the frame went from 197 028 to 16 085 triangles at a default
  roster. A layer that empties completely also drops its draw call (~34 → 22 with
  no robots on the field).
- Tests: `tests/visuals/visualInstanceManager.spec.ts` covers the high-water
  window against real allocations and releases.

## Renderer Instrumentation

- `window.__rendererStats` tracks draw calls, triangle counts, and frame times per frame.
- The instancing perf harness (`npm run perf:vfx-instancing`) builds the app, launches `vite preview`, and captures baseline vs instanced stats headlessly using Playwright.
- `npm run perf:visuals -- --label=<step>` is the real-GPU harness (#168): draw calls,
  draw calls vs robot count, rAF p95, uncapped fps, console warnings, a mid-match
  screenshot, bundle gzip and the AI bench. `--breakdown` adds the scene dump used
  by the render-cost diet (#229–#233): lights by type, meshes grouped by
  material/triangles/instances/`castShadow`, program count and the share of the
  frame inside `gl.render`. See [testing.md](../agents/testing.md).
- Telemetry from the instanced run is printed in the harness output (last ten events) to highlight exhaustion/fallback patterns.

## Pools & Object Reuse

- `ProjectilePool` and `EffectPool` pre-allocate reusable ECS objects. Simulation systems acquire from pools before spawning entities and release after removal.
- The pools reduce GC churn during heavy projectile/explosion scenarios and keep indices stable for instanced meshes.

## React Components

- `InstancedProjectiles` batches gun/rocket visuals with `InstancedMesh` and hides unused slots by teleporting them out of view.
- `LaserBatchRenderer` batches laser beams via `LineSegments` with per-beam colors.
- `InstancedEffects` batches explosion/impact spheres and scales/fades per frame.
- `InstancedFlashes` batches the hit flash and the muzzle flash (#168) in one additive
  mesh. Its two slots per robot (`hit:<id>`, `muzzle:<id>`) live in the `flashes`
  category, and they are released when the flash expires.
- `RobotInstances` draws the robots themselves: one merged body+head geometry per role,
  one shared material, team colour as an instance attribute (#168).
- `RobotHealthBars` draws a billboarded background and fill quad per living robot, two
  draw calls in total.
- Legacy components (`ProjectileVisual`, `EffectVisual`) remain active for fallback slots and when instancing is disabled.

## Debug Tips

- Inspect `window.__rendererStats` in the dev tools console to spot draw-call deltas and fallback counts.
- To stress instancing limits, temporarily lower `qualityManager.updateInstancingMaxInstances({ bullets: 8, rockets: 4, lasers: 4, effects: 12 })` and re-run the perf harness.
- Use `tests/visuals/visualInstanceManager.spec.ts` and `tests/ecs/pools.spec.ts` as references for deterministic expectations when adjusting the manager or pools.
