# Milestone Implementation Report (Milestones 01-11)

Summary: This document maps the milestone goals (1..11) to the current codebase state in `src/` and `tests/`. For each milestone I list: What is implemented, what's missing, and suggested small/medium improvements to reach the milestone acceptance criteria or extend the feature.

Notes on methodology
- I inspected `docs/milestone-0*.md` and core source files under `src/` including `components/Simulation.tsx`, `components/Scene.tsx`, `robots/*`, `systems/*`, `ecs/*`, `utils/seededRng.ts` and relevant tests under `tests/`.
- Evidence of implementation is referenced by filenames and key symbols found in the codebase.

----

## Milestone 01 — Kickoff & Discovery

What exists
- Discovery artifacts (milestone docs) are present in `docs/`.
- `memory-bank/` contains project context files.

What's implemented
- Code structure and entry points are documented (see `AGENTS.md`, `README.md`, `SPEC.md`).

What's left / suggestions
- If not already present, add a short decision log file into `memory-bank/` describing the key architecture decisions (physics authority, deterministic RNG, ECS choices). Consider adding a one-page roadmap and immediate unblock PR suggestion.

Status: Mostly satisfied (documentation present). Add a short decision log to satisfy acceptance criteria.

----

## Milestone 02 — Robot Evolution System

What exists
- Robot prefab factory and catalog: `src/robots/robotPrefab.tsx`, `src/robots/prefabCatalog.ts`, `src/robots/spawnControls.ts`.
- Deterministic spawn hooks used by Simulation via seeded RNG: `src/utils/seededRng.ts` and Simulation uses fixed seed when running in deterministic mode.
- Unit tests referencing prefab catalog: `tests/prefabCatalog.test.ts` and spawn controls tests (evidence in `tests/`).

What's implemented
- Prefab definitions and factory functions are implemented (`robotPrefabs`, `getRobotPrefabById`, `createRobotEntity`, `spawnTeam`, `resetAndSpawnDefaultTeams`).
- Spawn grid, team loadouts and weapon configuration are present (`spawnControls.ts`).

What's left / suggestions
- Upgrade/evolution delta system is not visible — there is no explicit upgrade application pipeline for evolving parts at runtime. Add a small `applyUpgrade(entity, upgradeDef)` helper and a data schema for upgrade diffs.
- Add sample designer-driven prefabs with more diverse parts (sensors, locomotion variants) and a migration path in `SPEC.md`.

Status: Core prefab/spawn systems done; evolution/upgrade workflow is minimal/missing.

----

## Milestone 03 — Weapons System Architecture

What exists
- Unified weapons types and components: `src/ecs/weapons.ts`.
- Weapon registry/profile data: `src/robots/weaponProfiles.ts`.
- Weapon coordinator and event pipeline: `src/systems/WeaponSystem.ts` (emits WeaponFiredEvent).
- Hitscan, Beam, Projectile systems implemented in `src/systems/HitscanSystem.ts`, `BeamSystem.ts`, `ProjectileSystem.ts`.
- Tests for deterministic hitscan, projectile AoE, beam tick: `tests/*`.

What's implemented
- Data-driven weapon profiles, unified WeaponFiredEvent, and separate resolution systems for gun/laser/rocket are present.
- Weapon lifecycle (cooldown, ammo, firing state) is handled in `weaponSystem` and separate systems consume fired events and generate damage events.

What's left / suggestions
- Advanced modes (chargeable, overheat, alt-fire) are represented in the `flags` shape but lack full implementations — charging and overheat are mostly scaffolding.
- Consider adding a central registry module to register weapon types and to support migration adapters (simple mapping currently achieved by type checks in systems).

Status: Core architecture present and well-separated. Add charge/overheat/alt-fire implementations and a small registry for extensibility.

----

## Milestone 04 — AI Behaviors & Tactics

What exists
- AI system implemented: `src/systems/AISystem.ts`.
- Perception utilities: `src/systems/perception.ts` (line-of-sight and rapier raycast attempts).

What's implemented
- Layered behavior (idle, patrol, engage, flee), simple decision-making and use of LOS checks. AI sets `targetId` and toggles `weaponState.firing`.

What's left / suggestions
- Squad-level tactics and directive system are not present. Add a small squad manager or team directive component to allow coordinated behaviors.
- Utility-based decision-making or behavior tree runtime is absent; the state machine is simple but workable. Consider adding a small behavior tree or utility scoring for richer behaviors.

Status: Basic AI implemented and deterministic-friendly (uses RNG injection). Squad tactics and richer decision modules remain to be added.

----

## Milestone 05 — Physics & Rapier Tuning

What exists
- Rapier integration via `@react-three/rapier` in `src/components/Scene.tsx` and `Robot` prefab attaching rigid bodies in `robotPrefab.tsx`.
- Rapier helper utilities for mapping rapier hits to entity ids: `src/systems/rapierHelpers.ts`.

What's implemented
- Use of Rapier for rigid bodies, colliders set on robots and arena floor. Raycast attempts are made in perception/hitscan systems with defensive handling for multiple rapier wrapper shapes.

What's left / suggestions
- No centralized physics config constants file found (milestone requested a physics config & constants file). Consider adding `src/config/physics.ts` with timestep, CCD options, and material definitions.
- Continuous Collision Detection (CCD) explicit configuration for fast projectiles isn't present — ProjectileSystem uses simple movement and optionally sets linear velocity via rigid bodies; add CCD flags to projectiles when spawning rigid bodies.

Status: Rapier is integrated; explicit tuning (CCD/material definitions/timestep handling) is mostly missing and recommended.

----

## Milestone 06 — Environment Visuals

What exists
- `src/components/Scene.tsx` sets lights, background and contains the `Physics` wrapper.
- Simple arena floor mesh present in `Simulation.tsx`.

What's implemented
- Basic scene composition with lighting and shadows, a canvas camera, Stats overlay and OrbitControls.

What's left / suggestions
- No PBR material utilities or tile prefabs found (`src/utils/materials.ts` not present). Add `src/components/environment/*` for modular tiles, a material util and a small texture set or placeholders.

Status: Minimal environment present. Visual overhaul items (PBR, modular tiles, emissive flicker) are not implemented yet.

----

## Milestone 07 — Assets & Art Pipeline

What exists
- No `assets/` folder found in the source tree. README/Docs mention assets pipeline but no importer script.

What's implemented
- N/A (placeholders are used for robots/meshes).

What's left / suggestions
- Create `assets/` layout, a `docs/assets.md` describing naming and glTF export settings, and a simple example placeholder glTF in `public/` or `assets/examples`.

Status: Not implemented; documentation only.

----

## Milestone 08 — Testing & CI Improvements

What exists
- Comprehensive unit tests around weapons, projectile behavior, prefab catalog and seeded RNG under `tests/`.
- Playwright config present: `playwright.config.ts` and `playwright/tests/smoke.spec.ts` referenced in docs.

What's implemented
- Vitest-based deterministic tests (seeded RNG, hitscan determinism, projectile AoE, beam ticking) are implemented and valuable.

What's left / suggestions
- Ensure Playwright smoke uses correct dev server port (milestone TASK004 referenced in memory-bank). Verify `.github/workflows` contains CI steps — I didn't find workflows in the repo root during this pass (if absent, add CI jobs to run tests and build).

Status: Unit tests present and targeted; CI workflows may need to be added/updated.

----

## Milestone 09 — Performance Profiling & Optimizations

What exists
- No explicit profiling scripts or pooling systems found. Code is structured in systems where pooling could be added (projectile creation uses world.add and remove).

What's implemented
- Project is organized for profiling and optimization, but no benchmarks or pooling utilities are present.

What's left / suggestions
- Add a `benchmarks/` script that spawns many entities (using existing `spawnControls`) and records frame time traces. Implement simple pooling for projectile entities and transient effects to reduce GC.

Status: Not implemented (planning/next steps needed).

----

## Milestone 10 — Docs & SPEC Updates

What exists
- `SPEC.md`, `docs/` and `memory-bank/` are present and describe architecture and sprint milestones.

What's implemented
- Core docs exist and cover architecture; some code-level differences should be reconciled.

What's left / suggestions
- Update `SPEC.md` with the current authoritative shapes (Weapon lifecycle, ECS details) and record migration notes for any changes (e.g., weapon event pipeline adopted). Keep `memory-bank/` progress updated.

Status: Partially satisfied; update SPEC to match current code.

----

## Milestone 11 — Playable Demo & QA

What exists
- Demo scaffold: `Simulation.tsx` composes robots, physics, weapons and AI and is runnable via Scene -> App -> main.tsx.
- UI components for diagnostics and controls: `src/components/ui/*`, `src/store/uiStore.ts` (pause toggle, loading, diagnostic overlays).

What's implemented
- Simulation spawns teams, runs deterministic AI, fires weapons and runs the damage pipeline. Robots render as simple boxed meshes. Projectile and beam visual components exist (`src/components/Projectile.tsx`, `Beam.tsx`).

What's left / suggestions
- Polishing: add `src/scenes/demo/` with a composed environment, spawn wave controls, and a README with run/playtest instructions.
- QA: add a short playtest checklist and Playwright smoke to verify the demo boots (existing Playwright config may already have a smoke test but ensure it targets correct port).

Status: Strong foundation present; demo polish, scene assets, README and playtest notes remain to finish Milestone 11.

----

## Code & Test Health (quick notes)
- Deterministic RNG implemented and tested (`src/utils/seededRng.ts`, `tests/seededRng.test.ts`).
- Weapon pipeline tests available (hitscan determinism, projectile AoE, beam tick tests).
- Rapier integration is defensive and attempts to support multiple wrapper shapes; tests currently focus on deterministic logic rather than full physics.

Potential quick wins
- Add `src/config/physics.ts` for central physics tuning values and CCD toggles.
- Implement a small `applyUpgrade` helper and an `evolution` module that applies prefab diffs.
- Add a demo scene folder and small README with steps to run locally and the Playwright smoke expectations.

----

Appendix: Actionable TODOs (small, prioritized)
1. Add a decision log to `memory-bank/decision-log.md` capturing deterministic design choices (15–30m).
2. Add `src/config/physics.ts` with constants and link it into `Scene.tsx` and `Simulation` (30–60m).
3. Implement an `applyUpgrade(entity, upgrade)` helper and a sample upgrade JSON; add a test (1–2h).
4. Create `docs/demo-readme.md` with run/play instructions and confirm Playwright smoke port; update `playwright/tests/smoke.spec.ts` if necessary (30–90m).
5. Add simple pooling for projectiles (1–2h).

----

Generated by repository analysis on 2025-09-17.
