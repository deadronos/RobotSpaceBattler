# Tasks Index


## In Progress



## Pending



## New / Discovered (from code TODOs)

## Completed

- [TASK015] Performance validation & profiling - Completed on 2025-09-17; added `collectSceneMetrics` utility, tests, and checklist.
- [TASK014] Lighting setup (IBL + directional + local) - Completed on 2025-09-17; `EnvironmentLighting` preset wired into Scene.
- [TASK013] Emissive panels & flicker - Completed on 2025-09-17; panels with flicker hook integrated into layout.
- [TASK012] Modular tiles & layout - Completed on 2025-09-17; modular floor/wall/corner tiles and arena layout created.
- [TASK011] Materials utilities & textures - Completed on 2025-09-17; shared PBR material factories and placeholder textures.
- [TASK007] ProjectileSystem: add friendly-fire checks - Completed on 2025-09-17; toggle exposed in UI and Vitest coverage added.
- [TASK008] ProjectileSystem: sourceId wiring from weapon - Completed on 2025-09-17; rocket projectile spawns now source the resolved owner id and regression test added.
- [TASK009] Simulation: FX system scaffold - Completed on 2025-09-17; added event-driven `FxSystem`, `FXLayer` renderer, `showFx` flag, and unit test.
- [TASK001] Bootstrap memory bank files - Created initial `memory-bank` files and tasks.
- [TASK002] Add deterministic RNG helper - Completed on 2025-09-15.
- [TASK003] Add unit tests for physics sync - Added tests for `syncRigidBodiesToECS` and marked complete.
        - Also added projectile cleanup tests (tests/projectileCleanup.test.ts).
- [TASK004] Fix Playwright dev server port mismatch - Resolved locally by leveraging Playwright's configured webServer (starts Vite on 5174) and verifying `playwright/tests/smoke.spec.ts` passed locally. Note: Vite default remains 5173 for local `npm run dev`.

## Later

- [TASK006] Unified weapons ECS - Systems integrated; documenting usage & perf follow-up.

- [TASK010] Projectile pooling & performance profiling - Investigate projectile allocation/GC pressure and add pooling or reuse if needed. Acceptance: identified perf hotspot and proposed mitigation (pool or reuse) with simple benchmark.
