# Tasks Index

## In Progress

(none)

## Pending

(none)

## New / Discovered (from code TODOs)

- (none)

## Completed

- [TASK020] Refactor Projectile component: extract physics-sync & streak logic - Completed on 2025-10-04.
  - Added `useEntityPhysicsSync`, extracted `<ProjectileStreak />`, and added focused Vitest coverage.
- [TASK019] Split miniplexStore responsibilities into smaller modules - Completed on 2025-10-02.
  - Extracted `worldFactory`, `entityLookup`, `renderKey`, and `pauseVelocity` modules plus facade wiring tests.
- [TASK018] Refactor BeamSystem: owner resolution & raycasting simplification - Completed on 2025-10-03.
  - Added shared `ecsResolve` helper with unit tests and refactored BeamSystem into event/tick phases.
  - Implemented Rapier-first beam raycasting with deterministic fallback and expanded beam tick coverage.
- [TASK017] Refactor AISystem: introduce queries & perception helpers - Completed on 2025-01-16.

  - Extracted query helpers (`src/systems/ai/queries.ts`) to replace full world scans.
  - Extracted perception helpers (`src/systems/ai/perception.ts`) wrapping LOS checks.
  - Extracted pure decision functions (`src/systems/ai/decisions.ts`) for testable state machine logic.
  - Refactored AISystem to be a thin orchestrator applying decisions.
  - Added 58 comprehensive unit tests (124 total tests pass).

- [TASK015] Performance validation & profiling - Completed on 2025-09-17.

  - Added collectSceneMetrics utility, tests, and checklist.
- [TASK014] Lighting setup (IBL + directional + local) - Completed on 2025-09-17.

  - `EnvironmentLighting` preset was wired into Scene.
- [TASK013] Emissive panels & flicker - Completed on 2025-09-17.

  - Panels with a flicker hook were integrated into the layout.
- [TASK012] Modular tiles & layout - Completed on 2025-09-17.

  - Modular floor/wall/corner tiles and arena layout created.
- [TASK011] Materials utilities & textures - Completed on 2025-09-17.

  - Shared PBR material factories and placeholder textures added.
- [TASK007] ProjectileSystem: add friendly-fire checks - Completed on 2025-09-17.

  - Toggle exposed in UI and Vitest coverage added.
- [TASK008] ProjectileSystem: sourceId wiring from weapon - Completed on 2025-09-17.

  - Rocket projectiles now source the resolved owner id; regression test added.
- [TASK009] Simulation: FX system scaffold - Completed on 2025-09-17.

  - Added event-driven `FxSystem`, `FXLayer` renderer, `showFx` flag, and unit test.
- [TASK001] Bootstrap memory bank files - Created initial `memory-bank` files and tasks.
- [TASK002] Add deterministic RNG helper - Completed on 2025-09-15.
- [TASK003] Add unit tests for physics sync - Completed.

  - Added tests for `syncRigidBodiesToECS` and projectile cleanup tests (`tests/projectileCleanup.test.ts`).
- [TASK004] Fix Playwright dev server port mismatch - Completed.

  - Resolved by leveraging Playwright's configured `webServer` (starts Vite on 5174); smoke test verified locally.
- [TASK016] Refactor Simulation: extract tick driver & bootstrap - Completed on 2025-10-02.
  - Extracted fixed-step driver, bootstrap hook and pause manager.
  - Added unit tests and ran them locally (66 tests passed).

## Later

- [TASK006] Unified weapons ECS - Systems integrated; documenting usage & perf follow-up.
- [TASK010] Projectile pooling & performance profiling
  - Investigate projectile allocation/GC pressure.
  - Add pooling/reuse as needed.