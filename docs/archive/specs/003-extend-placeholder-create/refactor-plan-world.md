# Refactor Plan: src/ecs/world.ts → ≤300 LOC

**Target**: Reduce from 471 LOC to ≤300 LOC (171 line reduction, 36% reduction)

**Status**: Analysis & planning phase

---

## 1. Current Structure Analysis (Function-by-Function LOC Breakdown)

### Imports & Type Definitions (Lines 1-75)
- **Lines**: ~75 LOC
- **Content**: Module imports (React, types, entities, systems), interface definitions
- **Category**: Metadata (cannot reduce significantly)
- **Action**: Keep as-is; this is necessary boilerplate

### Context Setup (Lines 77-78)
- **Lines**: 2 LOC
- **Content**: `TEAM_LIST: Team[] = ["red", "blue"]`
- **Action**: Keep; lightweight constant

### Context Creation (Lines 80-81)
- **Lines**: 2 LOC
- **Content**: `SimulationWorldContext = createContext<SimulationWorld | null>(null)`
- **Action**: Keep; core to provider pattern

### Factory Functions - Pure ECS/Entity Creation (Lines 83-104)
- **Lines**: 22 LOC
- **Functions**:
  - `createECSCollections()` - 6 LOC - **EXTRACT**
  - `SimulationWorldProvider` - 8 LOC - **KEEP** (React provider, minimal)
  - `useSimulationWorld()` - 8 LOC - **KEEP** (public hook, essential)
- **Candidates**: `createECSCollections()` is a pure factory

### Team Management (Lines 106-128)
- **Lines**: 23 LOC
- **Functions**:
  - `createTeams()` - 4 LOC - **EXTRACT**
  - `syncTeams()` - 6 LOC - **EXTRACT**
  - `resetBattle()` - 13 LOC - **EXTRACT** (but has many calls to other functions)

### World Initialization (Lines 130-148)
- **Lines**: 19 LOC
- **Content**: `initializeSimulation()` - **KEEP** (public API, coordinates initialization)

### Projectile Management (Lines 150-174)
- **Lines**: 25 LOC
- **Content**: `createPhysicsProjectile()` - **EXTRACT** (pure factory, well-scoped)

### Main Simulation Loop (Lines 176-214)
- **Lines**: 39 LOC
- **Content**: `stepSimulation()` - **KEEP** (core public API, orchestrates systems)

### Data Accessors & UI State Functions (Lines 216-420)
- **Lines**: 205 LOC
- **Functions**: 27 public API functions
  - Simple getters (4 LOC each): `getProjectiles()`, `getSimulationState()`, `getArenaConfig()`, etc. - **KEEP** (minimal overhead)
  - Victory/restart management (5-8 LOC each): `pauseAutoRestart()`, `resumeAutoRestart()`, `resetAutoRestartCountdown()`, `openStatsOverlay()`, `closeStatsOverlay()`, `openSettingsOverlay()`, `closeSettingsOverlay()` - **EXTRACT** (delegation wrappers)
  - Damage/elimination functions (3-5 LOC each): `inflictDamage()`, `eliminateRobot()` - **KEEP** (minimal)
  - Physics manipulation (8-10 LOC each): `setPhysicsBodyPosition()`, `applyPhysicsImpulse()`, `spawnPhysicsProjectile()`, `getPhysicsSnapshot()` - **EXTRACT** (physics-specific)
  - Robot property setters (10-15 LOC each): `setRobotHealth()`, `setRobotKills()`, `setRobotPosition()` - **EXTRACT** (robot state management)
  - Performance management (3-4 LOC each): `recordFrameMetrics()`, `setAutoScalingEnabled()`, `getPerformanceOverlayState()` - **EXTRACT** (performance concern)
  - Misc: `calculateDistance()`, `applyTeamComposition()`, `triggerCaptainReelection()` - **KEEP** (diverse concerns, compact)

### Internal Utilities (Lines 411-418)
- **Lines**: 8 LOC
- **Functions**:
  - `findRobot()` - 2 LOC - **EXTRACT** (duplicate of `getRobotById`)
  - `refreshTeam()` - 2 LOC - **EXTRACT** (simple wrapper)

### Summary by Category
| Category | LOC | Action | Extractable LOC |
|----------|-----|--------|-----------------|
| Imports & Types | 75 | Keep | 0 |
| Context Setup | 4 | Keep | 0 |
| Factory Functions (ECS/Entities) | 22 | Mixed | 10 |
| Team Management | 23 | Extract | 23 |
| World Initialization | 19 | Keep | 0 |
| Projectile Management | 25 | Extract | 25 |
| Main Simulation Loop | 39 | Keep | 0 |
| Data Accessors & Wrappers | 205 | Mixed | 120 |
| Internal Utilities | 8 | Extract | 8 |
| **Total** | **471** | - | **~186** |

---

## 2. Proposed Module Extraction Strategy

### Phase 1: High-Impact, Low-Risk Extractions (110-120 LOC savings)

Extract into **`src/ecs/factories/`** directory:

#### 2.1 `src/ecs/factories/createCollections.ts` (~15 LOC)
- `createECSCollections()` - pure factory
- Imports: `MiniplexWorld`
- Exports: `createECSCollections`
- **Risk**: MINIMAL - pure function, no dependencies on world context
- **Reason**: Pure factory, zero side effects

#### 2.2 `src/ecs/factories/createTeams.ts` (~8 LOC)
- `createTeams()` - creates team records from arena
- Imports: `Team`, `ArenaEntity`, `createInitialTeam`
- Exports: `createTeams`
- **Risk**: MINIMAL - pure factory
- **Reason**: Entity factory, self-contained

#### 2.3 `src/ecs/factories/createProjectile.ts` (~20 LOC)
- `createPhysicsProjectile()` - complex projectile factory
- Extract helper: `spawnProjectileBody`, `getWeaponData`
- Imports: world, weapon config, physics
- Exports: `createPhysicsProjectile`
- **Risk**: LOW - single responsibility, self-contained
- **Reason**: High LOC but focused on projectile creation; reusable pattern

#### 2.4 `src/ecs/management/robotManagement.ts` (~40 LOC)
- `findRobot()` - helper
- `setRobotHealth()` - robot state manipulation
- `setRobotKills()` - robot state manipulation
- `setRobotPosition()` - robot state manipulation
- `refreshTeam()` - helper
- Imports: `Vector3`, `cloneVector`, `setRobotBodyPosition`, `refreshTeamStats`
- Exports: All functions
- **Risk**: LOW - isolated robot mutations, no cross-cutting concerns
- **Reason**: Cohesive set of robot property setters; reduces world.ts boilerplate

#### 2.5 `src/ecs/management/physicsManagement.ts` (~35 LOC)
- `setPhysicsBodyPosition()` - physics state setter
- `applyPhysicsImpulse()` - physics state mutation
- `getPhysicsSnapshot()` - physics accessor
- Helper: `getRobotById()`
- Imports: `Vector3`, `setRobotBodyPosition`, `applyRobotImpulse`, `getPhysicsSnapshotInternal`
- Exports: All functions
- **Risk**: LOW - focused on physics API surface
- **Reason**: Physics-specific, well-scoped public API

#### 2.6 `src/ecs/management/battleStateManagement.ts` (~20 LOC)
- `resetBattle()` - battle reset orchestration
- `syncTeams()` - ECS sync
- Imports: `SimulationWorld`, `Team`, entity factories
- Exports: Both functions
- **Risk**: MEDIUM - multiple dependencies (teams, physics, spawn system)
- **Reason**: Cohesive battle state operations; improves separation of concerns

#### 2.7 `src/ecs/api/uiIntegration.ts` (~45 LOC)
- Victory/restart wrappers: `pauseAutoRestart()`, `resumeAutoRestart()`, `resetAutoRestartCountdown()`
- Overlay wrappers: `openStatsOverlay()`, `closeStatsOverlay()`, `openSettingsOverlay()`, `closeSettingsOverlay()`
- Performance wrappers: `recordFrameMetrics()`, `setAutoScalingEnabled()`, `getPerformanceOverlayState()`
- Imports: `SimulationWorld`, internal simulation functions
- Exports: All functions
- **Risk**: MINIMAL - thin delegation wrappers
- **Reason**: UI-specific concerns; improves modularity; these are boilerplate delegation

### Phase 2: Consolidation in world.ts (Result: ~300 LOC)

**Keep in `src/ecs/world.ts`**:
- All imports + re-exports from new modules
- `TEAM_LIST` constant
- `SimulationWorldContext` and provider infrastructure
- `useSimulationWorld()` hook
- `SimulationWorld` interface
- `initializeSimulation()` - coordinates world creation
- `stepSimulation()` - main loop orchestration
- `spawnPhysicsProjectile()` - wrapper to exported factory
- Simple accessors: `getProjectiles()`, `getSimulationState()`, `getArenaConfig()`, `getRobotById()`
- Simple operations: `inflictDamage()`, `eliminateRobot()`, `calculateDistance()`, `applyTeamComposition()`, `triggerCaptainReelection()`
- Re-export `getDamageMultiplier` from weapon system

---

## 3. Target Modules

### Directory Structure
```
src/ecs/
├── world.ts                          (300 LOC) - Main facade & React integration
├── factories/
│   ├── createCollections.ts          (~15 LOC)
│   ├── createTeams.ts                (~8 LOC)
│   └── createProjectile.ts           (~20 LOC)
├── management/
│   ├── robotManagement.ts            (~40 LOC)
│   ├── physicsManagement.ts          (~35 LOC)
│   └── battleStateManagement.ts      (~20 LOC)
└── api/
    └── uiIntegration.ts              (~45 LOC)
```

### Module Responsibilities

| Module | Responsibility | Exports |
|--------|------------------|---------|
| `world.ts` | React context, initialization orchestration, main loop, simple accessors | `SimulationWorld`, `SimulationWorldProvider`, `useSimulationWorld`, `initializeSimulation`, `stepSimulation`, etc. |
| `createCollections.ts` | Pure ECS collection factory | `createECSCollections` |
| `createTeams.ts` | Team entity factory | `createTeams` |
| `createProjectile.ts` | Projectile creation with physics | `createPhysicsProjectile` |
| `robotManagement.ts` | Robot state mutation API | `setRobotHealth`, `setRobotKills`, `setRobotPosition`, `findRobot` |
| `physicsManagement.ts` | Physics state manipulation API | `setPhysicsBodyPosition`, `applyPhysicsImpulse`, `getPhysicsSnapshot` |
| `battleStateManagement.ts` | Battle lifecycle operations | `resetBattle`, `syncTeams` |
| `uiIntegration.ts` | UI state & overlay control | `pauseAutoRestart`, `openStatsOverlay`, `recordFrameMetrics`, etc. |

---

## 4. Public API Preservation Strategy

### Current Public API (exported from world.ts)

**Interfaces**:
- `SimulationWorld` - keep in world.ts

**Components/Hooks**:
- `SimulationWorldProvider` - keep in world.ts
- `useSimulationWorld` - keep in world.ts

**Factory**:
- `initializeSimulation()` - keep in world.ts

**Simulation**:
- `stepSimulation()` - keep in world.ts

**Data Access**:
- `getProjectiles()` - keep in world.ts
- `getSimulationState()` - keep in world.ts
- `getArenaConfig()` - keep in world.ts
- `getRobotById()` - keep in world.ts
- `getPhysicsSnapshot()` - re-export from physicsManagement.ts
- `getPerformanceOverlayState()` - re-export from uiIntegration.ts

**Mutations**:
- `inflictDamage()` - keep in world.ts (minimal wrapper)
- `eliminateRobot()` - keep in world.ts (minimal wrapper)
- `calculateDistance()` - keep in world.ts (utility)
- `applyTeamComposition()` - keep in world.ts (minimal wrapper)
- `triggerCaptainReelection()` - keep in world.ts (minimal wrapper)
- All physics/robot/restart functions - re-export from management modules

**Re-exports**:
- `getDamageMultiplier` from weaponSystem - keep in world.ts

### Import Strategy in world.ts

```typescript
// From new modules
export { createECSCollections } from "./factories/createCollections";
export { createTeams } from "./factories/createTeams";
export { 
  setRobotHealth, 
  setRobotKills, 
  setRobotPosition 
} from "./management/robotManagement";
export {
  setPhysicsBodyPosition,
  applyPhysicsImpulse,
  getPhysicsSnapshot,
  spawnPhysicsProjectile
} from "./management/physicsManagement";
export {
  pauseAutoRestart,
  resumeAutoRestart,
  resetAutoRestartCountdown,
  openStatsOverlay,
  closeStatsOverlay,
  openSettingsOverlay,
  closeSettingsOverlay,
  recordFrameMetrics,
  setAutoScalingEnabled,
  getPerformanceOverlayState
} from "./api/uiIntegration";
```

**Guarantee**: All consumers of `src/ecs/world.ts` continue to work without modification.

---

## 5. Dependency Graph

### Current Dependencies (world.ts imports)

```
world.ts
├── react (createContext, createElement, useContext, useMemo)
├── entities/ (Arena, Robot, Projectile, SimulationState, Team)
├── simulation/ (aiController, performance, physics, teamStats, victory, worldTypes)
├── systems/ (aiController/captainAI, damageSystem, spawnSystem, statsSystem, weaponSystem)
└── utils/ (vector)
```

### Post-Refactor Dependencies

**world.ts** imports:
- react, types, entities
- factories/, management/, api/ modules
- simulation/, systems/ modules (only what's needed for core logic)

**factories/createProjectile.ts** imports:
- types, getWeaponData, createProjectile, weaponSystem, physics

**management/robotManagement.ts** imports:
- types, setRobotBodyPosition, refreshTeamStats, vector utils

**management/physicsManagement.ts** imports:
- types, physics management functions, getRobotById reference

**management/battleStateManagement.ts** imports:
- types, teams, spawn system, stats, physics

**api/uiIntegration.ts** imports:
- types, victory/performance modules

### Dependency Constraints
- ✅ NO circular dependencies (all are hierarchical)
- ✅ Modules depend on entities & utilities, not on world.ts
- ✅ New modules do NOT create new external dependencies
- ✅ Extraction targets are well-scoped with minimal coupling

---

## 6. Unit Test Strategy

### Current Test Coverage
- Assume: `world.ts` may have integration tests in `tests/` or `.test.ts` files
- Goal: Maintain 100% of public API test coverage after refactor

### New Test Files

#### `src/ecs/factories/__tests__/createCollections.test.ts`
- **Test**: `createECSCollections()` returns correct structure
- **Assertions**: All three collections exist, are MiniplexWorld instances
- **Coverage**: 100% of factory

#### `src/ecs/factories/__tests__/createTeams.test.ts`
- **Test**: `createTeams()` creates red/blue teams with correct spawn zones
- **Assertions**: Both teams created, spawn zones assigned
- **Coverage**: 100% of factory

#### `src/ecs/factories/__tests__/createProjectile.test.ts`
- **Test**: `createPhysicsProjectile()` creates projectile with correct properties
- **Test**: ID generation works
- **Test**: Physics body spawned
- **Assertions**: Projectile added to world, physics state updated
- **Coverage**: 100% of factory

#### `src/ecs/management/__tests__/robotManagement.test.ts`
- **Test**: `setRobotHealth()` clamps and updates health
- **Test**: `setRobotKills()` updates kill count
- **Test**: `setRobotPosition()` updates position and physics body
- **Test**: Dead robot loses captain status
- **Coverage**: 100% of module

#### `src/ecs/management/__tests__/physicsManagement.test.ts`
- **Test**: `setPhysicsBodyPosition()` updates robot position and physics
- **Test**: `applyPhysicsImpulse()` applies impulse via physics system
- **Test**: `getPhysicsSnapshot()` delegates to physics
- **Coverage**: 100% of module

#### `src/ecs/management/__tests__/battleStateManagement.test.ts`
- **Test**: `resetBattle()` clears entities, resets teams, respawns
- **Test**: `syncTeams()` syncs team records to ECS
- **Assertions**: State consistency after reset
- **Coverage**: 100% of module

#### `src/ecs/api/__tests__/uiIntegration.test.ts`
- **Test**: Each wrapper correctly delegates to underlying functions
- **Test**: Victory/restart/overlay state changes propagate
- **Assertions**: Simulation state updated correctly
- **Coverage**: 100% of module

#### Integration Tests (unchanged)
- Keep existing `tests/` integration tests that verify `world.ts` public API
- These implicitly verify correct module exports and re-exports

---

## 7. Risk Assessment

### Risk Levels by Extraction

| Extraction | Risk | Mitigation |
|------------|------|-----------|
| `createCollections.ts` | 🟢 **MINIMAL** | Pure factory, no side effects |
| `createTeams.ts` | 🟢 **MINIMAL** | Pure factory, self-contained |
| `createProjectile.ts` | 🟡 **LOW** | High LOC but focused; test thoroughly |
| `robotManagement.ts` | 🟡 **LOW** | Robot mutations well-scoped; consistent patterns |
| `physicsManagement.ts` | 🟡 **LOW** | Physics API well-defined; delegation pattern |
| `battleStateManagement.ts` | 🟡 **MEDIUM** | Multiple subsystems; test reset cycle thoroughly |
| `uiIntegration.ts` | 🟢 **MINIMAL** | Thin wrappers; low coupling |

### Overall Risk: **🟡 LOW-TO-MEDIUM**

**Mitigation Strategy**:
1. **No changes to internal logic** - just extraction; all functions remain identical
2. **Public API compatibility** - re-exports guarantee zero breaking changes
3. **Phased rollout**:
   - Phase 1: Extract pure factories (minimal risk)
   - Phase 2: Extract simple wrappers (UI integration)
   - Phase 3: Extract management modules (more complex, better tested)
   - Phase 4: Integration test entire public API
4. **Branch-based testing** - implement on feature branch, run full test suite before merge
5. **Visual regression tests** - run browser-based tests to ensure simulation behavior unchanged

---

## 8. Extraction Steps

### Step 1: Create Directory Structure
```bash
mkdir -p src/ecs/factories
mkdir -p src/ecs/management
mkdir -p src/ecs/api
mkdir -p src/ecs/factories/__tests__
mkdir -p src/ecs/management/__tests__
mkdir -p src/ecs/api/__tests__
```

### Step 2: Extract Pure Factories (Minimal Risk)

1. **Extract `createECSCollections` → `src/ecs/factories/createCollections.ts`**
   - Copy function as-is
   - Import: `MiniplexWorld`
   - Export: named export
   - Test: verify structure

2. **Extract `createTeams` → `src/ecs/factories/createTeams.ts`**
   - Copy function as-is
   - Import: `Team`, `ArenaEntity`, `createInitialTeam`
   - Export: named export
   - Test: verify team creation

3. **Extract `createPhysicsProjectile` → `src/ecs/factories/createProjectile.ts`**
   - Copy function as-is
   - Import: required systems
   - Export: named export
   - Test: verify projectile + physics spawn

4. **Update `world.ts`**:
   - Remove extracted functions
   - Add imports from factories
   - Add re-exports
   - Verify: `initializeSimulation` still works

### Step 3: Extract Simple Wrappers (Very Low Risk)

1. **Extract UI integration wrappers → `src/ecs/api/uiIntegration.ts`**
   - Move all victory/restart/overlay functions
   - Move performance functions
   - Imports: `SimulationWorld`, delegation targets
   - Exports: all functions
   - Test: each wrapper delegates correctly

2. **Update `world.ts`**:
   - Remove wrapper functions
   - Add import from `uiIntegration.ts`
   - Add re-exports
   - Verify: public API unchanged

### Step 4: Extract Management Modules (More Complex)

1. **Extract robot management → `src/ecs/management/robotManagement.ts`**
   - Move: `findRobot`, `setRobotHealth`, `setRobotKills`, `setRobotPosition`, `refreshTeam`
   - Imports: required functions
   - Exports: all functions
   - Test: robot mutations work correctly

2. **Extract physics management → `src/ecs/management/physicsManagement.ts`**
   - Move: `setPhysicsBodyPosition`, `applyPhysicsImpulse`, `getPhysicsSnapshot`
   - Keep `getRobotById` reference (or import from world.ts)
   - Imports: required functions
   - Exports: all functions
   - Test: physics operations work

3. **Extract battle management → `src/ecs/management/battleStateManagement.ts`**
   - Move: `syncTeams`, `resetBattle`
   - Imports: required functions, team management
   - Exports: all functions
   - Update `initializeSimulation` if it uses extracted functions
   - Test: battle reset cycle works

4. **Update `world.ts`**:
   - Remove extracted functions
   - Add imports from management modules
   - Add re-exports
   - Verify: `initializeSimulation`, `stepSimulation` still orchestrate correctly

### Step 5: Final Integration & Testing

1. **Verify all re-exports in world.ts**
   - Ensure public API identical
   - Run: `grep -n "^export" src/ecs/world.ts` and compare with original

2. **Run unit tests for each new module**
   - Each test file should pass independently

3. **Run integration tests**
   - Full test suite for `world.ts` public API
   - Browser-based simulation tests (if applicable)

4. **LOC verification**
   - Measure `src/ecs/world.ts` line count
   - Target: ≤300 LOC
   - Measurement: `wc -l src/ecs/world.ts`

5. **Merge and monitor**
   - Merge to feature branch
   - Run full CI/CD pipeline
   - Monitor for regressions

---

## 9. Implementation Checklist

- [ ] Create directory structure (factories/, management/, api/)
- [ ] Extract pure factories (createCollections, createTeams, createProjectile)
- [ ] Write factory tests
- [ ] Extract UI integration wrappers
- [ ] Write uiIntegration tests
- [ ] Extract robot management functions
- [ ] Write robotManagement tests
- [ ] Extract physics management functions
- [ ] Write physicsManagement tests
- [ ] Extract battle management functions
- [ ] Write battleStateManagement tests
- [ ] Update world.ts with imports & re-exports
- [ ] Verify all re-exports match original API
- [ ] Run unit tests for new modules
- [ ] Run integration tests for world.ts
- [ ] Verify line count: `wc -l src/ecs/world.ts` ≤ 300
- [ ] Code review & merge

---

## 10. Expected Outcome

### Before
- **File**: `src/ecs/world.ts`
- **LOC**: 471
- **Concerns**: Context, factories, management, orchestration, API wrappers, utilities

### After
- **world.ts**: ~300 LOC (context, orchestration, simple API, re-exports)
- **factories/**: ~43 LOC (pure factories)
- **management/**: ~95 LOC (state management)
- **api/**: ~45 LOC (UI integration wrappers)
- **Total extracted modules**: ~183 LOC
- **Net reduction in world.ts**: 171 LOC (36%)

### Benefits
1. **Reduced cognitive load** - world.ts now focused on core concerns
2. **Improved testability** - pure factories and simple wrappers are easier to test
3. **Better modularity** - concerns separated into logical modules
4. **Easier maintenance** - changes to specific concerns isolated to specific modules
5. **Public API preservation** - zero breaking changes for consumers

