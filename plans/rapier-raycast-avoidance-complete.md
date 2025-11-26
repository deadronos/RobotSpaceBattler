# Plan Complete: Rapier Raycast Integration for Predictive Wall Avoidance

Integrated Rapier raycasting for predictive wall detection, replacing reactive-only
avoidance with forward-looking collision prediction. Robots now detect walls earlier
and steer away before collision using a 3-ray fan pattern with frame staggering.

## Phases Completed: 8 of 8

1. ✅ Phase 1: Create Collision Group Constants
2. ✅ Phase 2: Create Physics Query Service
3. ✅ Phase 3: Create Raycast Scheduler
4. ✅ Phase 4: Create Predictive Avoidance Module
5. ✅ Phase 5: Wire Rapier World to BattleRunner
6. ✅ Phase 6: Connect Rapier from Simulation Component
7. ✅ Phase 7: Integrate Predictive Avoidance into Movement Planning
8. ✅ Phase 8: Add Collision Groups to Visual Components

## All Files Created/Modified

### New Files
- `src/lib/physics/collisionGroups.ts` (~30 LOC)
- `src/simulation/ai/pathing/physicsQueryService.ts` (~126 LOC)
- `src/simulation/ai/pathing/raycastScheduler.ts` (~47 LOC)
- `src/simulation/ai/pathing/predictiveAvoidance.ts` (~110 LOC)
- `tests/lib/collisionGroups.spec.ts`
- `tests/ai/physicsQueryService.spec.ts`
- `tests/ai/raycastScheduler.spec.ts`
- `tests/ai/predictiveAvoidance.spec.ts`
- `tests/runtime/battleRunner.spec.ts`

### Modified Files
- `src/simulation/world.ts` (+2 LOC)
- `src/runtime/simulation/battleRunner.ts` (+10 LOC)
- `src/components/Simulation.tsx` (+19 LOC)
- `src/simulation/ai/pathing/movementPlanning.ts` (+20 LOC)
- `src/simulation/ai/pathing/obstacleAvoidance.ts` (+2 LOC)
- `src/visuals/arena/Walls.tsx` (+5 LOC)
- `src/visuals/arena/Pillars.tsx` (+5 LOC)
- `tests/ai/movementPlanning.spec.ts` (+107 LOC)
- `tests/ai/obstacleAvoidance.spec.ts` (+8 LOC)

## Key Functions/Classes Added

- `CollisionGroup` - bitmask constants (WALL, PILLAR, ROBOT, PROJECTILE, STATIC_GEOMETRY)
- `interactionGroups(membership, filter)` - packs collision masks for Rapier
- `PhysicsQueryService` - interface for raycasting abstraction
- `createPhysicsQueryService(world)` - factory with null-safe fallback
- `shouldRaycastThisFrame(entityId, frameCount)` - frame staggering
- `RaycastCache` - caches avoidance results between frames
- `computePredictiveAvoidance(position, velocity, queryService)` - 3-ray fan detection
- `BattleRunner.setRapierWorld(world)` - passes Rapier world to simulation
- `BattleRunner.getRapierWorld()` - retrieves Rapier world reference

## Test Coverage

- Total tests written: 50+ new tests
- All tests passing: ✅ (100 tests total)
- Coverage areas:
  - Collision group bitmasks and packing
  - Physics query service (Rapier and fallback paths)
  - Raycast scheduling and caching
  - Predictive avoidance vector computation
  - BattleRunner Rapier world management
  - Movement planning integration

## Recommendations for Next Steps

1. **Manual Testing**: Run the game and observe robot behavior near walls
2. **Performance Monitoring**: Check frame times with 10+ robots to verify no regression
3. **Tuning**: Adjust `DEFAULT_PREDICTIVE_CONFIG` values if needed (lookahead, fan angle, strength)
4. **Future Enhancement**: Add visual debug mode to show raycast rays in dev tools
