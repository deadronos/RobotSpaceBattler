# Reactive Steering Deprecation Analysis & Migration Plan

**Status**: Proposal  
**Date**: 2025-01-XX  
**Context**: Phase 9 - NavMesh Pathfinding Polish

## Executive Summary

The legacy reactive steering system (`src/simulation/ai/pathing/avoidance.ts`) is used alongside predictive avoidance but can be deprecated now that NavMesh pathfinding provides superior obstacle avoidance through planned paths and clearance zones.

**Recommendation**: Deprecate reactive steering and migrate to NavMesh pathfinding with behavior blending.

## Current Usage Analysis

### Reactive Steering Components

1. **`avoidance.ts`** - Reactive avoidance module
   - `computeAvoidance()` - Proximity-based wall/pillar pushing
   - `AVOIDANCE_RADIUS = 0.1` - Very small detection radius
   - Static geometry: `ARENA_WALLS`, `ARENA_PILLARS`
   - Runtime obstacles: Dynamic obstacle support

2. **Integration Point**: `pathing/index.ts` `planRobotMovement()`

   ```typescript
   // Line ~120: Apply reactive avoidance (always runs)
   const avoidance = computeAvoidance(robot.position, context?.obstacles);
   if (lengthVec3(avoidance) > 0) {
     desiredVelocity = addVec3(
       desiredVelocity,
       scaleVec3(normalizeVec3(avoidance), SEEK_SPEED * AVOIDANCE_STRENGTH),
     );
   }

   // Line ~130: Apply predictive avoidance when Rapier world is available
   if (context?.rapierWorld) {
     // ...predictive avoidance logic
   }
   ```

### Dependencies

**Production Code**:

- `src/simulation/ai/pathing/index.ts` - Main integration
- `src/simulation/ai/pathing/avoidance.ts` - Core module

**Tests**:

- `tests/ai/obstacleAvoidance.spec.ts` - 1 test
- `tests/ai/pathing.helpers.test.ts` - 1 test (AVOIDANCE_RADIUS constant)

## Comparison: Reactive vs NavMesh

### Reactive Steering (Legacy)

**Pros**:

- Simple implementation
- Low computational cost
- Works without physics engine
- Deterministic (good for testing)

**Cons**:

- ❌ **Tiny detection radius (0.1)** - Robots react too late
- ❌ **No lookahead** - Can't anticipate collisions
- ❌ **Local-only solution** - Can get stuck in corners
- ❌ **Reactive, not proactive** - Reacts after getting close
- ❌ **Limited to static geometry** - Poor with complex obstacles

### NavMesh Pathfinding (Current)

**Pros**:

- ✅ **Clearance zones (1.0)** - 10x larger safety margin
- ✅ **Global planning** - Paths around obstacles optimally
- ✅ **Proactive** - Avoids obstacles before approaching
- ✅ **Smooth paths** - String-pulling optimization
- ✅ **Dynamic re-planning** - Adapts to changing environment
- ✅ **Performance** - <5ms P95, <16ms for 20 robots
- ✅ **Behavior blending** - Integrates with combat/retreat

**Cons**:

- Higher computational cost (mitigated by caching & throttling)
- Requires NavMesh generation step

### Predictive Avoidance (Hybrid)

**Current Role**: Forward-looking raycast avoidance using Rapier

- **Status**: Used alongside reactive steering
- **Purpose**: Detect walls ahead before collision
- **Evaluation**: Overlaps with NavMesh - both solve same problem

**Recommendation**: Predictive avoidance can also be deprecated once NavMesh is fully adopted, as NavMesh paths inherently avoid walls.

## Migration Strategy

### Phase 1: Soft Deprecation (Complete)

**Goal**: Mark systems as deprecated but keep functional

**Actions**:

1. ✅ Add deprecation comments to `avoidance.ts`
2. ✅ Add console warnings when reactive steering is used
3. ✅ Update documentation to recommend NavMesh (AGENTS.md and docs/pathfinding-quickstart.md already updated)
4. ✅ Mark tests as "legacy"

**Code Changes**:

```typescript
// avoidance.ts
/**
 * @deprecated Use NavMesh pathfinding (PathfindingSystem) instead.
 * This reactive steering system has limited lookahead and small detection
 * radius. NavMesh provides superior obstacle avoidance with clearance zones.
 *
 * Scheduled for removal: v2.0.0
 */
export function computeAvoidance(...) { /* existing code */ }
```

### Phase 2: Parallel Operation (1-2 sprints)

**Goal**: Run NavMesh pathfinding alongside reactive steering, measure differences

**Actions**:

1. Add feature flag: `USE_NAVMESH_PATHFINDING` (default: true)
2. Track metrics: collision rate, stuck events, average path smoothness
3. A/B test in gameplay scenarios
4. Gather performance data

**Success Criteria**:

- NavMesh collision rate ≤ reactive steering
- No significant increase in stuck events
- Performance <16ms per frame (60fps)
- User-facing smoothness improved

### Phase 3: Hard Deprecation (2-3 sprints)

**Goal**: Remove reactive steering from main code path

**Actions**:

1. Remove reactive steering call from `planRobotMovement()`
2. Keep `avoidance.ts` file for tests/fallback
3. Update all AI systems to use PathfindingSystem
4. Update documentation and examples

**Code Changes**:

```typescript
// pathing/index.ts - BEFORE
const avoidance = computeAvoidance(robot.position, context?.obstacles);
if (lengthVec3(avoidance) > 0) {
  desiredVelocity = addVec3(desiredVelocity, ...);
}

// pathing/index.ts - AFTER
// REMOVED: Reactive avoidance replaced by NavMesh pathfinding
// See PathfindingSystem for obstacle avoidance via planned paths
```

### Phase 4: Complete Removal (v2.0.0)

**Goal**: Remove all reactive steering code

**Actions**:

1. Delete `src/simulation/ai/pathing/avoidance.ts`
2. Delete tests: `obstacleAvoidance.spec.ts`, `pathing.helpers.test.ts`
3. Remove fallback code paths
4. Update all documentation
5. Major version bump (breaking change)

## Risk Assessment

### Low Risk

- **Test Coverage**: NavMesh has 55 comprehensive tests
- **Performance**: Already validated (<5ms P95, <5MB memory)
- **Integration**: Behavior blending system mature and tested

### Medium Risk

- **Edge Cases**: Some scenarios may not be covered by current tests
- **Dynamic Obstacles**: NavMesh may need tuning for moving obstacles
- **Gameplay Feel**: Subtle changes in robot movement behavior

### Mitigation

1. **Extensive Testing**: Run all E2E tests, manual gameplay testing
2. **Feature Flagging**: Easy rollback if issues found
3. **Gradual Rollout**: Soft → Parallel → Hard → Complete
4. **Monitoring**: Track collision events, stuck events, performance metrics

## Timeline Estimate

| Phase                           | Duration | Effort   | Dependencies             |
| ------------------------------- | -------- | -------- | ------------------------ |
| **Phase 1**: Soft Deprecation   | 1 day    | 2 hours  | None                     |
| **Phase 2**: Parallel Operation | 2 weeks  | 10 hours | NavMesh Phase 9 complete |
| **Phase 3**: Hard Deprecation   | 1 week   | 8 hours  | Phase 2 validation       |
| **Phase 4**: Complete Removal   | 1 day    | 4 hours  | Major version release    |

**Total Effort**: ~24 hours over ~4 weeks

## Acceptance Criteria

### Phase 1 Complete (Soft Deprecation)

- [x] Deprecation comments added to avoidance.ts
- [x] Documentation updated to recommend NavMesh
- [x] Tests marked as "legacy"

### Phase 2 Complete (Parallel Operation)

- [ ] Feature flag implemented and tested
- [ ] Metrics collected for 2 weeks
- [ ] A/B test shows NavMesh ≥ reactive steering performance
- [ ] No significant gameplay regressions

### Phase 3 Complete (Hard Deprecation)

- [ ] Reactive steering removed from main code path
- [ ] All AI systems migrated to PathfindingSystem
- [ ] Documentation and examples updated
- [ ] All tests passing

### Phase 4 Complete (Full Removal)

- [ ] avoidance.ts and related tests deleted
- [ ] Major version bump (v2.0.0)
- [ ] Migration guide published
- [ ] No references to reactive steering in codebase

## Rollback Plan

If NavMesh pathfinding shows critical issues during migration:

1. **Immediate**: Disable feature flag (`USE_NAVMESH_PATHFINDING = false`)
2. **Short-term**: Investigate root cause, fix NavMesh issues
3. **Long-term**: Re-run validation phase (Phase 2) before retrying

## Recommendations

1. **Start Phase 1 immediately** - Low risk, high clarity
2. **Delay Phase 2 until after Phase 9 complete** - Ensure NavMesh is fully polished
3. **Run Phase 2 for full 2 weeks** - Don't rush validation
4. **Phase 4 only with major version** - Breaking change requires coordination

## Conclusion

Reactive steering (`avoidance.ts`) served its purpose but is now superseded by NavMesh pathfinding, which provides:

- Better obstacle avoidance (clearance zones vs tiny detection radius)
- Proactive planning vs reactive steering
- Global optimization vs local-only solutions
- Behavior blending for complex AI scenarios

**Recommendation**: Proceed with phased deprecation starting with Phase 1 soft deprecation.
