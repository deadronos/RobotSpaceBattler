# Rendering Instancing Overview

This note captures the developer-facing guidance for the Weapon Diversity (005) instancing work. It supplements the feature spec and quickstart with practical details for debugging and performance investigations.

## Feature Flag & Runtime Control

- **Quality Manager flag**: `qualityManager.getSettings().visuals.instancing.enabled`
- **Environment toggle**: set `REACT_APP_VFX_INSTANCING=1` (or pass `?instancing=1` in the URL) to enable instancing on load.
- **Runtime API**: `window.__qualityManager.setInstancingEnabled(true | false)` switches modes without a reload.
- **Debug override**: legacy renderers remain available; any projectile/effect that fails to allocate an instance falls back to React components and emits `VFX:Instancing:Fallback` telemetry.

## VisualInstanceManager

The manager owns fixed-capacity pools per category (`bullets`, `rockets`, `lasers`, `effects`). It exposes:

- `allocateIndex(category, entityId)` → stable instance slot or `null` (capacity exhausted)
- `releaseIndex(category, entityId)` → returns the slot to the free list
- `getIndex(category, entityId)` → introspection for React components and tests
- `reset()` → clears all allocations (used when resetting the battle world)

Telemetry events (`VFX:Instancing:Alloc/Release/Fallback`) are mirrored to `window.__rendererStats.instancingTelemetry` and the console (`console.debug`) for quick inspection.

## Renderer Instrumentation

- `window.__rendererStats` tracks draw calls, triangle counts, and frame times per frame.
- The instancing perf harness (`npm run perf:vfx-instancing`) builds the app, launches `vite preview`, and captures baseline vs instanced stats headlessly using Playwright.
- Telemetry from the instanced run is printed in the harness output (last ten events) to highlight exhaustion/fallback patterns.

## Pools & Object Reuse

- `ProjectilePool` and `EffectPool` pre-allocate reusable ECS objects. Simulation systems acquire from pools before spawning entities and release after removal.
- The pools reduce GC churn during heavy projectile/explosion scenarios and keep indices stable for instanced meshes.

## React Components

- `InstancedProjectiles` batches gun/rocket visuals with `InstancedMesh` and hides unused slots by teleporting them out of view.
- `LaserBatchRenderer` batches laser beams via `LineSegments` with per-beam colors.
- `InstancedEffects` batches explosion/impact spheres and scales/fades per frame.
- Legacy components (`ProjectileVisual`, `EffectVisual`) remain active for fallback slots and when instancing is disabled.

## Debug Tips

- Inspect `window.__rendererStats` in the dev tools console to spot draw-call deltas and fallback counts.
- To stress instancing limits, temporarily lower `qualityManager.updateInstancingMaxInstances({ bullets: 8, rockets: 4, lasers: 4, effects: 12 })` and re-run the perf harness.
- Use `tests/visuals/visualInstanceManager.spec.ts` and `tests/ecs/pools.spec.ts` as references for deterministic expectations when adjusting the manager or pools.
