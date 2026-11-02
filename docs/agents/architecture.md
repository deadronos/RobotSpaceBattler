# Architecture and code map

## `src/`

| Path                  | What lives there                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `main.tsx`, `App.tsx` | Entry points and app shell                                                                                                          |
| `ecs/`                | Miniplex world (`world.ts`), systems (`systems/`: ai, combat, movement, projectile, effect, spawn), pools                           |
| `runtime/`            | `simulation/battleRunner.ts` (fixed-step loop), `state/matchStateMachine.ts`, telemetry adapter                                     |
| `simulation/`         | Game rules: `ai/` (decision, targeting, pathfinding, coordination), `combat/`, `environment/`, `match/`, `obstacles/`               |
| `components/`         | r3f scene, robots, VFX, HUD (`ui/`), debug tools                                                                                    |
| `visuals/`            | Instancing helpers, lighting, post-processing, dynamic resolution, debug overlays, `arena/` (static arena layout + merged geometry) |
| `state/`              | Zustand stores (telemetry, quality)                                                                                                 |
| `lib/`                | Math, seeded RNG, constants, fixed stepper, team config                                                                             |
| `ui/`                 | Fixture loader and inspector                                                                                                        |

## Simulation owns state; rendering projects it

- `BattleRunner` steps the ECS at a fixed 60 Hz (at most 5 substeps per frame at 1×)
  using sim time. The speed control (#170) feeds the accumulator `frameDelta × speed`
  and scales the substep budget with the speed (5 × speed, so 4× can take 20 steps).
  The step length never changes, so a seed produces the same digest at 0.5×, 1×, 2×
  and 4×; a slow machine just runs in slow motion.
- Only the `running` phase advances the world (#225). While paused (and in the victory
  phase) `world.state.elapsedMs`, obstacle movement, hazards and the sim tick counter
  `world.state.frameIndex` all freeze. A pause therefore cannot leak sim time into AI
  timers (engage memory, roam refresh), hazard windows, obstacle movement or
  `lastDamageTimestamp` hit flashes, and pause → resume replays the seed identically.
  `world.state.frameIndex` counts simulation steps, not render frames, so it is not a
  "match is paused" indicator either. The victory auto-restart countdown in
  `matchStateMachine.tick` keeps ticking while the world is frozen; it follows the
  simulation speed, because `tick` runs once per fixed step.
- The ECS is the single owner of robot positions. There is no physics engine (#184).
  Line-of-sight and movement blocking use 2D segment tests in
  `src/simulation/environment/`: `staticOcclusionIndex.ts` indexes the arena walls and
  pillars by cell, and `arenaGeometry.ts` adds the live obstacle list.
- React does not re-render per frame. `matchStateMachine` notifies only on phase changes,
  resets and countdown seconds. `Simulation` is `React.memo`.
- Robots are projected from the ECS into instance buffers, not React elements
  (#168, `src/components/robots/RobotInstances.tsx`):
  - One `InstancedMesh` per role (`assault`, `tank`, `sniper`, `medic`), each a
    merged body+head geometry, so a role costs one draw call in the main pass and
    one in the shadow pass. Adding or removing robots never changes the count:
    `count` stays at capacity and unused instances are hidden.
  - One shared `MeshStandardMaterial` for every role. The team colour is an
    instance attribute (`setColorAt`); the head is baked brighter in the
    geometry's colour attribute, so proportions and head shape identify the role
    while the team colour stays readable.
  - `src/visuals/robots/robotInstanceBuffer.ts` fills dense per-role slot buffers
    allocation-free; `robotTransform.ts` writes each matrix from ECS state.
- `RobotHealthBars` (2 draw calls total) billboards a background and a fill quad
  per living robot from `health` / `maxHealth`. Dead robots leave the list, so
  bars disappear with them. Pure mapping lives in
  `src/visuals/robots/healthBarLogic.ts`.
- `InstancedFlashes` (1 draw call) renders the hit flash on a damaged robot and
  the muzzle flash at a firing robot. Triggers come from fields the simulation
  already maintains (`lastDamageTimestamp`, `fireCooldown`/`fireRate`), so no
  simulation state was added for visuals; slots are allocated through the
  `flashes` category of `VisualInstanceManager`. See
  `src/visuals/robots/robotFeedback.ts`.
- `ObstacleVisual` still copies ECS positions onto refs in `useFrame`. Geometries
  and materials are shared at module level.
- `TeamMarkers` (2 draw calls) billboards a per-team shape badge above each
  health bar: a pyramid for red, a ring for blue. Two instanced meshes total,
  re-projected from ECS positions every frame; see
  `src/visuals/robots/teamMarkers.ts`. This keeps team identity readable without
  relying on hue (#166).
- `useEntityList` re-renders a layer only when entities are added or removed.
- The HUD reads mutable ECS and telemetry data on a ~4 Hz tick (`useHudTick`).
- Telemetry store (`state/telemetryStore.ts`) is append-only and mutated in place (#207).
  Never subscribe to `events`, `robots` or `teamTotals`; subscribe to `eventCount` or read with `getState()`.

## Match end, summary and series (#170)

- `matchStateMachine` owns the victory phase, the auto-restart switch
  (`autoRestartEnabled` in the snapshot, `setAutoRestartEnabled()`) and the restart
  countdown. With auto-restart off the match stays frozen in the victory phase and
  `restartTimerMs` is null.
- The post-match summary is runtime state: `useMatchSummaryTracker`
  (`runtime/state/useMatchSummary.ts`) snapshots telemetry and the ECS robot roles once
  per victory and keeps the `seriesScore` counter in React. Neither is written into the
  ECS, the telemetry store or the RNG, so the simulation and the parity goldens are
  unaffected.
- The state machine re-emits during the victory phase (countdown seconds, toggles), so
  the tracker records each round once and resets its guard when the phase leaves victory.
- UI: `components/ui/MatchEndOverlay.tsx` (result, series, auto-restart toggle),
  `MatchSummaryModal.tsx` (per team/role/robot stats, MVP, duration) on the shared
  `Modal`, and `SimSpeedControl.tsx` for 0.5×/1×/2×/4×.

## Pathfinding (`simulation/ai/pathfinding/`)

- `navmesh/`: arena geometry → walkable polygons, generated in arena coordinates.
- `search/`: A* (`AStarSearch`), LRU `PathCache`, nearest accessible point.
- `smoothing/`: funnel (`StringPuller`) and `PathOptimizer`.
- `integration/`: `PathfindingSystem` orchestrates requests, results and telemetry.
- `worker/`: module worker that runs path searches off the main thread.
- `coordination/BehaviorBlender.ts` blends retreat, combat and path-following.
- Budgets: path P95 < 5 ms, system < 16 ms for 20 robots.
- Debug overlays: `visuals/debug/NavMeshDebugger.tsx`, `PathDebugger.tsx`.
  More in [pathfinding-quickstart.md](../pathfinding-quickstart.md).

## Rendering notes

- The static arena is merged into 6 draw calls (#229): see
  `visuals/arena/arenaConfig.ts` for the layout data, `arenaGeometry.ts` for the
  merge and `components/SpaceStation/ArenaMeshes.tsx` for the meshes and the one
  neon pulse `useFrame`. Add walls, pillars or lamp panels to the config arrays,
  never as a component per object.
- Scene lighting is data in `visuals/lightRig.ts`: ambient, hemisphere, the one
  shadow-casting directional, a fill directional and two coloured key spots
  (#230). That is the whole budget (6). Lamp panels, neon strips and hover
  beacons are emissive + bloom instead of getting a light each; measured, the
  15 deleted point lights changed the frame by 0.25/255 per channel.
- Instanced projectiles, lasers and effects use per-instance colour. See [gotchas.md](gotchas.md)
  and [technical/instancing.md](../technical/instancing.md).
- Scale: 1 world unit = 1 metre.
- Performance background: [r3f-performance.md](../r3f-performance.md).

## Accessibility (#166)

Rendering-only; none of this touches ECS or simulation state.

- **Dialogs:** every modal is built on `components/ui/Modal.tsx`, which sets
  `role="dialog"`, `aria-modal="true"`, an `aria-labelledby` title, traps Tab and
  Shift+Tab, closes on Escape and restores focus to the opener. `SettingsModal`
  and `BattleStatsModal` only supply content.
- **Keyboard:** Space pauses/resumes, R resets the match (`App.tsx`), and the
  camera is fully keyboard-operable (`components/CameraKeyboardControls.tsx`):
  arrow keys orbit, `+`/`-` zoom, `0` resets. Camera keys are ignored while a
  form field or an open modal owns the keyboard. Camera maths and key mapping
  live in `visuals/cameraKeyboard.ts`.
- **Reduced motion:** `useAccessibilitySettings` persists two preferences and
  defaults reduced motion to `prefers-reduced-motion`. `visuals/reducedMotion.ts`
  resolves the visual budget: no post-processing composer, no hit/muzzle flash
  layer and no OrbitControls inertia. CSS animations and transitions are
  suppressed by the `prefers-reduced-motion` media query and the
  `[data-reduced-motion="true"]` root attribute. Projectiles, lasers and health
  bars stay: they carry gameplay information.
- **Team identity beyond colour:** `lib/teamPalette.ts` owns the default and
  colour-blind-safe (Okabe-Ito orange/sky blue) palettes plus the shape markers.
  Robots take their instance colour from the active palette, the HUD strength bar
  reads it through CSS custom properties, health bars carry the shape badge, and
  the HUD/list/stats panels show the marker next to the team name. Assistive
  technology gets the team name; markers are `aria-hidden` decoration.
- **Match-end UI (#170):** the overlay and summary reuse the shared `Modal` for
  focus trapping and Escape. The overlay's buttons and the speed control are
  native buttons, so they are keyboard-operable; `useAppShortcuts` ignores Space
  while a button or link is focused. Team cards, the MVP and the robot table use
  the active palette plus `TeamMarker`; the series line keeps
  `formatSeriesLine`'s exact text and adds team markers/CSS-variable colours as
  generated content, so its accessible string does not change.
- **Motion in #170 UI:** the match-end/summary transitions and the speed
  control's transitions are covered by the global reduced-motion rules (`*`
  selectors), so new components need no per-component branch.
- **Checks:** `playwright/tests/a11y.spec.ts` runs axe (`@axe-core/playwright`)
  with the WCAG 2.0/2.1 A and AA tags and fails on serious or critical
  violations. It also covers keyboard dialog open/close/focus restore, the
  preferences round trip, keyboard camera movement, the speed control, and a
  forced match end (overlay plus summary).
