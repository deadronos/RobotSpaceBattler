# Plan: robot visuals — instancing, health bars, hit and muzzle flashes (#168)

Status: implemented on `feat/168-robot-visuals`. Rendering-only; simulation
behaviour is unchanged.

## Goal

Replace the per-robot capsule + sphere placeholders with instanced robot meshes
whose draw-call count does not grow with the roster, give each role a readable
silhouette, add a billboarded health bar per living robot, and add hit/muzzle
flash feedback through the instanced visuals path — with real-GPU numbers before
and after.

## Acceptance criteria

1. Robot body/head render through `InstancedMesh` with shared materials and team
   colour as an instance attribute; robot draw calls are constant (≤ 2 per role
   per pass, shadow pass included).
2. Roles are visually distinct by silhouette, and team colour stays readable.
3. One billboarded instanced bar per living robot tracking HP, removed on death.
4. Short hit flash on the damaged robot and muzzle flash at the firing robot,
   both instanced, with no new simulation state.
5. No repo-caused console warnings.
6. No regression in p95 frame time, uncapped fps, bundle size, AI bench or e2e.

## Measurement (step 0)

`scripts/perf/measure-visuals.js` (`npm run perf:visuals -- --label=<step>`)
builds, starts `vite preview`, opens `?debug`, waits for mid-match, and reports
M1–M7: renderer counters, draw calls versus robot count, 10 s rAF deltas with
vsync and uncapped passes, console warnings, a mid-match screenshot, bundle
gzip against the budget, and the AI bench. It follows the PR #206 method: headed
Chrome, `--use-angle=metal`, no `--enable-unsafe-swiftshader`, and
`--disable-gpu-vsync --disable-frame-rate-limit` for the uncapped pass. The GPU
string is printed, so a SwiftShader fallback cannot pass unnoticed.

## Hillclimb

One change per step, re-measured after each. M1 is the mean draw calls over 120
frames; M2 is draw calls at the full roster, half the roster and no robots.
Single-trial runs unless noted; machine noise dominates M3 (uncapped fps drifts
±10% between runs under load), so the authoritative before/after is the paired
3-trial table in the PR.

| step | change | M1 draw calls | M2 robots 20 → 10 → 0 | M4 | M6 initial gzip | kept |
| --- | --- | ---: | --- | --- | ---: | --- |
| 0 | baseline `main` `9f85b8d` | 204 | 201 → 152 → 108 | `THREE.Clock` only | 408.35 kB | — |
| 1 | instanced robots, 4 role geometries | 119 | 119 → 119 → 119 | `THREE.Clock` only | 410.04 kB | yes |
| 2 | + health bars (2 draw calls) | 121 | 121 → 120 → 118 | `THREE.Clock` only | 410.66 kB | yes |
| 3 | + hit/muzzle flashes (1 draw call) | 122 | 122 → 122 → 119 | `THREE.Clock` only | 411.25 kB | yes |
| 4 | role extras (shoulders, barrel, cross), bar size and depth, flash tuning | 122 | 121 → 121 → 119 | `THREE.Clock` only | 411.24 kB | yes |
| 5 | docs + committed harness | 122 | — | `THREE.Clock` only | 411.28 kB | yes |

M3 is left out of the per-step table on purpose: on this machine the uncapped
ceiling swings by ±10% between runs depending on load, so a single run cannot
separate a 3% change from noise. The paired 3-trial comparison below is the
authoritative frame-time result; every step was checked to be inside that noise
band before it was kept.

### Before/after, paired, 3 trials each (Apple M4, ANGLE Metal)

| build | draw calls | M2 16 → 8 → 0 robots | p95 frame ms | uncapped fps | initial gzip |
| --- | ---: | --- | ---: | ---: | ---: |
| `main` `9f85b8d` | 200.2 | 191 → 149 → 108 | 18.17 ± 0.05 | 209.3 ± 7.9 | 408.35 kB |
| this branch | 122.0 | 121 → 121 → 119 | 18.00 ± 0.45 | 203.2 ± 10.1 | 411.28 kB |

Notes:

- M2 falls to 119 at zero robots because the health-bar and flash meshes stop
  drawing when their instance counts reach zero; robot meshes stay at 4 + 4
  shadow draws regardless of roster.
- Step 1 removed 85 draw calls at the default roster and made robot draw calls
  flat; steps 2–4 add three constant draw calls for the new feedback layers.
- The uncapped fps ceiling is CPU-bound at about 200 fps on an M4 in both
  builds, so draw-call savings show up as headroom rather than a higher cap.

## Design

- `RobotInstances` (`src/components/robots/RobotInstances.tsx`): one
  `InstancedMesh` per role with a merged body+head geometry
  (`src/visuals/robots/roleVisuals.ts`), one shared `MeshStandardMaterial`, team
  colour via `setColorAt`, head vertices baked brighter in the geometry colour
  attribute. `count` stays at capacity and unused instances are hidden.
- `src/visuals/robots/robotInstanceBuffer.ts` fills dense per-role slots
  allocation-free; `robotTransform.ts` is the only place that writes ECS
  position/orientation into a matrix.
- `RobotHealthBars` (`src/components/vfx/RobotHealthBars.tsx`): two instanced
  quads (background + fill), billboarded to the camera, anchored left, fill
  scaled and coloured by `healthBarLogic.ts`. Dead robots leave the list.
- `InstancedFlashes` (`src/components/vfx/InstancedFlashes.tsx`): one additive
  instanced sphere mesh. Hit flashes come from `robot.lastDamageTimestamp`;
  muzzle flashes from `1 / fireRate - fireCooldown`. Slots are allocated in the
  new `flashes` category of `VisualInstanceManager` and released on expiry.
  No simulation state was added.
- `src/visuals/robots/robotFeedback.ts` and `healthBarLogic.ts` are pure and
  unit-tested; `roleVisuals`/`robotInstanceBuffer` have structural tests.

## Tests

- `tests/visuals/robots/robotFeedback.test.ts`: hit and muzzle trigger windows,
  spawn/never-fired guards.
- `tests/visuals/robots/healthBarLogic.test.ts`: HP → fraction/scale/colour and
  bar removal on death.
- `tests/visuals/robots/roleVisuals.test.ts`: one merged geometry per role,
  distinct silhouettes and heights, baked head brightness, shared material.
- `tests/visuals/robots/robotInstanceBuffer.test.ts`: per-role slots, reset
  between frames, capacity overflow.
- `tests/ui/robotPosition.test.ts`: ECS → instance matrix projection, and that
  the visual sources still own no physics body.

Simulation tests (`aiSystem.parity`, determinism, `team-balance`) are untouched.

## Verification

`npm run lint`, `format:check`, `typecheck`, `test`, `build`, `bundle:size`
(budget), `playwright:preview`, plus `npm run perf:visuals` before and after and
`npm run bench`.
