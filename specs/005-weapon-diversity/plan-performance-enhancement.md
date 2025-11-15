# Performance Enhancement Plan — Weapon Visuals & ECS

**Status**: Draft
**Owner**: Team / Maintainer
**Created**: 2025-11-16

---

## Overview

This plan addresses performance hotspots discovered in the `src/` tree related to weapon
systems, instanced visuals, and ECS loops. These hotspots cause CPU overhead, high
allocation churn, and frequent GPU buffer uploads even when instancing is enabled.

The aim is to produce short-term wins and longer-term structural improvements to
reduce frame time, reduce allocations, and improve scalability.

This plan stands on prior analysis that surfaced the top five hotspots:

- `src/ecs/systems/projectileSystem.ts` — `updateProjectileSystem` / `findTarget`
- `src/components/vfx/InstancedProjectiles.tsx` — `InstancedProjectiles` `useFrame`
- `src/components/vfx/LaserBatchRenderer.tsx` — `LaserBatchRenderer` `useFrame`
- `src/ecs/systems/aiSystem.ts` — `updateAISystem`
- `src/components/vfx/InstancedEffects.tsx` — `InstancedEffects` `useFrame`

Each of these areas is described in the analysis with suggested optimization steps.
This plan converts those suggestions into deliverable tasks and validation steps.

---

## Goals & Acceptance Criteria

1. Measurable performance improvement in representative stress scenarios
  (lots of robots, projectiles, lasers and effects).
   - Goal: Reduce average CPU frame time attributed to the top-5 hot paths by >= 25% in the target scenario.
   - Baseline: Capture a performance trace with the existing implementation and
     record the time spent in `updateProjectileSystem`, `InstancedProjectiles`
     `useFrame`, `LaserBatchRenderer` `useFrame`, `updateAISystem`, and
     `InstancedEffects`.

2. Reduce allocation churn:
   - Goal: Reduce per-frame object allocations (Vec3s / Array copies / temp objects) used by these systems.
   - Measurement: Compare allocations per frame and GC events between baseline
     and after quick wins.

3. Reduce GPU buffer upload bandwidth & calls:

   - Goal: Avoid full-buffer per-frame attribute writes and
     `instanceMatrix.needsUpdate` when unnecessary; only upload when data changed.

   - Measurement: Track `instanceMatrix`/`positionAttr`/`colorAttr` bytes uploaded
     per frame and calls to `needsUpdate`.

4. Maintain functional behavior and visual fidelity.

    - The gameplay and visuals should remain correct. Where trade-offs are made
      (e.g., lower update frequency), ensure the trade-off is acceptable via QA.

---

## Phases & Tasks

PHASE 0 — Baseline & Instrumentation (Estimate: 1–2 days)

- Objective: Establish timings and metrics so we can measure improvements.

- Tasks:

  - Add temporary dev-only instrumentation: `performance.mark`/`performance.measure`
    inside `battleRunner.step` and key systems (`updateProjectileSystem`,
    `updateAISystem`, `InstancedProjectiles.useFrame`, `InstancedEffects.useFrame`,
    `LaserBatchRenderer.useFrame`). These should be behind a `PERF_DEV` flag so
    they are not shipped to production builds.

  - Add Playwright performance harness in `playwright/tests` or a small script
    under `scripts/perf/` to gather traces (CPU & allocations) under three
    scenarios: low load, medium load, stress load.

  - Document baseline run instructions in the plan and a short `README` for the
    perf harness.

- Acceptance criteria:

  - A recorded baseline trace showing time spent by the top-5 hotspots.

  - Measured counts for active robots, projectiles, lasers, and effects for each
    scenario.

PHASE 1 — Quick Wins (Estimate: 2–4 days)

- Objective: Low-risk changes that are high-impact and easy to implement.

- Tasks & Changes:

  - Projectile System

    - Replace `projectiles = [...world.projectiles.entities]` with a stable
      iterator (no per-frame allocation). Iterate via index or entity store
      snapshot (no spread) where needed.

    - Replace `findTarget` filter+sort with a single-pass nearest neighbor check
      or limit the sort to a small candidate set.

    - Add `dirty`/`changed` flags to avoid re-evaluating target selection for
      projectiles when none of the robot positions changed within the search
      radius (or throttle to once per N frames).

    - Reuse temporary Vec3 objects with in-place vector functions
      (`scaleInPlaceVec3`, `copyVec3`), and add a small local pool for heavy
      loops.

  - InstancedProjectiles & InstancedEffects

    - Implement `dirtyIndices` sets to track changed instances and only call
      `setMatrixAt` or `setColorAt` for those indices.

    - Remove the per-frame `for (i = 0; i < capacity; i++)` hide loop. Mark an
      index as hidden on de-alloc or when it becomes inactive (once), or move
      hidden marking to the allocation lifecycle.

    - Avoid calling `dummy.updateMatrix()` if we can create matrix
      transformations directly or compute them in a compact manner.

    - Call `instanceMatrix.needsUpdate` and `instanceColor.needsUpdate` only if
      the `dirtyIndices` are non-empty.

  - LaserBatchRenderer

    - Only set `positionAttr.needsUpdate` and `colorAttr.needsUpdate` when the
      typed arrays were modified.

    - Avoid `geometry.computeBoundingSphere()` once per frame. Compute once at
      initialization and update only when beam positions change significantly,
      or set an over-sized bounding sphere for the group.

    - Check if precomputing a bounding sphere or using a static bounding box
      suffices.

  - AI System

    - Cache `robotsByTeam` / `teams` once per frame and pass that into
      per-robot logic to avoid per-robot `.filter()` calls.

    - Stagger per-robot sensor and planner updates across frames (e.g.,
      `robot ID % N`) to reduce per-frame load and maintain average update
      rate.

    - Use a spatial partition for neighbor searches (Uniform grid or quadtree)
      for sensors and target searches.

- Acceptance criteria:

  - CPU time for each changed area decreases visibly on measured traces and the
    total frame time is reduced.

  - GC allocations/objects per frame reduced.

PHASE 2 — Mid-Term Refactor (Estimate: 1–2 weeks)

- Objective: Deeper system-level changes that provide sustained improvements.

- Tasks & Changes:

  - Introduce a `SpatialIndex` (UniformGrid / Quadtree) under
    `src/ecs/spatialIndex.ts` used by projectile target acquisition and AI
    sensor queries. Provide a test suite comparing `O(N)` naive scans vs spatial
    index query latency.

  - Implement object pooling for `Vec3`/`Quaternion`/`Matrix4` instances in
    `src/lib/math/pool.ts` and update `scaleVec3`/`copyVec3` helpers to take an
    optional destination reference to reduce allocations.

  - Replace per-item `setMatrixAt` calls (that invoke an internal copy per
    call) with a bulk update strategy using `InstancedBufferAttribute` or typed
    arrays where possible. This includes computing transforms directly in typed
    arrays.

  - Implement batched attribute writes to limit `needsUpdate` calls.

  - Where applicable, implement GPU-side procedural generation for lasers or
    other beams to remove CPU-side updates entirely.

- Acceptance criteria:

  - `SpatialIndex` improves neighbor query latency significantly (measured
    speedup for nearest neighbor and range queries), and reduces CPU ms/frame
    for `findTarget` and AI sensor calls.

  - Pooling reduces allocation rates and GC frequency under stress tests.

  - InstancedBufferAttribute bulk updates reduce CPU GPU transfer times.

PHASE 3 — Optionally Offload Logic to GPU (Estimate: 1–2 weeks)

- Objective: Move animation & transform math into the shader (reduce CPU &
  memory copy operations) for some heavy visual effects (lasers, repeated
  particle effects).

- Tasks & Changes:

  - Implement shader-based beams using a single-line geometry that expands in
    the vertex shader per instance positions, or use screen-space math for
    animated effects.

  - Migrate per-instance parameters to attributes/uniforms consumed by shader
    code; reduce per-vertex attributes per instance.

- Acceptance criteria:

  - Visual fidelity is equivalent or improved with shader-based approach.

  - CPU frame time improved by at least X% compared to Phase 1/2.

PHASE 4 — Testing, Validation & CI Integration (Estimate: 1–3 days)

- Objective: Add validation harnesses and automated tests so perf regresses can be
  tracked and prevented.

- Tasks & Changes:

  - Create Playwright test scenarios for the three target scenes capturing
    traces with flags `?instancing=1` and `?activeRobots=...`.

  - Add CI job / script under `.github/workflows/perf.yml` or update existing CI
    to run a headless perf test (optional: nightly) that runs a Playwright
    trace, extracts JS main thread time and allocation counts, and fails if
    thresholds are exceeded.

  - Document test steps in `docs/` and add `README` in
    `specs/005-weapon-diversity/` with steps to reproduce locally.

- Acceptance criteria:

  - Perf CI job runs and measures perf; thresholds established (p95 frames,
    `ms/frame`, allocation count), and new PRs that cause regressions can be
    detected.

---

## Implementation Details & Developer Guidance

### Projectile System (Quick Wins)

- Replace per-frame spread copy and per-projectile sort with:

  - For each projectile: use
    `findNearestRobotWithinRadius(projectile.position, maxRadius)` via
    `SpatialIndex`, or do a linear scan that keeps `best` nearest robot (no
    `.sort`).

  - Avoid `new Vec3` inside loops: use an optional `outVec` parameter in vector
    helpers to write the result to the destination.
  - Example change:

```ts
// before
const projectiles = [...world.projectiles.entities];
projectiles.forEach((projectile) => {
  const target = findTarget(world, projectile);
});

// after
for (let i = 0; i < world.projectiles.entities.length; i++) {
  const projectile = world.projectiles.entities[i];
  // find target with nearest neighbor single pass or spatial index.
  const target = boundingSpatialIndex.findNearest(projectile.position, /*params*/);
}
```

### Instanced Visuals (Quick Wins)

- Add `inactiveIndices` and `dirtyIndices` sets inside `InstancedProjectiles` and `InstancedEffects`:

  - When an instance is created: allocate a `nextFreeIndex()` and mark it as
    used (set matrix & color once in allocation path).

  - When updating: mark index as dirty only if transform or color changed.
    Only call `setMatrixAt` / `setColorAt` for dirty ones, then set
    `instanceMatrix.needsUpdate = true` only if `dirtyIndices.size > 0`.

- Replace `dummy.updateMatrix()` with direct math where possible; avoid creating temporary `Object3D` every frame.

### LaserBatchRenderer (Quick Wins)

- Prevent `geometry.computeBoundingSphere()` on every frame:

  - Compute sphere at creation or only when positions changed significantly.
  - If no per-laser dynamic culling is present, use a static approximate
    bounding sphere.

### AI System & Movement (Refactor)

- Cache `robotsByTeam` once per frame and pass into per-robot functions.
- Add a grid or QuadTree for neighbor queries.
- Stagger updates on a per-robot basis; optionally add an `updateFrequency` to each robot.
- Replace repeated `.filter` and `.map` chains with in-place loops or reuse arrays.

### Object Pooling & Math Helpers (Refactor)

- Add `vec3Pool` and updated helpers:

  - `scaleInPlace(out, v, scalar)`, `addInPlace(out, a, b)` and
    `copyInPlace(out, a)`.

  - Replace `new Vector3()` and `vec3.copy()` on hot paths with
    `vec3Pool.get()` and `vec3Pool.release()` with careful use to ensure no
    stale references.

### Bulk Typed-Array Updates

- For instanced transforms, calculate matrix elements into `Float32Array` and
  use an `InstancedBufferAttribute` (position & quaternion is also an option)
  to update directly in a single `updateRange` or call.

---

- ## Instrumentation & Profiling Steps

- Baseline (dev):
  - Run `npm run dev` and open `http://localhost:5173/?instancing=1` in Chrome.
  - Create a robust stress scenario (set many robots & projectiles using URL
    params or debug controls).
- Capture traces:
  1. Chrome DevTools Performance > record 5–10s.
  2. Run Playwright script to gather trace: `scripts/perf/trace-playwright.js` (create if needed).
- Metrics to collect:
  - JS Main thread ms/frame and top functions by self-time.
  - Allocation count (objects & arrays) per frame and GC events.
  - GPU uploads (attribute bytes/number of `needsUpdate` calls) logged to console or via dev-only telemetry.
  - Render draw calls and memory using `renderer.info` if helpful (only in dev).

---

## Tests & Validation

- Add unit tests for `SpatialIndex` queries.
- Add functional tests (Vitest + Playwright) to ensure visuals and behavior remain consistent.
- Add perf test harness as a Playwright spec (e.g.,
  `playwright/tests/perf.weapon-stress.spec.ts`) that runs a scene and outputs
  the trace JSON.
- Add a `scripts/perf/` helper script with the following steps:

  1. Run `npm run build`.
  2. Run `npm run preview`.
  3. Run the Playwright script to capture traces and output a delta report vs.
     the baseline.

---

## PR / Release Checklist

- [ ] Code follows TypeScript style rules and linting (`npm run lint`).
- [ ] Tests updated/added (`npm run test`).
- [ ] Confirm trace captures show improvements for the target metrics.
- [ ] Code has a brief performance rationale and comments explaining
  trade-offs.
- [ ] Update `specs/005-weapon-diversity/plan-performance-enhancement.md` with
  link(s) to perf traces, artifacts, and a benchmark summary.
- [ ] Add a small demo note for maintainers to reproduce:

  `http://localhost:5173/?instancing=1&robots=256&projectiles=512&lasers=64`
  (example).

---

## Risks & Mitigation

- Visual fidelity loss due to staggered updates or reduced frequency:
  Mitigate by testing at multiple frequencies and choosing an acceptable
  balance.
- Bugs in `SpatialIndex` causing mis-targeting: Mitigate with unit tests and
  simulation tests under a variety of distributions.
- Regression in shader complexity or device compatibility: keep optional
  flags to toggle hardware-accelerated features on/off and add a fallback
  path.

---

## Timeline & Priorities

- 0–2 days: Baseline & instrumentation (PHASE 0)
- 3–6 days: Quick wins & testing (PHASE 1)
- 1–2 weeks: Mid-term refactor & spatial data structure (PHASE 2)
- 1–2 weeks: GPU offload and advanced batching (PHASE 3) — decide after 2-phase evaluation whether it’s needed.
- Ongoing: CI integration & monitoring (PHASE 4) + periodic checkups.

---

## Next Immediate Tasks (short-term order)

1. Baseline collection & instrumentation `PERF_DEV` flags (PHASE 0)
2. Implement InstancedProjectiles & InstancedEffects dirty index approach (PHASE 1)
3. Replace projectile `findTarget` sorts with a nearest neighbor scan (PHASE 1)
4. Deploy Playwright perf test & record baseline traces (PHASE 0)

---

## Notes & Resources

- Perf tools: Chrome DevTools Performance & memory allocation profiler, Playwright tracing, Node perf scripts under `scripts/perf/`
- Reference files:
  - `src/ecs/systems/projectileSystem.ts`
  - `src/components/vfx/InstancedProjectiles.tsx`
  - `src/components/vfx/InstancedEffects.tsx`
  - `src/components/vfx/LaserBatchRenderer.tsx`
  - `src/ecs/systems/aiSystem.ts`

---

## Postmortem / Follow-up

- Capture performance improvements and attach traces to this plan as artifacts
  (links to `trace.json` files or `zip`s in PRs).
- If visual or CPU regressions occur, prioritize rollback or incremental changes back to the last known good state.

---

End of plan - Draft 2025-11-16
