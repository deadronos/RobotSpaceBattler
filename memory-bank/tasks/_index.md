# Tasks Index


## In Progress

- [TASK006] Unified weapons ECS - Systems integrated; documenting usage & perf follow-up.

## Pending

- [TASK009] Simulation: FX system scaffold - Implement the FX/visual effects system placeholder noted in `src/components/Simulation.tsx`. Add lightweight FX system, hook into Simulation loop, provide simple particle/flash effect for hits. Acceptance: visual effects are triggered on hit events; non-blocking to game logic.

- [TASK010] Projectile pooling & performance profiling - Investigate projectile allocation/GC pressure and add pooling or reuse if needed. Acceptance: identified perf hotspot and proposed mitigation (pool or reuse) with simple benchmark.



## New / Discovered (from code TODOs)

- [TASK009] Simulation: FX system scaffold - Implement the FX/visual effects system placeholder noted in `src/components/Simulation.tsx`. Tasks: add lightweight FX system, hook into Simulation loop, provide simple particle/flash effect for hits. Acceptance: visual effects are triggered on hit events; non-blocking to game logic.

## Completed

- [TASK007] ProjectileSystem: add friendly-fire checks - Completed on 2025-09-17; toggle exposed in UI and Vitest coverage added.
- [TASK008] ProjectileSystem: sourceId wiring from weapon - Completed on 2025-09-17; rocket projectile spawns now source the resolved owner id and regression test added.
- [TASK001] Bootstrap memory bank files - Created initial `memory-bank` files and tasks.
- [TASK002] Add deterministic RNG helper - Completed on 2025-09-15.
- [TASK003] Add unit tests for physics sync - Added tests for `syncRigidBodiesToECS` and marked complete.
        - Also added projectile cleanup tests (tests/projectileCleanup.test.ts).
- [TASK004] Fix Playwright dev server port mismatch - Resolved locally by leveraging Playwright's configured webServer (starts Vite on 5174) and verifying `playwright/tests/smoke.spec.ts` passed locally. Note: Vite default remains 5173 for local `npm run dev`.
