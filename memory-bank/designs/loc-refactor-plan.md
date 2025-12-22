# LOC Limit Refactor Plan

**Status**: Backlog  
**Created**: 2025-12-21  
**Priority**: P2 (Technical Debt)  
**Constitution Reference**: v1.1.0, Principle III

## Executive Summary

One source file currently exceeds the 300 LOC constitutional limit (see list below).

This document outlines the refactor strategy for the remaining file and records completed refactors and outcomes.

**Total Excess LOC**: 33 lines
**Target Completion**: v0.2.0 or 2026-03-01
**Estimated Effort**: 8-12 developer hours (remaining) — PathfindingSystem refactor prioritized

---

## Refactor Priorities

### P0 - Critical (Must address first)

1. `src/simulation/ai/pathfinding/integration/PathfindingSystem.ts` (333 LOC) - Pathfinding integration

### P1 - High (Next sprint)

- **No outstanding P1 items** — Obstacle Spawner & Inspector refactors completed (see File 2 & File 3 sections)

### P2 - Medium (Following sprint)

4. `src/ecs/systems/projectileSystem.ts` (158 LOC) - Physics complexity (now below threshold; deprioritized)

### P3 - Low (Can defer)
6. `src/simulation/ai/collision/geometry.ts` (379 LOC) - Utility library
7. `src/App.tsx` (323 LOC) - Root component, lowest excess

---

## File 1: src/ecs/world.ts (refactor completed)

### Completion Summary (2025-12-22)

- **Status**: Refactor completed — `src/ecs/world.ts` reduced to **~260 LOC**.
  Entity type definitions and pool types were extracted to dedicated modules.

- **Extracted modules & files**:
  - `src/ecs/entities/*` (entity type definitions)
  - `src/ecs/pools/PoolTypes.ts` (pool type exports)
  - `src/ecs/config/WorldConfig.ts` (world config interface)

### Testing Summary

- Unit and integration tests preserved; new tests verify type exports and configuration utilities.

### Outcome

- **Success criteria met**: `world.ts` now ≤300 LOC and the codebase benefits from improved modularity and testability.

---

---

## File 2: src/components/debug/ObstacleSpawner.tsx (refactor completed)

### Completion Summary (2025-12-22)
- **Status**: Refactor completed — `src/components/debug/ObstacleSpawner.tsx` reduced to **~65 LOC**.
  The component now composes a thin UI shell and delegates behavior to extracted modules.
- **Extracted modules & files**:

  - `src/components/debug/obstacleSpawner/ObstacleList.tsx`
  - `src/components/debug/obstacleSpawner/ObstacleSpawnerForm.tsx`
  - `src/components/debug/obstacleSpawner/buildObstacle.ts`
  - `src/components/debug/obstacleSpawner/fields.tsx`
  - `src/components/debug/obstacleSpawner/formUtils.ts`
  - `src/components/debug/obstacleSpawner/obstacleSpawner.css`
  - `src/components/debug/obstacleSpawner/styles.ts`
  - `src/components/debug/obstacleSpawner/types.ts`

### Testing Summary

- Component and integration tests added where applicable (fixture I/O tests exist).
- Playwright E2E covers interactive spawn/fixture flows (`playwright/tests/obstacle-editor.spec.ts`).

### Outcome

- **Success criteria met**: `ObstacleSpawner.tsx` now ≤300 LOC and behavior intact.
  Extraction improved testability and reviewability.

---

## File 3: src/ui/inspector/ObstacleInspector.tsx (refactor completed)

### Completion Summary (2025-12-22)

- **Status**: Refactor completed — `src/ui/inspector/ObstacleInspector.tsx` reduced to **~47 LOC**.
- **Extracted modules & files**:

  - `src/ui/inspector/sections/TransformSection.tsx`
  - `src/ui/inspector/sections/PhysicsSection.tsx`
  - `src/ui/inspector/sections/AppearanceSection.tsx`
  - `src/ui/inspector/validation/obstacleValidation.ts`
  - `src/ui/inspector/hooks/useObstacleUpdates.ts`

### Testing Summary

- Unit tests added for validation schemas and section components.
- Integration tests verify inspector updates sync correctly with simulation state.

### Outcome

- **Success criteria met**: `ObstacleInspector.tsx` now ≤300 LOC and is modular and testable.

---

## File 4: src/simulation/ai/pathfinding/integration/PathfindingSystem.ts (379 LOC)

### Current State Analysis

- **Primary Issue**: Pathfinding ECS system with caching, throttling, telemetry
- **Complexity**: Medium - recent implementation, already well-structured
- **Dependencies**: NavMesh, A* search, path cache

### Refactor Strategy

**Phase 1: Extract Path Calculation Logic** (Target: -100 LOC)

```typescript
// NEW: src/simulation/ai/pathfinding/integration/PathCalculator.ts (~100 LOC)
export class PathCalculator {
  constructor(
    private navMesh: NavigationMesh,
    private search: AStarSearch,
    private smoother: PathOptimizer
  ) {}
  
  calculatePath(start: Vec3, goal: Vec3): NavigationPath { /* ... */ }
  validatePath(path: NavigationPath): boolean { /* ... */ }
}
```

**Phase 2: Extract Telemetry Logic** (Target: -50 LOC)

```typescript
// NEW: src/simulation/ai/pathfinding/integration/PathfindingTelemetry.ts (~50 LOC)
export class PathfindingTelemetry {
  emitPathCalculation(event: PathCalculationEvent): void { /* ... */ }
  emitCacheHit(robotId: string): void { /* ... */ }
  emitPerformanceMetric(metric: PerformanceMetric): void { /* ... */ }
}
```

**Remaining: src/simulation/ai/pathfinding/integration/PathfindingSystem.ts** (~230 LOC)

- ECS system integration
- Throttling and batching
- Robot component updates

### Testing Strategy

- Unit tests for PathCalculator with various scenarios
- Unit tests for telemetry emission
- Existing integration tests continue to validate system behavior

### Success Criteria

- [ ] PathfindingSystem.ts reduced to ≤300 LOC
- [ ] PathCalculator unit tested independently
- [ ] Telemetry logic unit tested
- [ ] No performance regression

### Estimated Effort: 6-8 hours

---

## File 5: src/ecs/systems/projectileSystem.ts (370 LOC)

### Current State Analysis

- **Primary Issue**: Complex projectile physics with hit detection, splash damage, effects
- **Complexity**: High - physics raycasts, multiple damage types, visual effects
- **Dependencies**: Rapier physics, ECS world, telemetry

### Refactor Strategy

**Phase 1: Extract Hit Detection** (Target: -80 LOC)

```typescript
// NEW: src/ecs/systems/projectile/hitDetection.ts (~80 LOC)
export function detectDirectHit(
  projectile: ProjectileEntity,
  robots: RobotEntity[],
  rapierWorld: RapierWorld
): RobotEntity | null { /* ... */ }

export function detectSplashDamage(
  impact: Vec3,
  radius: number,
  robots: RobotEntity[]
): Array<{ robot: RobotEntity; distance: number }> { /* ... */ }
```

**Phase 2: Extract Damage Application** (Target: -70 LOC)

```typescript
// NEW: src/ecs/systems/projectile/damageApplication.ts (~70 LOC)
export function applyDirectDamage(
  target: RobotEntity,
  damage: number,
  shooter: RobotEntity,
  telemetry: TelemetryStore
): void { /* ... */ }

export function applySplashDamage(
  targets: Array<{ robot: RobotEntity; distance: number }>,
  baseDamage: number,
  falloffRadius: number,
  shooter: RobotEntity,
  telemetry: TelemetryStore
): void { /* ... */ }
```

**Remaining: src/ecs/systems/projectileSystem.ts** (~220 LOC)

- Main system loop
- Projectile movement
- Effect spawning
- Pool management

### Testing Strategy

- Unit tests for hit detection with various collision scenarios
- Unit tests for damage calculation with falloff curves
- Integration tests for full projectile lifecycle

### Success Criteria

- [ ] projectileSystem.ts reduced to ≤300 LOC
- [ ] Hit detection logic has 100% branch coverage
- [ ] Damage application independently tested
- [ ] Existing gameplay behavior preserved

### Estimated Effort: 6-8 hours

---

## File 6: src/simulation/ai/collision/geometry.ts (379 LOC)

### Current State Analysis

- **Primary Issue**: Utility library with many geometric calculations
- **Complexity**: Medium - pure math functions, well-isolated
- **Dependencies**: Minimal (Vec3 types only)

### Refactor Strategy

**Phase 1: Group by Domain** (Target: -200 LOC)

```typescript
// NEW: src/simulation/ai/collision/geometry/lineIntersection.ts (~80 LOC)
export function lineSegmentIntersectsCircle(/* ... */): boolean { /* ... */ }
export function lineIntersectsPlane(/* ... */): Vec3 | null { /* ... */ }

// NEW: src/simulation/ai/collision/geometry/distanceCalculations.ts (~60 LOC)
export function pointToLineSegmentDistance(/* ... */): number { /* ... */ }
export function pointToPlaneDistance(/* ... */): number { /* ... */ }

// NEW: src/simulation/ai/collision/geometry/boundingVolumes.ts (~60 LOC)
export function computeAABB(points: Vec3[]): AABB { /* ... */ }
export function sphereIntersectsAABB(/* ... */): boolean { /* ... */ }
```

**Phase 2: Extract Constants and Types** (Target: -30 LOC)

```typescript
// NEW: src/simulation/ai/collision/geometry/types.ts (~30 LOC)
export interface AABB { min: Vec3; max: Vec3; }
export interface Ray { origin: Vec3; direction: Vec3; }
export const EPSILON = 1e-6;
```

**Remaining: src/simulation/ai/collision/geometry.ts** (~150 LOC)

- Main exports (re-exports from submodules)
- High-level convenience functions

### Testing Strategy

- Unit tests already exist for most geometry functions
- Move tests to match new file structure
- Add property-based tests for numerical stability

### Success Criteria

- [ ] geometry.ts reduced to ≤300 LOC (or eliminated as barrel export)
- [ ] Functions grouped by logical domain
- [ ] All existing tests pass with new structure
- [ ] No behavioral changes

### Estimated Effort: 4-6 hours

---

## File 7: src/App.tsx (323 LOC)

### Current State Analysis

- **Primary Issue**: Root component with routing, providers, global state, scene setup
- **Complexity**: Medium - mostly composition, less logic
- **Dependencies**: Many (r3f, Rapier, Zustand, UI components)

### Refactor Strategy

**Phase 1: Extract Provider Setup** (Target: -60 LOC)

```typescript
// NEW: src/components/providers/AppProviders.tsx (~60 LOC)
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <Canvas {...canvasConfig}>
        <Physics {...physicsConfig}>
          {children}
        </Physics>
      </Canvas>
    </QueryClientProvider>
  );
}
```

**Phase 2: Extract Scene Setup** (Target: -80 LOC)

```typescript
// NEW: src/components/scene/SceneSetup.tsx (~80 LOC)
export function SceneSetup() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} castShadow />
      <fog attach="fog" args={['#000', 10, 100]} />
      <CameraController />
      <SkyBox />
    </>
  );
}
```

**Remaining: src/App.tsx** (~180 LOC)

- Main App component structure
- Conditional rendering (game states)
- UI overlay coordination

### Testing Strategy

- Component test for AppProviders ensures all contexts available
- Integration test for SceneSetup renders correctly
- E2E test validates full app initialization

### Success Criteria

- [ ] App.tsx reduced to ≤300 LOC
- [ ] Provider setup extracted and testable
- [ ] Scene setup independently renderable
- [ ] App still initializes correctly

### Estimated Effort: 3-5 hours

---

## Implementation Timeline

### Sprint 1 (January 2026)

- **Week 1**: world.ts refactor (P0)
- **Week 2**: ObstacleSpawner.tsx refactor (P1)
- **Week 3**: ObstacleInspector.tsx refactor (P1)

### Sprint 2 (February 2026)

- **Week 1**: PathfindingSystem.ts refactor (P2)
- **Week 2**: projectileSystem.ts refactor (P2)

### Sprint 3 (March 2026)

- **Week 1**: geometry.ts refactor (P3)
- **Week 2**: App.tsx refactor (P3)
- **Week 3**: Final validation and documentation

---

## Risk Mitigation

### High Risk Areas

1. **world.ts**: Core dependency, breaking changes could cascade
   - Mitigation: Incremental extraction, maintain backwards-compatible exports
   
2. **ObstacleSpawner.tsx**: Complex 3D interactions
   - Mitigation: Add E2E tests before refactor, manual QA pass

3. **projectileSystem.ts**: Physics-dependent, performance-critical
   - Mitigation: Benchmark before/after, profile with many projectiles

### Testing Requirements

- Zero test failures after each refactor
- No performance regressions (validate with `npm run test:coverage` and profiling)
- Manual QA for UI-heavy refactors (ObstacleSpawner, ObstacleInspector, App)

---

## Exemption Alternative

If timeline cannot be met, files MAY receive temporary exemptions with the following requirements:

1. Add exemption header to file (within first 30 lines):
   ```typescript
   // CONSTITUTION-EXEMPT: [Brief justification]
   // Exemption granted: 2025-12-21 | Target refactor: v0.3.0 or 2026-06-01
   // Issue: #[ISSUE_NUMBER]
   ```

2. Create GitHub issue with:
   - Link to this design document
   - Justification for deferral
   - Updated target date
   - Commitment to refactor by specified version

3. Exemption review required at each release milestone.

---

## Success Metrics

- [ ] All 7 files reduced to ≤300 LOC OR have documented exemptions
- [ ] Zero test regressions from refactor work
- [ ] No performance degradation (validate with benchmarks)
- [ ] Code review approval for each refactor PR
- [ ] Documentation updated for new module structure

**Target Completion**: v0.2.0 or 2026-03-01  
**Review Cadence**: Monthly progress check in sprint retrospectives  
**Owner**: Development team (assign specific files to team members)

---

## References

- Constitution v1.1.0, Principle III: Size & Separation Limits
- `.specify/memory/constitution.md`
- `scripts/check_source_size.js` - LOC enforcement script
- `.github/workflows/constitution_checks.yml` - CI enforcement
