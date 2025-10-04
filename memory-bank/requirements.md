# Requirements (EARS-style) — RobotSpaceBattler

**Generated:** 2025-10-03

All requirements below are written in EARS format. Each requirement includes an acceptance section referencing existing automated tests or manual verification steps present in the repository.

1) WHEN the application starts, THE SYSTEM SHALL initialize the ECS world and populate default teams so the first render shows robots immediately.  
   Acceptance: The world contains robot entities before React mounts (checked by `main.tsx` calling `resetAndSpawnDefaultTeams()`). Unit/E2E tests: `initial-ecs-hydration.test.ts`, `SimulationIntegration.test.tsx`.

2) WHEN the simulation is running (fixed-step driver enabled), THE SYSTEM SHALL execute the deterministic fixed-step loop and invoke core systems (AI, weapon coordination, hitscan, beam, projectile, damage, scoring, respawn, physics-sync, FX) each step with a seeded RNG and fixed timestep.  
   Acceptance: Systems are called each fixed step and produce deterministic results when using the fixed-step driver. Unit tests: `fixedStepDriver.test.ts`, `useFixedStepLoop.test.ts` (or related tests referencing the fixed-step driver), `weapon-fire-smoke.test.ts`, `simulation-render.test.tsx`.

3) WHEN a weapon is fired, THE SYSTEM SHALL emit a WeaponFired event and resolve impacts via the hitscan, beam, or projectile systems; the resolution shall produce Damage events which the DamageSystem consumes and may emit Death events.  
   Acceptance: Weapon → projectile → damage flows exist and are covered by unit tests: `weapon-projectile-behavior.test.ts`, `weapon-fire-smoke.test.ts`, `projectile-aoe.test.ts`, `projectile-friendly-fire.test.ts`.

4) WHEN an entity has an attached Rapier `RigidBody`, THE SYSTEM SHALL treat that rigid body as the authoritative transform and synchronize the ECS position components from physics each frame via `physicsSyncSystem`.  
   Acceptance: `physicsSyncSystem` copies physics translations into `entity.position` and notifies subscribers; tests: `r3f-ecs-sync.test.tsx`, `useEntityPhysicsSync.test.tsx`.

5) WHEN the simulation is paused, THE SYSTEM SHALL capture entity velocities and restore them on resume so motion resumes consistently.  
   Acceptance: Pause and resume preserve motion state (tests: `pauseVelocity.test.ts`, `pauseManager.test.ts`).

6) WHEN friendly-fire is disabled in the UI toggle, THE SYSTEM SHALL not apply damaging effects from projectiles or beams to entities on the same team; instead the simulation should either ignore damage or treat impacts as non-damaging hits in AoE cases.  
   Acceptance: Friendly-fire behavior is covered by `projectile-friendly-fire.test.ts`, `weapon-edgecases.test.ts` and validated by Playwright smoke when toggling the UI control.

7) WHEN rendering the scene, THE SYSTEM SHALL use an on-demand render loop (frameloop="demand") and a TickDriver to schedule frames so pause/unpause and on-demand updates are deterministic and minimal.  
   Acceptance: `Scene.tsx` uses `frameloop="demand"` and `TickDriver`; the `Simulation` calls `invalidate()` on entity changes; tests: `simulation-render.test.tsx`, `r3f-simulation-render.test.tsx`.

8) WHEN changing or adding systems, THE SYSTEM SHALL keep systems small and export pure helper functions so logic can be unit tested without Three.js or Rapier.  
   Acceptance: Systems live under `src/systems/` and export testable functions; many tests under `tests/` already exercise system behavior (see `weapon-*`, `ai-*`, `projectile-*` tests).


Notes:
- These requirements are intentionally implementation-aligned: they describe the current authoritative behaviors and map to existing tests so they can be used as acceptance checks during future changes.
- If a requirement needs to be broadened (for example to include networking), add a research/Design task to `.specify/tasks/` and include acceptance criteria for the new behavior.
