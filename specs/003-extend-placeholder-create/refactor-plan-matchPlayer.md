# Refactor Plan: matchPlayer.ts → eventIndex.ts + playbackClock.ts

**File**: `src/systems/matchTrace/matchPlayer.ts`  
**Current LOC**: 392 lines  
**Target LOC**: ≤ 300 lines  
**Reduction Needed**: 92 lines (23%)  
**Risk Level**: MEDIUM (critical playback path, well-tested)  
**Phase 8 Task**: T059 (planning), T063 (extraction)

---

## Analysis: What Can Be Extracted?

### Event Index Management (60–80 lines extractable)

The MatchPlayer class maintains an `eventsByTimestamp` cache for efficient event lookup:

```typescript
private eventsByTimestamp: Map<number, MatchTraceEvent[]> = new Map();

private buildEventIndex() { ... }  // ~20 lines
private getEventsAtTimestamp(timestamp: number) { ... }  // ~10 lines
private findNextEventTimestamp(currentTimestamp: number) { ... }  // ~15 lines
```

**Characteristics**:
- Pure data structure management
- No state mutations beyond the Map itself
- Used by playback engine
- Can be extracted to `eventIndex.ts`
- Well-defined interface

### Playback Clock Management (70–90 lines extractable)

Timestamp and frame management logic:

```typescript
private currentTimestampMs: number = 0;
private currentFrameIndex: number = 0;

private advanceTimestamp(deltaMs: number) { ... }  // ~15 lines
private seekToTimestamp(timestamp: number) { ... }  // ~20 lines
private getProgress() { ... }  // ~5 lines
```

**Characteristics**:
- Time and frame tracking
- Boundary checks and validation
- Rate multiplication logic
- Can be extracted to `playbackClock.ts`
- Separable from event playback

### What Remains in matchPlayer.ts

- RNG management (already extracted to rngManager.ts)
- Main playback state machine (playing/paused/finished)
- Public API (step, play, pause, seek)
- Event dispatch and snapshot generation

**After extraction**: ~240–260 lines

---

## Proposed Module Structure

### New File: `src/systems/matchTrace/eventIndex.ts`

```typescript
import type { MatchTrace, MatchTraceEvent } from "./types";

export interface EventIndexCache {
  eventsByTimestamp: Map<number, MatchTraceEvent[]>;
  buildIndex(trace: MatchTrace): void;
  getEventsAt(timestamp: number): MatchTraceEvent[];
  findNextTimestamp(currentTimestamp: number): number | undefined;
  findPreviousTimestamp(currentTimestamp: number): number | undefined;
  getAllTimestamps(): number[];
}

export class EventIndex {
  private eventsByTimestamp: Map<number, MatchTraceEvent[]> = new Map();
  private trace: MatchTrace;

  constructor(trace: MatchTrace);
  buildIndex(): void;
  getEventsAt(timestamp: number): MatchTraceEvent[];
  findNextTimestamp(currentTimestamp: number): number | undefined;
  // ... additional methods
}
```

**Estimated LOC**: 70–80 lines

### New File: `src/systems/matchTrace/playbackClock.ts`

```typescript
export interface PlaybackClockConfig {
  playbackRate?: number;
  autoPlay?: boolean;
  debugMode?: boolean;
}

export class PlaybackClock {
  private currentTimestampMs: number = 0;
  private currentFrameIndex: number = 0;
  private playbackRate: number = 1.0;

  constructor(config: PlaybackClockConfig);
  advance(deltaMs: number): void;
  seek(timestamp: number): void;
  getProgress(maxTimestamp: number): number;
  getCurrentTimestamp(): number;
  getCurrentFrameIndex(): number;
}
```

**Estimated LOC**: 60–70 lines

### Updated File: `src/systems/matchTrace/matchPlayer.ts`

```typescript
import { MatchTrace, MatchTraceEvent } from "./types";
import { EventIndex } from "./eventIndex";
import { PlaybackClock } from "./playbackClock";
import { RNGManager, RNG_ALGORITHM_ID } from "./rngManager";

export enum PlaybackState { ... }
export enum ReplayMode { ... }
export interface MatchPlayerConfig { ... }
export interface PlaybackSnapshot { ... }

export class MatchPlayer {
  private trace: MatchTrace;
  private state: PlaybackState = PlaybackState.Idle;
  private rngManager: RNGManager | null = null;
  
  private eventIndex: EventIndex;
  private clock: PlaybackClock;
  
  // Main playback orchestration (~150–170 lines)
  constructor(config: MatchPlayerConfig) { ... }
  step(deltaMs: number): PlaybackSnapshot { ... }
  play(): void { ... }
  pause(): void { ... }
  seek(timestamp: number): void { ... }
  getSnapshot(): PlaybackSnapshot { ... }
}
```

**Estimated LOC**: ≤ 300 lines ✅

---

## Public API: Before & After

### Before (Current)

```typescript
export enum PlaybackState { ... }
export enum ReplayMode { ... }
export interface MatchPlayerConfig { ... }
export interface PlaybackSnapshot { ... }
export class MatchPlayer { ... }
```

### After (Proposed)

```typescript
// matchPlayer.ts (unchanged exports)
export enum PlaybackState { ... }
export enum ReplayMode { ... }
export interface MatchPlayerConfig { ... }
export interface PlaybackSnapshot { ... }
export class MatchPlayer { ... }  // Uses internal EventIndex and PlaybackClock

// eventIndex.ts (NEW — internal use only, can expose if needed)
export class EventIndex { ... }

// playbackClock.ts (NEW — internal use only, can expose if needed)
export class PlaybackClock { ... }
```

**Breaking Changes**: NONE
- MatchPlayer API remains unchanged
- Extraction is internal refactoring
- Backward compatible

---

## Dependency Graph

```
matchPlayer.ts (main orchestrator)
  ├─ imports → eventIndex.ts (event lookup)
  ├─ imports → playbackClock.ts (time tracking)
  ├─ imports → rngManager.ts (RNG seeding, EXISTING)
  └─ imports → types.ts (MatchTrace, MatchTraceEvent)

eventIndex.ts
  └─ imports → types.ts

playbackClock.ts
  └─ (No dependencies beyond standard library)
```

**Acyclic**: ✅ No circular dependencies

---

## Unit Test Strategy

### New File: `tests/unit/systems/eventIndex.test.ts`

Create unit tests for EventIndex BEFORE extraction:

```typescript
describe("EventIndex", () => {
  describe("buildIndex", () => {
    it("should build timestamp-to-events mapping");
    it("should handle empty trace");
    it("should handle trace with one event");
    it("should handle trace with multiple events at same timestamp");
  });

  describe("getEventsAt", () => {
    it("should return events at exact timestamp");
    it("should return empty array for timestamp with no events");
  });

  describe("findNextTimestamp", () => {
    it("should find next timestamp after current");
    it("should return undefined if at end of trace");
    it("should handle events at same timestamp");
  });
});
```

**Test count**: ~15–20 tests

### New File: `tests/unit/systems/playbackClock.test.ts`

Create unit tests for PlaybackClock BEFORE extraction:

```typescript
describe("PlaybackClock", () => {
  describe("advance", () => {
    it("should advance time by deltaMs");
    it("should respect playback rate (2x speed)");
    it("should increment frame index");
  });

  describe("seek", () => {
    it("should set current timestamp");
    it("should reset frame index on seek");
  });

  describe("getProgress", () => {
    it("should return 0–1 progress value");
    it("should return 1.0 if timestamp >= maxTimestamp");
  });
});
```

**Test count**: ~12–15 tests

### Existing Tests: matchPlayer.test.ts

- Existing MatchPlayer tests should continue to pass after extraction
- No test changes needed (internal refactoring only)

---

## Extraction Steps

### Step 1: Create Unit Tests (T063 Subtask 1)

1. Create `tests/unit/systems/eventIndex.test.ts`
2. Create `tests/unit/systems/playbackClock.test.ts`
3. Write all tests (will fail initially)

### Step 2: Create eventIndex.ts Module (T063 Subtask 2)

1. Create `src/systems/matchTrace/eventIndex.ts`
2. Copy `buildEventIndex`, `getEventsAtTimestamp`, `findNextEventTimestamp` methods
3. Create EventIndex class wrapping this logic
4. Run tests: should pass ✅

### Step 3: Create playbackClock.ts Module (T063 Subtask 3)

1. Create `src/systems/matchTrace/playbackClock.ts`
2. Copy `currentTimestampMs`, `currentFrameIndex` properties
3. Copy `advanceTimestamp`, `seekToTimestamp`, `getProgress` methods
4. Create PlaybackClock class
5. Run tests: should pass ✅

### Step 4: Update matchPlayer.ts (T063 Subtask 4)

1. Import `EventIndex` from eventIndex.ts
2. Import `PlaybackClock` from playbackClock.ts
3. Replace internal methods with delegation to these classes
4. Keep `step()`, `play()`, `pause()`, `seek()` logic in MatchPlayer

### Step 5: Verify All Tests Pass (T063 Subtask 5)

```bash
npm run test tests/unit/systems/eventIndex.test.ts
npm run test tests/unit/systems/playbackClock.test.ts
npm run test tests/unit/systems/matchPlayer.test.ts  # Existing tests
npm run test  # Full suite (should have ≥ same count + new tests)
npm run lint
npm run test:coverage
```

### Step 6: Commit (T063 Subtask 6)

```bash
git commit -m "refactor: extract event index and playback clock from matchPlayer"
```

---

## Acceptance Criteria (T063)

- [ ] `src/systems/matchTrace/eventIndex.ts` created
- [ ] `src/systems/matchTrace/playbackClock.ts` created
- [ ] `tests/unit/systems/eventIndex.test.ts` created with 15–20 tests (all passing)
- [ ] `tests/unit/systems/playbackClock.test.ts` created with 12–15 tests (all passing)
- [ ] `src/systems/matchTrace/matchPlayer.ts` updated to use new modules
- [ ] matchPlayer.ts LOC reduced to ≤ 300
- [ ] All existing matchPlayer tests still passing (✅)
- [ ] Full test suite passing (420+/407, including new tests) (✅)
- [ ] ESLint 0 errors (✅)
- [ ] Coverage maintained ≥ 60% (✅)
- [ ] No breaking changes to MatchPlayer export

---

## Risk Assessment

**Risk Level**: MEDIUM (playback is critical path, but well-tested) ✅

Why medium:
1. Extraction affects core replay logic
2. Existing tests provide good safety net (370+ tests in matchPlayer.test.ts)
3. Delegation pattern is clean (no complex state sharing)
4. New classes have clear responsibilities

Mitigation:
- Write unit tests for extracted classes FIRST
- Run full test suite after each step
- Easy rollback if needed (revert extraction and remove eventIndex.ts, playbackClock.ts)

---

## Rollback Plan

If T063 introduces regressions:

1. Identify failing test in `npm run test` output
2. Check test stack trace to identify which extracted class is problematic
3. If EventIndex: Check timestamp mapping or event lookup logic
4. If PlaybackClock: Check time advancement or seek logic
5. If MatchPlayer integration: Check delegation calls
6. If unable to fix quickly: `git revert` extraction commits

**Estimated rollback time**: 20–30 minutes

---

## Success Definition

T063 is **COMPLETE** when:

- ✅ matchPlayer.ts ≤ 300 lines
- ✅ eventIndex.ts created and tested
- ✅ playbackClock.ts created and tested
- ✅ 27–35 new unit tests for extracted classes (all passing)
- ✅ Existing matchPlayer tests still passing
- ✅ 420+ total tests passing
- ✅ 0 ESLint errors
- ✅ 60%+ coverage maintained
- ✅ No breaking changes to public API

---

## Notes for Implementation

1. **EventIndex**: Keep internal to matchTrace system (no need to export)

2. **PlaybackClock**: Self-contained, could potentially be reused elsewhere (but scope to internal for now)

3. **Dependency Direction**: eventIndex ← matchPlayer → playbackClock (proper separation of concerns)

4. **RNG Manager**: Already separated in previous refactoring, keep as-is

5. **Performance**: No performance impact expected (extraction improves organization, maintains algorithms)

---

**Phase 8 Task**: T059 (this plan) + T063 (implementation)  
**Effort Estimate**: 2–3 hours for T063  
**Priority**: HIGH (medium risk, well-tested, significant LOC reduction)  
**Sequence**: Execute after T061 (camera math extraction) builds confidence

Next: See refactor-plan-world.md for highest-risk extraction.
