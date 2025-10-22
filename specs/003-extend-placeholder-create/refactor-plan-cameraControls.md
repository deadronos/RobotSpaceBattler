# Refactor Plan: useCameraControls.ts → cameraMath.ts

**File**: `src/hooks/useCameraControls.ts`  
**Current LOC**: 343 lines  
**Target LOC**: ≤ 300 lines  
**Reduction Needed**: 43 lines (13%)  
**Risk Level**: LOW (isolated math + UI state)  
**Phase 8 Task**: T060 (planning), T061 (extraction)

---

## Analysis: What Can Be Extracted?

### Pure Math Functions (100% Extractable)

These functions have **zero dependencies** on React or camera state:

1. **`clamp(value, min, max)` — 1 line**
   - Used: 8+ times in file
   - Dependencies: None (Math only)
   - Tests: Should have unit test

2. **`wrapAngle(angle)` — 6 lines**
   - Used: 3+ times in file
   - Dependencies: None (Math only)
   - Tests: Should validate 0-2π wrapping

3. **`toCartesian(target, spherical, arena, minDistance)` — 25 lines**
   - Converts spherical to cartesian coordinates
   - Used: 2 times in file
   - Dependencies: `clamp`, `Vector3`, `ArenaEntity`
   - Tests: Should validate position clamping and boundary checks

4. **`buildRightVector(azimuth)` — 4 lines**
   - Calculates camera right vector
   - Used: 1 time in file
   - Dependencies: Math only
   - Tests: Should validate vector normalization

5. **`buildForwardVector(azimuth)` — 4 lines**
   - Calculates camera forward vector
   - Used: 1 time in file
   - Dependencies: Math only
   - Tests: Should validate vector normalization

6. **SphericalCoordinates Interface** — 3 lines
   - Type definition for spherical coordinates
   - Used: Throughout file
   - Extractable: Yes

**Total extractable lines: ~43 lines** ✅ (Meets 43-line reduction target)

### Remaining in useCameraControls.ts

- `PointerHandlers` interface
- `KeyboardHandlers` interface
- `UseCameraControlsOptions` interface
- `CameraControlsResult` interface
- Constants: `DEFAULT_TARGET`, `ROTATE_SPEED`, etc. (should stay)
- Hook function: `useCameraControls()` (main hook logic, ~200 lines)

**After extraction**: ~300 lines remaining

---

## Proposed Module Structure

### New File: `src/utils/cameraMath.ts`

```typescript
// Spherical coordinate system
export interface SphericalCoordinates {
  azimuth: number;
  polar: number;
  distance: number;
}

// Pure math utilities
export const clamp = (value: number, min: number, max: number) => number;
export const wrapAngle = (angle: number) => number;
export const toCartesian = (
  target: Vector3,
  spherical: SphericalCoordinates,
  arena: ArenaEntity,
  minDistance: number,
) => Vector3;
export const buildRightVector = (azimuth: number) => Vector3;
export const buildForwardVector = (azimuth: number) => Vector3;
```

**Estimated LOC**: 50 lines (includes comments and types)

### Updated File: `src/hooks/useCameraControls.ts`

```typescript
// Imports
import { useCallback, useMemo, useRef, useState } from "react";
import {
  clamp,
  wrapAngle,
  toCartesian,
  buildRightVector,
  buildForwardVector,
  SphericalCoordinates,
} from "../utils/cameraMath";

// Interfaces and constants (unchanged)
// Hook implementation (~250 lines)
```

**Estimated LOC**: ≤ 300 lines ✅

---

## Public API: Before & After

### Before (Current)

```typescript
// cameraMath functions are private to useCameraControls.ts
// No public exports (only useCameraControls hook)
export function useCameraControls(options) { ... }
```

### After (Proposed)

```typescript
// In useCameraControls.ts
export { useCameraControls };

// In cameraMath.ts (NEW — public APIs)
export { clamp, wrapAngle, toCartesian, buildRightVector, buildForwardVector };
export type { SphericalCoordinates };
```

**Breaking Changes**: NONE
- useCameraControls hook remains unchanged
- New exports available if needed by other modules
- Backward compatible

---

## Dependency Graph

```
useCameraControls.ts (hook logic)
  ↓ imports
cameraMath.ts (pure math utilities)
  └─ Dependencies: types/Vector3, entities/Arena (EXISTING)
```

**Acyclic**: ✅ No circular dependencies

---

## Unit Test Strategy

### New File: `tests/unit/utils/cameraMath.test.ts`

Create unit tests for each extracted function BEFORE extraction:

```typescript
describe("cameraMath", () => {
  describe("clamp", () => {
    it("should return value if within range");
    it("should return min if value < min");
    it("should return max if value > max");
  });

  describe("wrapAngle", () => {
    it("should wrap angles to 0-2π range");
    it("should handle negative angles");
  });

  describe("toCartesian", () => {
    it("should convert spherical to cartesian coordinates");
    it("should clamp x/z within arena boundaries");
    it("should enforce minimum y height");
  });

  describe("buildRightVector", () => {
    it("should calculate perpendicular right vector");
  });

  describe("buildForwardVector", () => {
    it("should calculate forward direction vector");
  });
});
```

**Test count**: ~15–20 tests (covers math edge cases)

### Existing Tests: useCameraControls.test.ts

- Existing hook tests should continue to pass after extraction
- No test changes needed (imports updated, logic unchanged)

---

## Extraction Steps

### Step 1: Create Unit Tests (T061 Subtask 1)

1. Create `tests/unit/utils/cameraMath.test.ts`
2. Write tests for all functions (clamp, wrapAngle, toCartesian, buildRightVector, buildForwardVector)
3. Tests should fail initially (functions don't exist yet)

### Step 2: Create cameraMath.ts Module (T061 Subtask 2)

1. Create `src/utils/cameraMath.ts`
2. Copy pure math functions from useCameraControls.ts
3. Copy SphericalCoordinates interface
4. Add JSDoc comments
5. Run unit tests: should pass ✅

### Step 3: Update useCameraControls.ts (T061 Subtask 3)

1. Replace pure function definitions with imports from cameraMath
2. Keep hook logic, interfaces, constants unchanged
3. Verify no changes to exported API

### Step 4: Verify All Tests Pass (T061 Subtask 4)

```bash
npm run test tests/unit/utils/cameraMath.test.ts  # New math tests
npm run test tests/unit/hooks/useCameraControls.test.ts  # Existing hook tests
npm run test  # Full suite (should have ≥ same count)
npm run lint  # Should be 0 errors
npm run test:coverage  # Should maintain ≥ 60%
```

### Step 5: Commit (T061 Subtask 5)

```bash
git add -A
git commit -m "refactor: extract pure math utilities from useCameraControls into cameraMath"
```

---

## Acceptance Criteria (T061)

- [ ] `src/utils/cameraMath.ts` created with 5 math functions
- [ ] `tests/unit/utils/cameraMath.test.ts` created with 15–20 tests
- [ ] All cameraMath tests passing (✅)
- [ ] `src/hooks/useCameraControls.ts` updated to import cameraMath functions
- [ ] useCameraControls.ts LOC reduced to ≤ 300
- [ ] All existing hook tests still passing (✅)
- [ ] Full test suite passing (406+/407) (✅)
- [ ] ESLint 0 errors (✅)
- [ ] Coverage maintained ≥ 60% (✅)
- [ ] No breaking changes to useCameraControls export

---

## Risk Assessment

**Risk Level**: LOW ✅

Why low:
1. Pure math functions have no side effects
2. Clear, isolated dependencies
3. Well-tested math (standard spherical coordinate math)
4. No changes to public API of useCameraControls hook
5. Existing tests provide safety net

Mitigation:
- Write unit tests FIRST
- Run full test suite after each step
- Easy rollback if needed (just remove cameraMath.ts and revert imports)

---

## Rollback Plan

If T061 introduces regressions:

1. Identify failing test in `npm run test` output
2. Check if it's in cameraMath.test.ts or useCameraControls.test.ts
3. If cameraMath: Debug math function logic
4. If useCameraControls: Debug imports or hook integration
5. If unable to fix quickly: `git revert` the extraction commit and try different approach

**Estimated rollback time**: 15 minutes

---

## Success Definition

T061 is **COMPLETE** when:

- ✅ useCameraControls.ts ≤ 300 lines
- ✅ cameraMath.ts created with pure math functions
- ✅ 15–20 new unit tests for cameraMath (all passing)
- ✅ Existing useCameraControls tests still passing
- ✅ 406+ total tests passing
- ✅ 0 ESLint errors
- ✅ 60%+ coverage maintained
- ✅ No breaking changes to public API

---

## Notes for Implementation

1. **SphericalCoordinates interface**: Move to cameraMath.ts and re-export from useCameraControls.ts for backward compatibility

2. **Constants**: Keep `ROTATE_SPEED`, `PAN_SPEED`, etc. in useCameraControls.ts (they're UI-specific, not math)

3. **Imports**: cameraMath.ts should only import from `types/Vector3` and `ecs/entities/Arena` (no React, no hooks)

4. **JSDoc**: Add comprehensive comments to math functions explaining spherical coordinate system for future maintainers

5. **Performance**: No performance impact expected (extraction reduces file size, no runtime overhead)

---

**Phase 8 Task**: T060 (this plan) + T061 (implementation)  
**Effort Estimate**: 2–3 hours for T061  
**Priority**: HIGH (low-risk, fast win, unblocks matchPlayer and world refactors)

Next: See refactor-plan-matchPlayer.md and refactor-plan-world.md for higher-risk extractions.
