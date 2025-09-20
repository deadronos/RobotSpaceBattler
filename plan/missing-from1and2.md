deadronos: what is missing in current /src files from #file:implementation-plan-1.md and #file:implementation-plan-2.md ?

GitHub Copilot: I'll search the source tree for keywords from the plans (glTF/assets, Rapier/rigidbody, prefab inspector, seeded RNG/determinism, asset pipeline/GLTFLoader, health/respawn/scoring) to detect which plan items are already implemented and which are missing. I'll run a few repository text searches and report findings. 

Searched text for `gltf|glTF` (`**/src/**`), no results

Searched text for `Rapier|RigidBody|@react-three/rapier` (`**/src/**`), 20 results

I'll search the codebase for GLTF/asset pipeline references, deterministic mode, health/respawn/scoring, prefab inspector, AI systems, and Playwright smoke tests to map which plan items are already implemented. I will run several targeted text searches in the src folder and report findings. 

Searched text for `GLTF|GLTFLoader|gltf|glb|GLB` (`**/src/**`), no results

Searched text for `prefab inspector|PrefabsInspector|prefab inspector|Prefabs Inspector` (`**/src/**`), 4 results

Read [](file:///d%3A/GitHub/RobotSpaceBattler/src/components/ui/PrefabsInspector.tsx)

Searched for files matching `**/src/**`, 27 matches

Searched text for `Health|health|respawn|respawn` (`**/src/**`), 3 results

Read [](file:///d%3A/GitHub/RobotSpaceBattler/src/ecs/miniplexStore.ts)

Searched text for `seededRng|deterministic|seed|seeded` (`**/src/**`), 20 results

Read [](file:///d%3A/GitHub/RobotSpaceBattler/src/utils/seededRng.ts)

Searched text for `scoped|prefabCatalog|prefab|robotPrefabs|spawnRobot|spawnControls` (`**/src/**`), 20 results

Read [](file:///d%3A/GitHub/RobotSpaceBattler/src/robots/prefabCatalog.ts)

Searched text for `WeaponSystem|HitscanSystem|ProjectileSystem|BeamSystem` (`**/src/**`), 20 results

Searched text for `score|scoring|scoreboard|team score|respawn` (`**/src/**`), no results

Searched text for `Playwright|playwright|smoke` (`**/playwright/**`), no results

Searched text for `collision|collider|Collid|group|collision mask` (`**/src/**`), 15 results

Searched text for `AI|behavior|state machine|targeting|perception|line-of-sight|LOS|target` (`**/src/**`), 20 results

Read [](file:///d%3A/GitHub/RobotSpaceBattler/src/systems/DamageSystem.ts)

Read [](file:///d%3A/GitHub/RobotSpaceBattler/src/systems/WeaponSystem.ts)

Searched text for `Playwright|playwright|smoke.spec|smoke test` (`**/**`), 20 results

I have collected enough information. I'll now prepare a concise checklist mapping plan items from both Implementation Plan A and B to what's present in src and what's missing. I'll use the todo list tool to track this analysis (it's multi-step). 

Created 2 todos

Searched text for `.github/workflows|workflow|ci.yml|github actions` (`**/**`), 20 results

Read [](file:///d%3A/GitHub/RobotSpaceBattler/src/components/Simulation.tsx)

Searched for files matching `**/.github/**`, 75 matches

Searched for files matching `**/playwright/tests/**`, no matches

Read [](file:///d%3A/GitHub/RobotSpaceBattler/.github/workflows/lint.yml)

Starting (2/2) *Report missing items*

Searched for files matching `**/playwright/tests`, no matches

Searched for files matching `**/playwright/tests`, no matches

Read [](file:///d%3A/GitHub/RobotSpaceBattler/playwright/tests)

Read [](file:///d%3A/GitHub/RobotSpaceBattler/src/robots/spawnControls.ts)

Completed (2/2) *Report missing items*

I'll map the milestone items from Implementation Plan A and B to what's already in src/ and point out what's missing or only partially implemented.

Summary first (short):
- Many core systems from the plans are implemented: physics (Rapier + RigidBody usage), ECS/world, prefab catalog, prefab inspector UI, robot spawning, seeded RNG/deterministic frame loop, weapon systems (weapon coordinator, hitscan/projectile/beam), damage/health handling, and basic AI steering/targeting.
- Missing or incomplete items: asset pipeline / glTF loader and real asset replacement, scoring & respawn automation beyond death event, CI Playwright E2E tests present in config/specs but no tests in repository playbook, some dev tooling (weapon editor and more advanced prefab tooling), explicit deterministic Playwright smoke tests and perf regression tooling.
- Below is a detailed mapping (grouped by plan themes) with file references and "Present / Missing / Partial" status and short notes.

## Engine & Physics
- Goal (plan): Rapier integration; RigidBody wrappers; collision groups; Rapier as authority for transforms.
- Present:
  - Simulation.tsx uses `@react-three/rapier` RigidBody and Colliders; robot prefab uses `RigidBody` and `CuboidCollider` (robotPrefab.tsx).
  - miniplexStore.ts documents RigidBodyRef and world/entity functions.
  - Systems use Rapier-like interfaces (weapon/physics code reads `rigid.translation()` etc).
  - Projectile component and Projectile.tsx uses `RigidBody`/colliders.
- Status: Present and integrated.
- Missing: explicit collision group/mask configuration file (no clear centralized collision matrix implementation; colliders exist but no robust layer matrix file). If plan requires advanced collision groups per team/environment, add a dedicated module.

## ECS, Prefabs, Spawn Controls, Prefab Inspector (Milestone 2)
- Goal (plan): Prefab API, spawn system, prefabs inspector.
- Present:
  - Prefab catalog: prefabCatalog.ts with `robotPrefabs`.
  - Prefab inspector UI: PrefabsInspector.tsx.
  - Spawn controls: spawnControls.ts with `spawnRobot`, `spawnTeam`, `resetAndSpawnDefaultTeams`.
  - Robot visual prefab: robotPrefab.tsx.
- Status: Present and complete for procedural prefabs and simple inspector.

## Deterministic RNG & Deterministic Mode (Milestone 9)
- Goal (plan): seeded RNG utility + deterministic simulation mode for tests.
- Present:
  - seededRng.ts implements createSeededRng.
  - Simulation.tsx initializes deterministic RNG and uses fixed timestep; per-frame `frameRng` created deterministically.
  - Systems consuming `Rng` types: `WeaponSystem`, `ProjectileSystem`, `HitscanSystem`, `BeamSystem`.
- Status: Present and wired through systems.

## AI & Movement (Milestone 4)
- Goal (plan): AI tick loop, state machine, targeting & LOS checks.
- Present:
  - Basic AI loop inside Simulation.tsx (per-frame pickNearestEnemy, steerTowards, setWeaponFiring).
  - Weapon targeting is managed (entities have `targetId`, `setWeaponFiring` checks range).
- Status: Partial — basic movement/targeting present.
- Missing: richer AI behaviors (state machines: Patrol/Idle/Engage/Flee as discrete states), LOS/perception modules (there's range check but no occlusion/line-of-sight ray tests), AI telemetry & debug overlays beyond rudimentary inspector.

## Weapons Architecture (Milestone 5)
- Goal (plan): weapon components and systems for hitscan/projectile/beam with cooldowns, ammo.
- Present:
  - weapons.ts defines weapon component types and damage events.
  - WeaponSystem.ts coordinates cooldowns, firing decisions, emits `WeaponFiredEvent`.
  - HitscanSystem.ts, ProjectileSystem.ts, BeamSystem.ts exist and are invoked by Simulation.
  - weaponProfiles.ts and prefabCatalog.ts tie weapon profiles into prefabs.
- Status: Present (modular). Tests in tests indicate weapon behavior testing exists.

## Damage, Health, Respawn & Scoring (Milestone 6)
- Goal (plan): Health, authoritative damage resolution, respawn, scoring.
- Present:
  - miniplexStore.ts defines `Health` component and base stats.
  - DamageSystem.ts applies damage events and marks `alive = false` and pushes death events.
  - Simulation.tsx processes `damageSystem` and death events are created.
- Status: Partial.
  - Death is detected and `events.death` is pushed; `DamageSystem` stops movement (sets linear velocity to zero).
  - Missing: automated respawn logic (no `respawnSystem`) and no scoring system files. There's a `DeathEvent` structure but no `Scoreboard` module or UI exposing scores. Plan requires respawn and scoring tests / smoke checks.

## Assets pipeline & glTF replacement (Milestones 7 & 8)
- Goal (plan): glTF pipeline, glTF loader use, asset import & lazy loading, replace placeholders with real assets.
- Present:
  - No references to GLTF, GLB, `GLTFLoader`, or `@react-three/drei` GLTF usage in src.
  - Current robots are procedural (React components using primitives).
- Status: Missing. The codebase uses procedural placeholder robots; an asset-loading pipeline (GLTF loader, placeholder swap, asset validation) is not implemented.

## Prefab Tools / Weapon Editor (Milestone 2 & 5 Tools)
- Goal (plan): Prefabs inspector (dev-only) and a weapon editor to tweak parameters.
- Present:
  - Prefabs inspector UI (PrefabsInspector.tsx) already exists and lists prefabs with spawn buttons.
- Status: Partial — a basic prefab inspector exists. A dedicated weapon editor (live tweak UI) is not present.

## Tests, Playwright E2E & CI (Milestone 1 & 9 & 10)
- Goal (plan): CI templates with lint/tests; Playwright smoke tests verifying page loads and simulation.
- Present:
  - GitHub Actions workflow exists for lint: lint.yml.
  - Playwright config exists playwright.config.ts and tests folder exists (but is currently empty).
  - Vitest tests exist under `tests/*` (unit tests and smoke-like unit tests such as weapon-fire-smoke.test.ts).
- Status: Partial/Missing.
  - Lint CI is present; a full CI workflow that runs tests + Playwright isn't present (or not visible here).
  - Playwright tests folder is empty — no Playwright E2E smoke tests implemented in repo (plan expected `playwright/tests/smoke.spec.ts` etc).
  - Playwright in playwright.config.ts suggests intent, but actual E2E tests are missing.

## Performance & Determinism test harness (Milestone 9)
- Goal (plan): deterministic simulation tests, perf baselines and perf regressions in CI.
- Present:
  - Deterministic RNG and deterministic frame timestep present in Simulation.tsx.
  - Tests in tests include deterministic checks (there are tests named `hitscan-determinism.test.ts`, `seededRng.test.ts`).
- Status: Partial — unit test harness present; perf measurement and perf regression tracking are not present.

## Documentation & SPEC updates (Milestone 10)
- Goal (plan): update SPEC.md, README, and provide demo.
- Present:
  - SPEC.md exists in project root. README exists.
- Status: Present (docs are present, though the plan may have additional acceptance criteria).

## Concrete missing files / features (actionable list)
These are the obvious missing things you’d need to reach the milestones:

1. Asset pipeline / glTF loading
   - Missing: module to load glTF assets (e.g., wrapper around `useGLTF` from `@react-three/drei` or direct `GLTFLoader`) and a small asset manager for lazy loading and progress.
   - Files to add/areas: `src/assets/loader.ts`, `src/assets/assetStore.ts`, update `Robot` prefab to swap in a loaded glTF when available.

2. Respawn & Scoring systems
   - Missing: `respawnSystem` that listens to `events.death` and respawns entities after a timeout; `scoreSystem` to increment team scores on kills and UI display.
   - Files to add: `src/systems/RespawnSystem.ts`, `src/systems/ScoreSystem.ts`, UI `src/components/ui/ScoreBoard.tsx`.

3. Collision group/matrix configuration (if required)
   - Partial: colliders exist but no centralized collision matrix or group constants. Add `src/physics/collisionGroups.ts` if you want explicit group masks.

4. Playwright E2E tests (smoke)
   - Missing actual tests under tests. Example tests expected in plans: `smoke.spec.ts` that asserts `#status` and presence of `canvas` or asserts simulation starts.
   - Add tests and CI job to run Playwright on PRs/branches.

5. CI workflow that runs tests + Playwright + build previews
   - Partial: lint workflow exists. Add `.github/workflows/ci.yml` that runs install, lint, vitest, and Playwright (or playwright tests via `npx playwright test`) and optionally preview deploy steps.

6. Advanced AI (state machines, perception)
   - Missing: modular AI state machine and LOS occlusion checks (raycasts) separate from simple range-based targeting.

7. Weapon editor and prefab tooling (live tweak UI)
   - Partial: Prefabs inspector exists, but a weapon editor allowing live tweaking isn't present.

8. Perf measurement & regression tracking
   - Missing: a lightweight perf harness or CI step to record baseline FPS/loop timings and compare regressions.

9. Playwright test artifacts & dev server port expectations
   - The project notes mention Playwright tests expect dev server on port 5174 in docs; today, no Playwright tests exist and no CI job to start dev server & run Playwright exists.

## Files present that cover a lot of plan functionality
- Core ECS & world: miniplexStore.ts
- Weapons/ECS types: weapons.ts
- Weapon coordinator: WeaponSystem.ts
- Hitscan/Projectile/Beam systems: HitscanSystem.ts, ProjectileSystem.ts, BeamSystem.ts
- Damage handling: DamageSystem.ts
- Spawn & prefabs: prefabCatalog.ts, spawnControls.ts, PrefabsInspector.tsx
- Deterministic RNG: seededRng.ts
- Simulation loop: Simulation.tsx

## Quick acceptance coverage mapping (plan → status)
- Milestone 01 (scaffold & CI): Dev server and lint present; CI lint workflow present — Partial (need test & Playwright CI.)
- Milestone 02 (prefabs): Done (prefabs, inspector, spawn controls present).
- Milestone 03 (physics): Done (Rapier used widely).
- Milestone 04 (AI): Partial (basic targeting/movement present; full state machines & LOS not done).
- Milestone 05 (weapons): Done (weapon systems implemented and tested).
- Milestone 06 (damage/health/respawn): Partial (damage and death exist; respawn and scoring missing).
- Milestone 07/08 (assets/glTF): Missing (no glTF loader / pipeline).
- Milestone 09 (determinism & perf tests): Partial (deterministic RNG present and unit tests exist; perf baselines/regressions missing).
- Milestone 10 (release/docs/demo): Partial (docs exist; demo pipeline & preview CI missing).

## Suggested next steps I can implement for you (pick one or more)
- Add Playwright smoke test that loads the app and asserts `#status` and `canvas` exist (and add a CI workflow to run tests).
- Implement a respawn & scoring system and minimal Scoreboard UI.
- Add a basic glTF loader module + example replacement of procedural robot with a loaded glTF (and fallback path).
- Add collision group/mask constants to centralize collision handling.
- Expand AI to a simple state machine and LOS raycast module.

If you want, I can implement one of these now. If so, tell me which (or I can pick the highest-value one — I recommend adding Playwright smoke test + CI job or respawn+score since tests/CI and gameplay feedback are useful next steps). I can also open a set of concrete TODOs and then make the change(s) and run tests/linters.