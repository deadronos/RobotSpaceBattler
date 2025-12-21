# LOC Limit Refactor Plan

**Status**: Backlog  
**Created**: 2025-12-21  
**Priority**: P2 (Technical Debt)  
**Constitution Reference**: v1.1.0, Principle III

## Executive Summary

Seven source files currently exceed the 300 LOC constitutional limit. This document outlines refactor strategies for each file to bring them into compliance while maintaining functionality and test coverage.

**Total Excess LOC**: 2,412 lines  
**Target Completion**: v0.2.0 or 2026-03-01  
**Estimated Effort**: 40-60 developer hours across 7 refactors

---

## Refactor Priorities

### P0 - Critical (Must address first)
1. `src/ecs/world.ts` (598 LOC) - Core system, highest complexity

### P1 - High (Next sprint)
2. `src/components/ObstacleSpawner.tsx` (590 LOC) - UI complexity
3. `src/ui/inspector/ObstacleInspector.tsx` (473 LOC) - UI complexity

### P2 - Medium (Following sprint)
4. `src/simulation/ai/pathfinding/integration/PathfindingSystem.ts` (379 LOC) - New system
5. `src/ecs/systems/projectileSystem.ts` (370 LOC) - Physics complexity

### P3 - Low (Can defer)
6. `src/simulation/ai/collision/geometry.ts` (379 LOC) - Utility library
7. `src/App.tsx` (323 LOC) - Root component, lowest excess

---

## File 1: src/ecs/world.ts (598 LOC)

### Current State Analysis
- **Primary Issue**: Massive entity type definitions + pool management + world orchestration
- **Complexity**: High - central to ECS architecture
- **Dependencies**: Referenced by nearly every system

### Refactor Strategy

**Phase 1: Extract Entity Type Definitions** (Target: -250 LOC)

```typescript
// NEW: src/ecs/entities/RobotEntity.ts (~50 LOC)
export interface RobotEntity {
  id: string;
  team: TeamId;
  health: HealthComponent;
  position: Vec3;
  // ... robot-specific fields
}

// NEW: src/ecs/entities/ProjectileEntity.ts (~30 LOC)
export interface ProjectileEntity {
  id: string;
  shooter: RobotEntity;
  // ... projectile fields
}

// NEW: src/ecs/entities/ObstacleEntity.ts (~25 LOC)
// NEW: src/ecs/entities/EffectEntity.ts (~20 LOC)
// NEW: src/ecs/entities/index.ts (re-exports)
```

**Phase 2: Extract Pool Type Definitions** (Target: -80 LOC)

```typescript
// NEW: src/ecs/pools/PoolTypes.ts
export interface ProjectilePool { /* ... */ }
export interface EffectPool { /* ... */ }
```

**Phase 3: Extract World Configuration** (Target: -50 LOC)

```typescript
// NEW: src/ecs/config/WorldConfig.ts
export interface BattleWorldConfig {
  initialRobotCount: number;
  maxProjectiles: number;
  // ... configuration
}
```

**Remaining: src/ecs/world.ts** (~200 LOC)
- Core World class
- Pool initialization
- Entity spawn orchestration

### Testing Strategy
- ✅ Existing tests continue to pass (no behavior change)
- Add integration test verifying entity type exports
- Add unit tests for extracted configuration utilities

### Success Criteria
- [ ] world.ts reduced to ≤300 LOC
- [ ] All entity types have dedicated modules
- [ ] Zero test failures
- [ ] Import paths updated across codebase

### Estimated Effort: 8-12 hours

---

## File 2: src/components/ObstacleSpawner.tsx (590 LOC)

### Current State Analysis
- **Primary Issue**: Arena editor UI with multiple modes, state management, and 3D interaction
- **Complexity**: High - interactive 3D editing, undo/redo, fixture I/O
- **Dependencies**: Rapier physics, r3f, Zustand stores

### Refactor Strategy

**Phase 1: Extract State Management** (Target: -150 LOC)

```typescript
// NEW: src/components/ObstacleSpawner/hooks/useObstacleEditor.ts (~80 LOC)
export function useObstacleEditor() {
  // Mode switching logic
  // Selection state
  // Undo/redo stack
  return { mode, selectedId, undo, redo, /* ... */ };
}

// NEW: src/components/ObstacleSpawner/hooks/useObstacleManipulation.ts (~70 LOC)
export function useObstacleManipulation() {
  // Drag handlers
  // Placement logic
  // Collision detection
  return { onDrag, onPlace, onDelete, /* ... */ };
}
```

**Phase 2: Extract UI Components** (Target: -200 LOC)

```typescript
// NEW: src/components/ObstacleSpawner/EditorToolbar.tsx (~80 LOC)
// - Mode buttons, fixture controls, undo/redo UI

// NEW: src/components/ObstacleSpawner/ObstaclePreview.tsx (~60 LOC)
// - 3D preview mesh rendering

// NEW: src/components/ObstacleSpawner/ObstacleTransformHandles.tsx (~60 LOC)
// - Transform gizmos for selected obstacles
```

**Phase 3: Extract Fixture I/O Logic** (Target: -80 LOC)

```typescript
// NEW: src/components/ObstacleSpawner/fixtureIO.ts (~80 LOC)
export function exportFixture(world: BattleWorld): ObstacleFixture { /* ... */ }
export function importFixture(world: BattleWorld, fixture: ObstacleFixture): void { /* ... */ }
```

**Remaining: src/components/ObstacleSpawner.tsx** (~160 LOC)
- Main component orchestration
- R3F scene integration
- Event coordination

### Testing Strategy
- Add component tests for extracted hooks using @testing-library/react-hooks
- Add integration test for fixture import/export roundtrip
- Verify 3D interaction with Playwright E2E test

### Success Criteria
- [ ] ObstacleSpawner.tsx reduced to ≤300 LOC
- [ ] All hooks unit tested independently
- [ ] UI components render correctly in isolation
- [ ] Fixture I/O has integration tests

### Estimated Effort: 10-14 hours

---

## File 3: src/ui/inspector/ObstacleInspector.tsx (473 LOC)

### Current State Analysis
- **Primary Issue**: Inspector panel with forms, validation, real-time updates
- **Complexity**: Medium-High - controlled inputs, physics sync, conditional rendering
- **Dependencies**: React Hook Form, Rapier physics

### Refactor Strategy

**Phase 1: Extract Form Sections** (Target: -200 LOC)

```typescript
// NEW: src/ui/inspector/sections/TransformSection.tsx (~60 LOC)
// - Position, rotation, scale inputs

// NEW: src/ui/inspector/sections/PhysicsSection.tsx (~70 LOC)
// - Physics properties (mass, friction, etc.)

// NEW: src/ui/inspector/sections/AppearanceSection.tsx (~70 LOC)
// - Visual properties (color, material)
```

**Phase 2: Extract Validation Logic** (Target: -80 LOC)

```typescript
// NEW: src/ui/inspector/validation/obstacleValidation.ts (~80 LOC)
export const transformSchema = z.object({ /* ... */ });
export const physicsSchema = z.object({ /* ... */ });
export function validateObstacleUpdate(data: Partial<ObstacleEntity>): ValidationResult { /* ... */ }
```

**Phase 3: Extract Update Handlers** (Target: -50 LOC)

```typescript
// NEW: src/ui/inspector/hooks/useObstacleUpdates.ts (~50 LOC)
export function useObstacleUpdates(obstacle: ObstacleEntity) {
  // Debounced update logic
  // Physics sync
  // Validation error handling
  return { onUpdate, isValid, errors };
}
```

**Remaining: src/ui/inspector/ObstacleInspector.tsx** (~140 LOC)
- Main inspector layout
- Section orchestration
- Conditional visibility logic

### Testing Strategy
- Unit tests for validation schemas with edge cases
- Component tests for each form section in isolation
- Integration test for full update flow with physics sync

### Success Criteria
- [ ] ObstacleInspector.tsx reduced to ≤300 LOC
- [ ] Form sections independently testable
- [ ] Validation logic has 100% branch coverage
- [ ] Update handlers tested with mock physics world

### Estimated Effort: 8-10 hours

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
