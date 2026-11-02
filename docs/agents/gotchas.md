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
- **Instanced counts (#168, #233):** one `InstancedMesh` per role, with body and head
  merged, keeps a role at one draw call in the main pass plus one in the shadow pass —
  a taller roster never adds draw calls. Draw only the live instances: robots, health
  bars and team markers set `count` to the live count, and the sparse VFX pools set it
  to `highWaterCount(activeIndexes)` (`src/visuals/instanceCountWindow.ts`), so hidden
  capacity is not vertex-processed (about 180k of the 197k triangles were hidden slots).
  A layer whose count reaches 0 also drops its draw call, so the count is a floor, not a
  constant; do not "fix" it back to capacity.
- **Arena geometry is data, not components (#229):** walls, pillars and lamp panels
  live in `src/visuals/arena/arenaConfig.ts` and get merged into a few meshes. A new
  wall is a config entry, not a `<mesh>`; a new neon strip is an entry in
  `ARENA_NEON_GROUPS`, not a component with its own `useFrame`. Neon must stay unlit
  with HDR vertex colours (`toneMapped: false`) or bloom stops picking it up.
- **Light budget is 6 (#230):** `src/visuals/lightRig.ts` is the whole scene rig and
  `tests/visuals/lightRig.spec.ts` enforces the cap and the single shadow caster. A new
  per-object light (a lamp, a beacon, a muzzle flash) costs every lit fragment in the
  scene; make the object emissive and let bloom do it. The deleted point lights were
  measured at 0.25/255 mean contribution, so "it needs its own light" is usually wrong.
- **Combat feedback needs no new sim state:** `robot.lastDamageTimestamp` and the
  `fireCooldown`/`fireRate` pair are enough to time a hit flash and a muzzle flash
  (#168, `src/visuals/robots/robotFeedback.ts`). Do not add effect entities or timers to
  the simulation just to draw feedback.

- **Speed must not change the step length (#170):** the speed control multiplies the
  frame delta fed to the fixed stepper and scales the substep cap (`5 × speed`). Never
  pass `dt * speed` into `step()` or into a system: `runHeadlessMatchAtSpeed` proves
  that seed 7 produces one digest at 0.5×/1×/2×/4× and under a jittery frame rate.
- **Match-end UI is runtime state only (#170):** the summary and the series score live
  in React and are built from telemetry plus the ECS robot roles at victory. Do not put
  them in the ECS, the telemetry store or the RNG, or the parity goldens and the replay
  digests change.
- **Victory re-emits:** `matchStateMachine` emits on every whole countdown second and on
  auto-restart toggles, so anything that records a finished round needs its own
  once-per-victory guard (see `useMatchSummaryTracker`).
- **Team identity is not colour:** red vs blue is not readable for every player.
  Use `lib/teamPalette.ts` (`TEAM_PALETTES`, `TEAM_MARKERS`) for team colours and
  keep a shape cue next to any new team label. Never hard-code the team hex in a
  component (#166).
- **Reduced motion covers more than CSS:** `visuals/reducedMotion.ts` decides
  whether post-processing, the flash layer and OrbitControls inertia run. Add any
  new optional visual layer to that budget instead of checking
  `prefers-reduced-motion` inline (#166).
- **Series line text is a contract:** `formatSeriesLine` output is asserted
  verbatim in tests and read by screen readers. The #166 team markers in
  `SeriesScoreLine` are CSS `::before` decoration on the team-name spans, so the
  `textContent` of `series-score`/`summary-series-score` stays identical. Do not
  put marker glyphs in the DOM there (#166, #170).
