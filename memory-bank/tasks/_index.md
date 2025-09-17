# Tasks Index


## In Progress



## Pending

- [TASK011] Materials utilities & textures - Create shared PBR material factories and placeholder tiling textures for metallic grey look.
- [TASK012] Modular tiles & layout - Build floor/wall/corner tiles and compose a small arena layout using shared materials.
- [TASK013] Emissive panels & flicker - Add emissive panels with lightweight flicker animation for ambient motion.
- [TASK014] Lighting setup (IBL + directional + local) - Implement environment lighting preset and wire into Scene.
- [TASK015] Performance validation & profiling - Add scene metrics utility, smoke test, and checklist for draw calls/material/texture counts.



## New / Discovered (from code TODOs)

## Completed

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