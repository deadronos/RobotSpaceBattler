# Refactor Task Breakdown: Core Match Runtime

## Phase 1 – Application Shell & HUD State
1. [x] **Extract layout primitives**
   - [x] Create `src/ui/layout/AppLayout.tsx` with grid + sidebar structure.
   - [x] Move HUD containers into `src/ui/hud/HudShell.tsx`; expose props for visibility flags.
   - [x] Replace inline styles in `App.tsx` with imports from `AppLayout`.
2. [x] **Centralize UI state**
   - [x] Introduce `src/state/ui/hudStore.ts` (Zustand/Recoil) to manage HUD visibility, camera mode, and quality settings with latency telemetry hooks per Spec 002.
   - [x] Update `App.tsx` and existing HUD toggles to read/write via the store.
3. [x] **Data loading boundary**
   - Isolate initial fetch logic into `src/runtime/bootstrap/loadInitialMatch.ts`; ensure errors propagate through React Query/Suspense boundary.

## Phase 2 – Simulation Runtime Extraction
1. **Create `src/runtime/useMatchRuntime.ts`**
   - Manage ECS world init, clock stepping, pause/resume, and disposal.
   - Emit MatchTrace events via `onEvent` callbacks using the Spec 003 schema.
2. **Split supporting modules**
   - Add `src/runtime/world/setupWorld.ts` for entity/component registration.
   - Add `src/runtime/state/matchStateMachine.ts` encapsulating paused/running/victory transitions.
3. **Update `Simulation.tsx`**
   - Consume `useMatchRuntime` for lifecycle.
   - Remove direct ECS mutation; render-only responsibilities remain.

## Phase 3 – AI Module Refactor
1. **Carve out targeting helpers**
   - Move `findClosestEnemy`, `pickCaptainTarget` into `src/simulation/ai/targeting.ts` with deterministic tie-breakers from Spec 001.
2. **State machine clarification**
   - Define `RobotBehaviorMode` enum and transition table in `src/simulation/ai/behaviorState.ts`.
   - Export pure `nextBehaviorState(robotSnapshot, context)` function with RNG injection for deterministic replay per Spec 003.
3. **Pathing & formation coordination**
   - Extract movement vector calculations into `src/simulation/ai/pathing.ts` reusing captain alignment rules.
4. **Update tests**
   - Add Vitest suites covering captain reassignment, mode transitions, and deterministic outputs.

## Phase 4 – Combat Systems Separation
1. **Weapon firing controller**
   - Implement `src/simulation/combat/weapons/firingController.ts` responsible for cooldown checks, ammo use, and event emission.
2. **Projectile system module**
   - Implement `src/simulation/combat/projectiles/system.ts` stepping projectile movement, life span, and hit detection.
   - Introduce collision helpers under `src/simulation/combat/collision/` for broadphase AABB checks and narrowphase ray/mesh intersections.
3. **Damage + trace integration**
   - Move damage resolution into `src/simulation/combat/damageResolver.ts` that records MatchTrace events.
4. **Update `weaponSystem.ts`**
   - Refactor to orchestrate modules above; ensure `updateProjectileSystem` delegates to projectile module.
5. **Tests**
   - Add collision unit tests and golden MatchTrace event snapshots for multi-hit scenarios.

## Phase 5 – Scene Graph Modularization
1. **Mesh + material composition**
   - Create `src/scene/robots/RobotMesh.tsx` returning instanced meshes per robot team.
   - Extract material creation to `src/scene/robots/materials.ts` to apply quality scaling toggles.
2. **Animation & frame updates**
   - Implement `useRobotAnimation` hook in `src/scene/robots/useRobotAnimation.ts` that consumes runtime frame snapshots.
   - Replace `RobotActor` internals with composition of `RobotMesh` + `useRobotAnimation`.
3. **Entity subscription**
   - Implement `useRobotsForFrame` selector hooking into `useMatchRuntime` snapshot API to remove manual intervals.

## Phase 6 – Regression Hardening
1. **Expand automated tests**
   - Write integration tests for `useMatchRuntime` (pause/resume, victory handling) and AI + combat modules.
2. **Performance + visual checks**
   - Update Playwright smoke test to toggle quality settings and validate HUD latency < 100ms per Spec 002.
3. **Documentation & onboarding**
   - Document new module boundaries in `/docs/runtime-architecture.md` and update existing quickstarts referencing old components.

## Dependencies & Sequencing Notes
- Land phases sequentially to minimize merge risk; avoid parallelizing phases 2–4 because they modify shared systems.
- Maintain backward compatibility with existing tests after each phase; introduce feature flags if partial rewrites risk regressions.
- Coordinate with QA to schedule performance validation after Phase 5 before shipping changes to main.
