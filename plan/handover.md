# Handover for next agentic session

Short, actionable handover for the next automated/collaborative agent working on RobotSpaceBattler.

## Context
- Repo: RobotSpaceBattler (branch: dev)
- Tech: React + TypeScript + Vite + three.js (react-three-fiber) + @react-three/rapier (physics). ECS: miniplex. Tests: Vitest unit tests; Playwright configured but no smoke test file yet.
- Last changes: core systems implemented (physics, prefabs, weapons, damage, basic AI) and unit tests for weapons/determinism. Several plan items remain incomplete (asset pipeline, respawn/scoring, advanced AI, Playwright smoke, perf automation).

## Current status (short)
- Implemented: Rapier physics integration, procedural robot prefabs + inspector, spawn controls, seeded RNG, WeaponSystem + Hitscan/Projectile/Beam systems, DamageSystem, many unit tests covering weapons and deterministic behavior.
- Partial: AI (basic targeting/movement exists, but state machines & LOS occlusion missing); Damage/Health emits death events but respawn and scoring systems not implemented.
- Missing: asset pipeline/glTF loader and model replacement; dedicated weapon editor UI; Playwright smoke test(s) and CI perf regression job; projectile pooling and perf harness.
 

## Top priorities for next session (ranked)
1. Add Playwright smoke test (quick win)
   - File: `playwright/tests/smoke.spec.ts` asserting `#status` and `canvas` exist.
   - Benefit: satisfies Milestone 01 acceptance test; provides a CI E2E check.
2. Add basic GLTF asset loader & asset store (medium effort)
   - Files: `src/assets/loader.ts`, `src/assets/assetStore.ts` and update `src/robots/robotPrefab.tsx` to optionally use loaded models with procedural fallback.
   - Benefit: unlocks Milestones 07/08 and real asset replacement for demos.
3. Implement Respawn & Scoring systems (small-medium)
   - Files: `src/systems/RespawnSystem.ts`, `src/systems/ScoringSystem.ts`, `src/components/ui/ScoreBoard.tsx` (or add to `uiStore`).
   - Benefit: closes Milestone 06 acceptance criteria (respawn & scoring).
4. Add LOS occlusion checks & simple AI state machine (medium)
   - Files: extend `src/systems/perception.ts` with raycast occlusion and add `src/systems/AIStateMachine.ts`.
   - Benefit: improves AI realism and satisfies Milestone 04.
5. Projectile pooling & perf harness (low-medium)
   - Files: `src/systems/ProjectilePool.ts`, small perf test harness and CI step.

## Suggested immediate task to run now
- Create the Playwright smoke test and run it locally. This is low-risk, fast, and verifies dev server + basic page render. If Playwright fails because dev server port expectations differ, adapt test to use the preview or dev server port.

## Recent work (by agent)
- Playwright smoke test added and verified locally:
   - File created: `playwright/tests/smoke.spec.ts`.
   - Verified by running `npm run playwright:test` which started/reused the configured webServer on port 5174 and ran the test headlessly.
   - Result: 1 test passed (asserted `#status` and `canvas` visible).

Notes:
- No config changes were necessary; `playwright.config.ts` is already configured to start the dev server with `npm run dev -- --port 5174` and reuse an existing server.
- Next steps (recommended): Add a GitHub Actions workflow to run Playwright smoke on PRs, implement the GLTF asset loader, and implement Respawn/Scoring systems (see priorities below).

## Quick test checklist for the next session
- Run unit tests: `npm run test` (Vitest)
- Start dev server: `npm run dev` and manually confirm page loads at :5173 (or run headless preview)
- Run Playwright smoke after adding test: `npx playwright test playwright/tests/smoke.spec.ts` (or run via npm script if present)

## Notes on conventions and safety
- Keep Rapier RigidBody as authoritative for transforms (do not mutate mesh transform on bodies that have RigidBody attached). See `SPEC.md` and `src/ecs/miniplexStore.ts` for the authority pattern.
- Add new UI dev-only tools under `src/components/ui/` and guard them behind a dev flag (use existing `useUI()` store in `src/store/uiStore.ts`).
- When adding dependencies (e.g., `@react-three/drei`), update `package.json` and add a short README entry for dev setup.

## Files touched recently / pointers for tracing
- Simulation & entry points: `src/main.tsx`, `src/App.tsx`, `src/components/Scene.tsx`, `src/components/Simulation.tsx`
- ECS & store: `src/ecs/miniplexStore.ts`, `src/store/uiStore.ts`
- Robots & prefabs: `src/robots/prefabCatalog.ts`, `src/robots/robotPrefab.tsx`, `src/robots/spawnControls.ts`, `src/robots/weaponProfiles.ts`
- Weapons/systems: `src/ecs/weapons.ts`, `src/systems/WeaponSystem.ts`, `src/systems/HitscanSystem.ts`, `src/systems/ProjectileSystem.ts`, `src/systems/BeamSystem.ts`
- Damage: `src/systems/DamageSystem.ts`
- Utilities/tests: `src/utils/seededRng.ts`, `tests/*` coverage for weapons/determinism

## Acceptance criteria checklist for the next agent
- Add Playwright smoke: test file added and passing locally (`#status` and `canvas` exist).
- Add glTF loader + fallback usage in `robotPrefab.tsx` (proof-of-concept): loading code compiles and fallback renders when no asset present.
- Add RespawnSystem that consumes death events and re-enables entities after delay (unit tested).

## Hand-off notes
- For automated tasks, prefer small incremental PRs (one feature per PR). Add unit tests alongside logic changes (Vitest). For UI-only dev tools, add Playwright checks where useful.
- Keep changes reversible and documented in `SPEC.md` when altering system responsibilities (e.g., making respawn authoritative in a new system).

If you want, I can start by adding the Playwright smoke test now and run it locally; confirm and I will proceed.
