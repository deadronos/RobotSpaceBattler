# Plan: Rapier Raycast Integration for Predictive Wall Avoidance

**Spec**: 006-improved-pathfinding  
**Status**: In Progress  
**Created**: 2025-11-26

## Summary

Integrate Rapier raycasting for predictive wall detection to replace reactive-only avoidance. Create modular collision groups, a physics query service with static fallback, and frame-staggered predictive avoidance. All new files stay under 300 LOC.

## Phases (8 phases)

### Phase 1: Create Collision Group Constants
- **Objective:** Define bitmask constants for collision filtering (WALL, PILLAR, STATIC_GEOMETRY, ROBOT, PROJECTILE)
- **Files/Functions to Modify/Create:** `src/lib/physics/collisionGroups.ts` [NEW ~30 LOC]
- **Tests to Write:** `tests/lib/collisionGroups.spec.ts` - verify bitmask combinations
- **Steps:**
    1. Write unit tests for expected bitmask values and `interactionGroups()` helper
    2. Run tests (expect fail)
    3. Create `collisionGroups.ts` with `COLLISION_GROUPS` enum and `interactionGroups()` function
    4. Run tests (expect pass)

### Phase 2: Create Physics Query Service
- **Objective:** Abstract Rapier raycasting behind a service that gracefully handles missing physics world
- **Files/Functions to Modify/Create:** `src/simulation/ai/pathing/physicsQueryService.ts` [NEW ~80 LOC]
- **Tests to Write:** `tests/ai/physicsQueryService.spec.ts` - test both Rapier path (mocked) and null fallback
- **Steps:**
    1. Write unit tests for `castRay()` returning hit data or null, and `castRayFan()` for multiple rays
    2. Run tests (expect fail)
    3. Create `PhysicsQueryService` interface and `createPhysicsQueryService()` factory
    4. Implement null-safe `castRay()` and `castRayFan()` using Rapier's `world.castRay()`
    5. Run tests (expect pass)

### Phase 3: Create Raycast Scheduler
- **Objective:** Implement frame staggering to distribute raycast load across frames
- **Files/Functions to Modify/Create:** `src/simulation/ai/pathing/raycastScheduler.ts` [NEW ~40 LOC]
- **Tests to Write:** `tests/ai/raycastScheduler.spec.ts` - verify staggering logic and caching
- **Steps:**
    1. Write tests for `shouldRaycastThisFrame()` and result caching behavior
    2. Run tests (expect fail)
    3. Create `RaycastScheduler` with entity-based frame staggering (every 3rd frame)
    4. Add result caching with TTL
    5. Run tests (expect pass)

### Phase 4: Create Predictive Avoidance Module
- **Objective:** Compute avoidance vectors using forward-looking raycasts
- **Files/Functions to Modify/Create:** `src/simulation/ai/pathing/predictiveAvoidance.ts` [NEW ~60 LOC]
- **Tests to Write:** `tests/ai/predictiveAvoidance.spec.ts` - test avoidance vector computation
- **Steps:**
    1. Write tests for `computePredictiveAvoidance()` with mocked query service
    2. Run tests (expect fail)
    3. Implement 3-ray fan (forward, ±30°) at 5-unit lookahead
    4. Return weighted avoidance vector based on hit distances
    5. Run tests (expect pass)

### Phase 5: Wire Rapier World to BattleRunner
- **Objective:** Add optional `rapierWorld` field to `BattleWorld` and setter method
- **Files/Functions to Modify/Create:** `src/simulation/battleRunner.ts` [MODIFY +10 LOC], `src/simulation/world.ts` [MODIFY +5 LOC]
- **Tests to Write:** `tests/runtime/battleRunner.spec.ts` - verify `setRapierWorld()` integration
- **Steps:**
    1. Write test for `BattleWorld.rapierWorld` getter/setter
    2. Run tests (expect fail)
    3. Add `rapierWorld?: World` to `BattleWorld` interface in `world.ts`
    4. Add `setRapierWorld(world: World)` method to `BattleRunner`
    5. Run tests (expect pass)

### Phase 6: Connect Rapier from Simulation Component
- **Objective:** Pass Rapier world reference from React context to BattleRunner
- **Files/Functions to Modify/Create:** `src/components/Simulation.tsx` [MODIFY +15 LOC]
- **Tests to Write:** Manual verification (React/Rapier hook not easily unit testable)
- **Steps:**
    1. Import `useRapier` from `@react-three/rapier`
    2. Add `useEffect` to call `runner.setRapierWorld(world)` when world available
    3. Clean up on unmount
    4. Verify manually that world is passed (observable in devtools)

### Phase 7: Integrate Predictive Avoidance into Movement Planning
- **Objective:** Blend predictive avoidance with existing reactive avoidance
- **Files/Functions to Modify/Create:** `src/simulation/ai/pathing/movementPlanning.ts` [MODIFY +20 LOC], `src/simulation/ai/pathing/obstacleAvoidance.ts` [MODIFY +2 LOC]
- **Tests to Write:** Update `tests/ai/movementPlanning.spec.ts` to cover new integration
- **Steps:**
    1. Update tests to verify predictive avoidance is called and blended
    2. Run tests (expect fail)
    3. Import `computePredictiveAvoidance` and `createPhysicsQueryService` in `movementPlanning.ts`
    4. Call predictive avoidance when query service is available
    5. Increase reactive avoidance params in `obstacleAvoidance.ts`: radius 3→4.5, strength 1.2→1.8
    6. Run tests (expect pass)

### Phase 8: Add Collision Groups to Visual Components
- **Objective:** Tag arena geometry with collision groups for filtered raycasting
- **Files/Functions to Modify/Create:** `src/visuals/ArenaWalls.tsx` [MODIFY +5 LOC], `src/visuals/ArenaPillars.tsx` [MODIFY +5 LOC]
- **Tests to Write:** Manual verification + Playwright visual test (if time permits)
- **Steps:**
    1. Import `COLLISION_GROUPS` and `interactionGroups` from collision groups module
    2. Add `collisionGroups={interactionGroups(COLLISION_GROUPS.WALL, ...)}` to Wall RigidBodies
    3. Add `collisionGroups={interactionGroups(COLLISION_GROUPS.PILLAR, ...)}` to Pillar RigidBodies
    4. Verify raycasts correctly filter in dev mode

## Acceptance Criteria

- [ ] Robots avoid walls earlier (observable in gameplay)
- [ ] No performance regression with 10+ robots (measure frame time)
- [ ] Unit tests pass for both Rapier and fallback paths
- [ ] All new/modified files under 300 LOC
- [ ] AI pathing test coverage increases from 22-33% to >60%
