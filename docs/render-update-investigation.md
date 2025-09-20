# Render Loop Stall Findings

RobotSpaceBattler simulation appears to continue advancing (physics, scoring, AI) while the canvas only redraws after large UI events such as window resize or toggling pause. The codebase currently relies on an on-demand render loop, so missed invalidations can make the renderer look frozen even though state mutates in the background.

## Suspected Causes

### 1. On-demand frameloop starves continuous renders
**Confidence:** 65%
- Evidence: `src/components/Scene.tsx:21` sets `<Canvas frameloop="demand">`, which means React Three Fiber will only draw when something explicitly invalidates the frame.
- Evidence: `src/components/Simulation.tsx:115-163` runs the simulation inside `useFrame` and calls `state.invalidate()` to request the next frame, but this early-returns when `paused` is true. Any unexpected pause toggle, thrown error inside the loop, or missed resume will stop all invalidations and leave Rapier running but the canvas static until an external event (resize, devtools) forces a redraw.
- Impact: Without a safety net (e.g., falling back to `frameloop="always"` while the sim is unpaused or scheduling a heartbeat invalidation), the renderer can silently stop painting even though simulation state keeps changing.

### 2. Entity mutations bypass change notifications
**Confidence:** 55%
- Evidence: `src/components/Simulation.tsx:168-173` subscribes to ECS changes and invalidates the frame when `notifyEntityChanged` fires, but several systems mutate entities without calling that helper.
- Evidence: `src/systems/BeamSystem.ts:255-261` mutates `ownerEntity.position` directly, and `src/systems/AISystem.ts:73-75` does the same for robots. Because these updates skip `notifyEntityChanged`, the subscription never invalidates the canvas, so visual updates depend solely on the main `useFrame` loop.
- Impact: When the main loop misses an invalidation (see Cause 1), the renderer has no other trigger to pick up ECS changes, so positions catch up only after big UI events.

### 3. In-place vector mutation prevents prop diffs
**Confidence:** 45%
- Evidence: `src/systems/PhysicsSyncSystem.ts:46-48` mutates the existing `entity.position` array instead of emitting a fresh reference. React props such as `position={entity.position}` (see `src/robots/robotPrefab.tsx:39-52`) are compared by reference, so even when a render happens, Three/Rapier wrappers may see the same array and skip updates.
- Impact: Combined with demand-based rendering, entities can visually "jump" only when something else (resize/pause) forces a deeper reconciliation that rebuilds props from scratch.

## Notes
- Switching to `frameloop="always"` (or temporarily enabling it whenever `paused === false`) would confirm whether the stall is strictly render-loop related.
- Auditing systems to always call `notifyEntityChanged` after mutating ECS components, or replacing in-place mutations with immutable assignments, would give React hooks more chances to invalidate and keep visuals in sync.
