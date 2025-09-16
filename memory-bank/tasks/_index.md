# Tasks Index


## In Progress

- [TASK006] Unified weapons ECS - Developing shared weapon components and systems.
- [TASK005] Expand tasks list - Audit repo for missing tasks and add them to this index. (In progress)

## Pending

- [TASK007] ProjectileSystem: add friendly-fire checks - Implement friendly-fire logic so projectiles do not damage allies when game mode disallows it. Location: `src/systems/ProjectileSystem.ts` (TODO at line ~170). Acceptance: projectiles ignore same-team entities when friendly fire is disabled; unit test added.

- [TASK008] ProjectileSystem: sourceId wiring from weapon - Replace hard-coded `sourceId: 0` with the weapon/entity source ID when spawning projectiles. Location: `src/systems/ProjectileSystem.ts` (TODO at line ~182). Acceptance: spawned projectiles carry correct `sourceId` from weapon component; tests updated.


## New / Discovered (from code TODOs)

- [TASK007] ProjectileSystem: add friendly-fire checks - Implement friendly-fire logic so projectiles do not damage allies when game mode disallows it. Location: `src/systems/ProjectileSystem.ts` (TODO at line ~170). Acceptance: projectiles ignore same-team entities when friendly fire is disabled; unit test added.

- [TASK008] ProjectileSystem: sourceId wiring from weapon - Replace hard-coded `sourceId: 0` with the weapon/entity source ID when spawning projectiles. Location: `src/systems/ProjectileSystem.ts` (TODO at line ~182). Acceptance: spawned projectiles carry correct `sourceId` from weapon component; tests updated.

- [TASK009] Simulation: FX system scaffold - Implement the FX/visual effects system placeholder noted in `Simulation.tsx` (TODO at line ~189). Tasks: add lightweight FX system, hook into Simulation loop, provide simple particle/flash effect for hits. Acceptance: visual effects are triggered on hit events; non-blocking to game logic.


## Completed

- [TASK001] Bootstrap memory bank files - Created initial `memory-bank` files and tasks.
- [TASK002] Add deterministic RNG helper - Completed on 2025-09-15.
- [TASK003] Add unit tests for physics sync - Added tests for `syncRigidBodiesToECS` and marked complete.
        - Also added projectile cleanup tests (tests/projectileCleanup.test.ts).
- [TASK004] Fix Playwright dev server port mismatch - Resolved locally by leveraging Playwright's configured webServer (starts Vite on 5174) and verifying `playwright/tests/smoke.spec.ts` passed locally. Note: Vite default remains 5173 for local `npm run dev`.
