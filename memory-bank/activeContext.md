
# Active Context - RobotSpaceBattler

## Current focus

- Stabilize core simulation (physics-first authority, deterministic test mode).
- Finish unified weapons ECS integration and increase unit test coverage for weapons and projectiles.
- New: Event-driven FX system added (non-authoritative visuals) wired into Simulation.

## Recent changes (implemented)

- Seeded RNG utility added and used by deterministic unit tests.
- Rapier physics integrated; RigidBody is authoritative and transform sync utilities are in place.
- Procedural robot prefabs and spawn controls implemented (dev-only UI exposed).
- Weapons systems implemented: Hitscan, Projectile and Beam subsystems with events; projectile/beam entities spawn with Rapier bodies.
- FX system implemented (`src/systems/FxSystem.ts`) with `FXLayer` renderer and `showFx` UI flag.
- DamageSystem added and emits death events consumed by higher-level systems.
- Unit tests expanded: weapons, projectile lifecycle, and physics sync tests (Vitest).
- Playwright E2E smoke test added (`playwright/tests/smoke.spec.ts`) and verified locally to assert `#status` and `canvas` are present.

- Respawn and Scoring systems implemented with queue-based respawns, score tracking UI, and Vitest coverage (`src/systems/RespawnSystem.ts`, `src/systems/ScoringSystem.ts`, `src/components/ui/ScoreBoard.tsx`).

## Next steps

- Integrate the unified weapons ECS into the main `Simulation` wiring and ensure all systems read authority from Rapier bodies.
- Harden friendly-fire rules, ensure projectiles carry correct `sourceId`, and expand unit tests for cooldowns and AOE edge-cases.
- Add GLTF asset loader and optional model replacement for procedural prefabs.

## Decisions / Conventions

- Rapier's `RigidBody` remains authoritative for transforms; avoid mutating mesh transforms directly when a `RigidBody` is present.
- New developer UI/tools should live under `src/components/ui/` and be guarded by dev flags.

## Notes / Recent verification

- Playwright smoke test uses the repo Playwright config which starts the dev server on port 5174 for CI; note the Vite default dev port is 5173 (see `memory-bank/techContext.md` for port docs).
- Several unit tests rely on deterministic RNG; maintain `utils/seededRng.ts` as the canonical seeded RNG helper.



