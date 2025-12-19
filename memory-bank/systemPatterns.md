# System Patterns

**Created:** 2025-10-17

Canonical system patterns used across the repo:

- ECS-first simulation state

  - `BattleWorld` (`src/ecs/world.ts`) is the authoritative simulation state.
  - Rendering reads from ECS state; there are no per-robot Rapier rigid bodies.

- Seeded match generation

  - `BattleRunner` uses a seeded RNG (`createXorShift32`) to generate match seeds and
    deterministic per-match randomness.
  - Known exception: team spawn grids (`TEAM_CONFIGS`) are built using `Math.random()` at module
    init time, so exact spawn coordinates can vary across page reloads.

- Pure, testable systems

  - Systems accept explicit inputs (`BattleWorld`, `rng`, `deltaSeconds`, `elapsedMs`).
  - Decision logic is kept in pure functions under `src/simulation/*` where possible.


- Telemetry as the event sink

  - Runtime systems call a `TelemetryPort` to record important events:
    spawn/fire/damage/death plus obstacle/hazard events.
  - The UI consumes aggregated telemetry from the Zustand store (`src/state/telemetryStore.ts`).


- Object pooling for hot entities

  - Projectiles and effects are allocated from pools (`src/ecs/pools/*`) to reduce GC pressure.

- Quality toggles and performance instrumentation

  - `QualityManager` exposes instancing settings and obstacle debug visuals.
  - `window.__rendererStats` captures frame-level renderer stats for debugging and profiling.

Physics Scale & Collider Design (2025-12-10)

- **World Unit Scale**: 1 Rapier unit = 1 meter (1:1 scale)
- **Collider Philosophy**: All colliders sized at 99% of visual mesh dimensions for ~1cm clearance
- **Robot Constants**: `ROBOT_RADIUS = 0.891m`, `AVOIDANCE_RADIUS = 1.2m`
- **Collider Types**: Explicit colliders (CapsuleCollider, CylinderCollider, CuboidCollider) at 99% scale
- **Navigation**: AI steering begins at 1.2m, collision at ~1cm clearance

Edge cases and recommended practices

- Treat `TEAM_CONFIGS` spawn jitter as “session stable” (stable within a run, variable across reloads).
- Keep iteration and event ordering deterministic where it impacts tests (e.g., stable IDs and stable
  sorting when emitting telemetry).
- When using Rapier for raycasts, be defensive about type/instance mismatches between
  `@dimforge/rapier3d-compat` and the version bundled by `@react-three/rapier`.
