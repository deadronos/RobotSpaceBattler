# Plan: Rapier Raycast Integration for Predictive Wall Avoidance

**Spec**: 006-improved-pathfinding  
**Status**: Draft  
**Created**: 2025-11-26

## Summary

Add predictive wall detection using Rapier raycasting with a modular file structure.
Build collision filters dynamically from static level geometry and entity types.
Keep static geometry fallback for determinism. Current files are well under 300 LOC,
so we have room for clean additions.

## Problem

Robots frequently collide with walls because:

- Reactive avoidance radius (3 units) is too small for robot speed (6 units/s)
- No forward-looking collision prediction
- Roaming waypoints aren't validated against internal obstacles

## Solution

Integrate Rapier's native raycasting for predictive avoidance while maintaining
static geometry fallback for deterministic headless/replay scenarios.

## Steps

### 1. Create collision group constants
**File**: `src/lib/physics/collisionGroups.ts` [NEW ~30 LOC]

Define bitmasks: `WALL`, `PILLAR`, `STATIC_GEOMETRY` (combined), `ROBOT`, `PROJECTILE`.
Export `interactionGroups()` helper for building filter masks.

### 2. Create Rapier query service
**File**: `src/simulation/ai/pathing/physicsQueryService.ts` [NEW ~80 LOC]

Interface and implementation for `castRay()`, `castRayFan()`. Accepts optional
`rapierWorld`, returns `null` when unavailable (fallback path).

### 3. Create predictive avoidance module
**File**: `src/simulation/ai/pathing/predictiveAvoidance.ts` [NEW ~60 LOC]

`computePredictiveAvoidance(position, velocity, queryService)` returning avoidance vector. Uses 3-ray fan at 5-unit lookahead.

### 4. Add rapierWorld to BattleWorld
**File**: `src/simulation/battleRunner.ts` [MODIFY +10 LOC → ~151 LOC]

Add optional `rapierWorld` field and `setRapierWorld()` setter.

### 5. Wire Rapier world from Simulation component
**File**: `src/components/Simulation.tsx` [MODIFY +15 LOC → ~117 LOC]

Call `useRapier()` and pass world reference to BattleRunner via `useEffect`.

### 6. Integrate predictive avoidance in movement planning
**File**: `src/simulation/ai/pathing/movementPlanning.ts` [MODIFY +20 LOC → ~129 LOC]

Call `computePredictiveAvoidance()` and blend result into desired velocity.

### 7. Increase reactive avoidance parameters
**File**: `src/simulation/ai/pathing/obstacleAvoidance.ts` [MODIFY +2 LOC → ~86 LOC]

- `AVOIDANCE_RADIUS`: 3.0 → 4.5
- `AVOIDANCE_STRENGTH`: 1.2 → 1.8

### 8. Add collision groups to visual components
**Files**: `src/visuals/ArenaWalls.tsx`, `src/visuals/ArenaPillars.tsx` [MODIFY +5 LOC each]

Add `collisionGroups` prop using the new constants.

### 9. Add frame staggering utility
**File**: `src/simulation/ai/pathing/raycastScheduler.ts` [NEW ~40 LOC]

`shouldRaycastThisFrame(entityId, frameCount)` and result caching per entity.

### 10. Add unit tests
**Files**: `tests/ai/predictiveAvoidance.spec.ts`, `tests/ai/physicsQueryService.spec.ts` [NEW]

Test both Rapier path (mocked) and fallback path.

## New File Structure

```text
src/lib/physics/
  collisionGroups.ts          [NEW ~30 LOC]

src/simulation/ai/pathing/
  obstacleAvoidance.ts        [MODIFY → 86 LOC]
  movementPlanning.ts         [MODIFY → 129 LOC]
  physicsQueryService.ts      [NEW ~80 LOC]
  predictiveAvoidance.ts      [NEW ~60 LOC]
  raycastScheduler.ts         [NEW ~40 LOC]

tests/ai/
  predictiveAvoidance.spec.ts [NEW]
  physicsQueryService.spec.ts [NEW]
```

## Design Decisions

1. **Keep static geometry fallback**: Ensures deterministic behavior for headless testing
   and replays when Rapier world is unavailable.

2. **3-ray fan vs single ray**: Forward + ±30° rays provide better coverage for angled
   approaches to walls without excessive raycast cost.

3. **5-unit lookahead**: At 6 units/s max speed, gives ~0.8s reaction time—sufficient
   for smooth steering.

4. **Frame staggering**: Only raycast every 3rd frame per robot to manage performance
   with many entities.

5. **Query service abstraction**: Allows swapping between static geometry and Rapier
   queries—future-proofs for dynamic level geometry.

## Acceptance Criteria

- [ ] Robots avoid walls earlier (observable in gameplay)
- [ ] No performance regression with 10+ robots (measure frame time)
- [ ] Unit tests pass for both Rapier and fallback paths
- [ ] All new/modified files under 300 LOC
- [ ] AI pathing test coverage increases from 22-33% to >60%
