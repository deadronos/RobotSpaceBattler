# Architecture and code map

## `src/`

| Path | What lives there |
|---|---|
| `main.tsx`, `App.tsx` | Entry points and app shell |
| `ecs/` | Miniplex world (`world.ts`), systems (`systems/`: ai, combat, movement, projectile, effect, spawn), pools |
| `runtime/` | `simulation/battleRunner.ts` (fixed-step loop), `state/matchStateMachine.ts`, telemetry adapter |
| `simulation/` | Game rules: `ai/` (decision, targeting, pathfinding, coordination), `combat/`, `environment/`, `match/`, `obstacles/` |
| `components/` | r3f scene, robots, VFX, HUD (`ui/`), debug tools |
| `visuals/` | Instancing helpers, lighting, post-processing, dynamic resolution, debug overlays |
| `state/` | Zustand stores (telemetry, quality) |
| `lib/` | Math, seeded RNG, constants, fixed stepper, team config |
| `ui/` | Fixture loader and inspector |

## Simulation owns state; rendering projects it

- `BattleRunner` steps the ECS at a fixed 60 Hz (at most 5 substeps per frame) using sim time.
- The ECS is the single owner of robot positions. Robots have no Rapier body.
  Rapier holds static geometry only and is used for avoidance raycasts.
- React does not re-render per frame. `matchStateMachine` notifies only on phase changes,
  resets and countdown seconds. `Simulation` is `React.memo`.
- `RobotPlaceholder` and `ObstacleVisual` copy ECS positions onto refs in `useFrame`.
  Geometries and materials are shared at module level.
- `useEntityList` re-renders a layer only when entities are added or removed.
- The HUD reads mutable ECS and telemetry data on a ~4 Hz tick (`useHudTick`).
- Telemetry store (`state/telemetryStore.ts`) is append-only and mutated in place (#207).
  Never subscribe to `events`, `robots` or `teamTotals`; subscribe to `eventCount` or read with `getState()`.

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

- Instanced projectiles, lasers and effects use per-instance colour. See [gotchas.md](gotchas.md)
  and [technical/instancing.md](../technical/instancing.md).
- Scale: 1 world unit = 1 metre.
- Performance background: [r3f-performance.md](../r3f-performance.md).
