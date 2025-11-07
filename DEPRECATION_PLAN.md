# Deprecation Plan and Module Consolidation Report

⚠️ Potential Duplicate Modules Detected

The following modules may have overlapping functionality:

## Pattern: "Arena" (Similarity: 90%)

- **Arena.tsx** (175 LOC)
  Path: D:\GitHub\RobotSpaceBattler\src\components\Arena.tsx
  Exports: ArenaProps, Arena
- **Arena.ts** (101 LOC)
  Path: D:\GitHub\RobotSpaceBattler\src\ecs\entities\Arena.ts
  Exports: ArenaEntity, createDefaultArena, getSpawnZone

**Status:** ✅ **RESOLVED** - Correctly separated by concern

- `Arena.ts`: Data model & factories
- `Arena.tsx`: React/R3F rendering component

---

## ~~Pattern: "victory" (Similarity: 90%)~~

**Status:** ✅ **REMOVED** - Facade eliminated

### Action Taken

1. Deleted `src/ecs/simulation/victory.ts` (facade file that only delegated to victorySystem)
2. Updated imports in:
   - `src/ecs/simulation/battleStep.ts` → import directly from `victorySystem`
   - `src/ecs/api/uiIntegration.ts` → import directly from `victorySystem`

### Rationale

The `victory.ts` file served only as a thin facade with renamed function names.
This added unnecessary indirection without providing value. All callers now import
directly from `victorySystem.ts`.

---

## Pattern: "Projectile" (Similarity: 70%)

- **Projectile.tsx** (144 LOC)
  Path: D:\GitHub\RobotSpaceBattler\src\components\Projectile.tsx
  Exports: ProjectileInstancesProps, ProjectileInstances
- **Projectile.ts** (61 LOC)
  Path: D:\GitHub\RobotSpaceBattler\src\ecs\entities\Projectile.ts
  Exports: Projectile, ProjectileInput, normalizeProjectile, createProjectile, shouldDespawn

**Status:** ✅ **RESOLVED** - Correctly separated by concern

- `Projectile.ts`: Data model, validation, business logic
- `Projectile.tsx`: Instanced mesh rendering (Three.js)

---

## Pattern: "Robot" (Similarity: 70%)

- **Robot.tsx** (158 LOC)
  Path: D:\GitHub\RobotSpaceBattler\src\components\Robot.tsx
  Exports: RobotProps, Robot
- **Robot.ts** (125 LOC)
  Path: D:\GitHub\RobotSpaceBattler\src\ecs\entities\Robot.ts
  Exports: Robot, RobotInput, normalizeRobot, createRobot, hasValidCaptainDistribution

**Status:** ✅ **RESOLVED** - Correctly separated by concern

- `Robot.ts`: Entity model, data validation, invariant checking
- `Robot.tsx`: React/R3F rendering with position interpolation

---

## Pattern: "StatsModal" (Similarity: 40%)

- **StatsModal.tsx** (170 LOC)
  Path: D:\GitHub\RobotSpaceBattler\src\components\overlays\StatsModal.tsx
- **StatsModal.tsx** (108 LOC)
  Path: D:\GitHub\RobotSpaceBattler\src\components\ui\StatsModal.tsx

**Status:** ✅ **RESOLVED** - Intentional pattern (presentational vs. connected)

### Action Taken

1. **Kept `overlays/StatsModal.tsx`** - Presentational component (prop-based, testable in isolation)
2. **Kept `ui/StatsModal.tsx`** - Connected component (uses hooks & store)
3. Updated `App.tsx` to import connected version from `ui/StatsModal`
4. Test structure now correctly reflects the pattern:
   - `tests/integration/ui/stats-modal.test.tsx` tests presentational props-based component
   - `tests/unit/components/ui/StatsModal.test.tsx` tests connected component

### Rationale

This pattern follows React best practices:

- Presentational components in `overlays/` are pure, testable, and reusable
- Connected components in `ui/` handle integration with hooks and state management
- Integration tests verify prop-based rendering works correctly
- Unit tests verify hook integration works correctly

---

## Summary

✅ All duplicate/similar patterns have been reviewed and resolved:

- 1 facade removed (victory.ts)
- 1 consolidation completed (StatsModal pattern clarified)
- 3 patterns correctly identified as intentional design separation

### Verification

- ✅ ESLint: No errors
- ✅ Tests: 447 passed, 1 skipped
- ✅ No broken imports or functionality

