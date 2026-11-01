---
post_title: Phase 7 Tasks - Live Match Playback Implementation
author1: Agent
post_slug: phase-7-tasks-live-rendering
microsoft_alias: N/A
featured_image: N/A
categories: []
tags: [tasks, implementation, rendering]
ai_note: Implementation task breakdown
summary: >-
  Phase 7 adds 7 new tasks (T050–T056) to implement live match rendering with
  real-time trace capture. Organized in 5 task groups with detailed subtasks.
post_date: 2025-10-18
---

# Phase 7: Live Match Playback Implementation Tasks

**Added**: October 18, 2025  
**Branch**: `003-extend-placeholder-create`  
**Tasks**: T050–T056 (7 total)  
**Subtasks**: 51 checkpoints  
**Estimated Effort**: 6–8 hours

---

## Overview

Phase 7 completes the live rendering architecture by capturing simulation events into a
growing trace and displaying them in real-time. Unifies the "live" and "replay" paths
into a single trace-driven system.

### Task Dependencies

```plaintext
Phase 1 (Setup)
  ↓
Phase 2 (Contracts) → Phase 3 (US1: Run Match)
  ↓                       ↓
Phase 4 (US2)      Phase 7 (Live Rendering) ← DEPENDS ON PHASE 3
Phase 5 (US3)            ↓
  ↓                 Phase 6 (Polish)
  └─────────────────────┘
```

**Phase 7 Depends On**: Phase 1, 2, 3 (rendering infrastructure must exist)

**Phase 7 Enables**: Phase 6 polish features; unifies US2 + US3 with live rendering

---

## Task Groups (T050–T056)

### Task Group 7.1: Live Trace Capture Infrastructure

#### T050: Create `useLiveMatchTrace()` Hook

**File**: `src/hooks/useLiveMatchTrace.ts` (NEW)

**Subtasks** (8):

- [ ] Define hook interface and return type
- [ ] Subscribe to entity spawns (observe entity creation)
- [ ] Capture spawn events with entityId, teamId, position, timestamp
- [ ] Subscribe to entity movements (observe position changes)
- [ ] Capture move events with entityId, newPosition, timestamp
- [ ] Subscribe to projectile creation (observe fire events)
- [ ] Capture fire events with firingEntityId, projectileId, targetPosition, timestamp
- [ ] Create event accumulator that builds growing MatchTrace

**Subtasks** (continued, 10):

- [ ] Subscribe to health changes (observe damage events)
- [ ] Capture damage events with targetId, attackerId, amount, newHealth, maxHealth,
      timestamp
- [ ] Subscribe to entity elimination (observe death events)
- [ ] Capture death events with deadEntityId, killerEntityId, timestamp
- [ ] Create sequenceId counter for deterministic tie-breaking
- [ ] Track RNG seed from simulation world
- [ ] Track RNG algorithm metadata
- [ ] Return MatchTrace object with events, rngSeed, rngAlgorithm
- [ ] Export trace as state update on each frame
- [ ] Verify trace grows incrementally with each event

**Success Criteria**:

- Hook captures all 5 event types accurately
- sequenceId values are strictly increasing
- RNG metadata recorded in trace
- No events dropped or misordered
- Memory usage acceptable for 5-minute matches

---

### Task Group 7.2: Wire Live Trace to Renderer

#### T051: Connect Live Trace to Scene.tsx

**File**: `src/components/Scene.tsx` (MODIFY)  
**File**: `src/components/Simulation.tsx` (MODIFY)

**Subtasks** (7):

- [ ] Import `useLiveMatchTrace` hook in Simulation component
- [ ] Call `useLiveMatchTrace(world)` to get live trace
- [ ] Store live trace in local state or ref
- [ ] Pass live trace to MatchSceneInner component as prop
- [ ] Remove `RobotPlaceholder` components from renderer
- [ ] Verify Scene.tsx renders MatchSceneInner instead of placeholders
- [ ] Test that entities appear on screen (visual verification)

**Subtasks** (continued, 8):

- [ ] Verify MatchSceneInner receives non-null trace
- [ ] Verify useMatchSimulation hook initializes with live trace
- [ ] Verify HUD overlay displays entity count
- [ ] Verify HUD shows match progress (time elapsed)
- [ ] Verify HUD shows match status (in-progress → finished)
- [ ] Verify robots render with correct positions
- [ ] Verify projectiles render from fire events
- [ ] Test match renders from spawn to victory

**Success Criteria**:

- Live match renders in 3D
- Entities appear and move smoothly
- HUD shows accurate entity count and time
- No console errors or warnings
- Victory overlay appears when match ends

---

### Task Group 7.3: Quality Toggle & Visual Controls

#### T052: Add Quality Toggle to UI

**File**: `src/components/hud/ControlStrip.tsx` (MODIFY)  
**File**: `src/hooks/useVisualQuality.ts` (MODIFY)  
**File**: UI store (MODIFY)

**Subtasks** (7):

- [ ] Add button element to ControlStrip UI for quality selection
- [ ] Create button group: "High", "Medium", "Low" options
- [ ] Extend UI store with quality selector action
- [ ] Update `useVisualQuality` hook to read quality from store
- [ ] Implement click handler to dispatch quality change action
- [ ] Apply quality profile to RenderedRobot components
- [ ] Apply quality profile to RenderedProjectile components

**Subtasks** (continued, 7):

- [ ] Verify High quality shows enhanced shadows/textures/particles
- [ ] Verify Medium quality shows balanced visuals
- [ ] Verify Low quality shows simplified materials
- [ ] Verify visual changes don't affect entity positions
- [ ] Verify visual changes don't affect damage calculations
- [ ] Verify simulation outcome identical across all profiles
- [ ] Test quality toggle during active match (without restarting)

**Success Criteria**:

- Quality button visible and clickable
- Visual profile changes immediately on click
- Simulation outcome unaffected by visual quality
- No visual artifacts or glitches when switching profiles
- Frame rate adapts to quality setting

---

### Task Group 7.4: Between-Rounds UI & Match Flow

#### T053: Create BetweenRoundsUI Component

**File**: `src/components/match/BetweenRoundsUI.tsx` (NEW)

**Subtasks** (7):

- [ ] Define component interface and props
- [ ] Create match result summary section (winner, winner team color, win type)
- [ ] Display team statistics (kills, damage dealt, damage taken by team)
- [ ] Display entity breakdown (each robot: kills, damage, health status)
- [ ] Implement "Rematch" button (triggers new match with new RNG seed)
- [ ] Implement "Team Selection" screen (choose teams for next match)
- [ ] Add "Export Trace" button (saves MatchTrace as JSON file)

**Subtasks** (continued, 7):

- [ ] Wire VictoryOverlay to BetweenRoundsUI display
- [ ] Wire victory callback from simulation to component
- [ ] Handle rematch flow (new game with different RNG seed)
- [ ] Handle team selection (allow user to pick teams/configurations)
- [ ] Test trace export (verify JSON structure is valid)
- [ ] Test rematch button flow end-to-end
- [ ] Verify UI displays all stats correctly

**Success Criteria**:

- BetweenRoundsUI displays after match end
- Shows correct winner and team stats
- Rematch button works and starts new game
- Team selection screen functional
- Trace export produces valid JSON

---

### Task Group 7.5: Integration & Validation

#### T054: Unit Tests for Live Trace Capture

**File**: `tests/unit/liveTrace.test.ts` (NEW)

**Subtasks** (7):

- [ ] Test spawn event capture (entity creation → trace event)
- [ ] Test move event capture (position change → trace event)
- [ ] Test fire event capture (projectile creation → trace event)
- [ ] Test damage event capture (health change → trace event)
- [ ] Test death event capture (entity elimination → trace event)
- [ ] Test sequenceId ordering (simultaneous events deterministic)
- [ ] Test RNG metadata recording (seed and algorithm in trace)

**Success Criteria**:

- All 7 test cases pass
- Trace events have correct timestamps
- sequenceId values properly ordered
- No false positives or flaky tests

#### T055: E2E Tests for Live Match Rendering

**File**: `playwright/tests/live-match-rendering.spec.ts` (NEW)

**Subtasks** (6):

- [ ] Test app startup and match rendering begins
- [ ] Test robots move and fire projectiles visually
- [ ] Test damage indicators appear on hit
- [ ] Test victory overlay displays at match end
- [ ] Test quality toggle works during active match
- [ ] Test rematch flow (complete match → UI → rematch → new match)

**Success Criteria**:

- All 6 test scenarios pass
- No visual glitches or rendering errors
- Match completes from start to end
- Victory overlay appears with correct winner
- Rematch flow works end-to-end

#### T056: Verify No Regression

**Subtasks** (5):

- [ ] Run `npm run test` and verify 367/368 tests still passing
- [ ] Run `npm run lint` and verify 0 ESLint errors
- [ ] Run `npm run test:coverage` and verify coverage maintained
- [ ] Verify no new TypeScript type errors
- [ ] Manual smoke test: start app, play match, verify no crashes

**Success Criteria**:

- Full test suite passes (no new failures)
- ESLint clean (0 errors, acceptable warnings)
- Coverage maintained or improved
- No console errors or warnings
- No regression in existing features

---

## Implementation Checklist

### Pre-Implementation

- [ ] Review plan.md "Live Playback Architecture" section
- [ ] Review existing hooks: useMatchSimulation, useMatchTimeline, useVisualQuality
- [ ] Review existing components: MatchSceneInner, Simulation, ControlStrip
- [ ] Review ECS systems: spawn, aiController, weaponSystem, damageSystem
- [ ] Create feature branch: `feature/phase-7-live-rendering`

### Implementation (T050–T053)

- [ ] T050: Create useLiveMatchTrace hook (2–3 hours)
- [ ] T051: Wire to Scene.tsx and test rendering (1–2 hours)
- [ ] T052: Add quality toggle UI (1 hour)
- [ ] T053: Create BetweenRoundsUI component (1–2 hours)

### Testing (T054–T056)

- [ ] T054: Unit tests for live trace (1 hour)
- [ ] T055: E2E tests for rendering (1 hour)
- [ ] T056: Regression verification (30 min)

### Total Estimated Effort

- Implementation: 5–7 hours
- Testing: 2–3 hours
- **Total: 7–10 hours**

---

## Integration Points

### ECS Systems to Instrument

1. **spawnSystem.ts** — add spawn event capture
2. **aiController.ts** — add move event capture
3. **weaponSystem.ts** — add fire event capture
4. **damageSystem.ts** — add damage + death event capture

### React Components to Modify

1. **Scene.tsx** — pass live trace to MatchSceneInner
2. **Simulation.tsx** — call useLiveMatchTrace hook
3. **ControlStrip.tsx** — add quality button
4. **useVisualQuality.ts** — expose quality selector
5. **VictoryOverlay.tsx** — integrate with BetweenRoundsUI

### New Files to Create

1. `src/hooks/useLiveMatchTrace.ts` — live trace capture
2. `src/components/match/BetweenRoundsUI.tsx` — between-rounds UI
3. `tests/unit/liveTrace.test.ts` — unit tests
4. `playwright/tests/live-match-rendering.spec.ts` — E2E tests

---

## Success Criteria (Overall)

✅ Live matches render in real-time with full 3D graphics  
✅ Robots move, fire, take damage (all visible on screen)  
✅ Victory overlay displays winner after match ends  
✅ Quality settings can be toggled without affecting outcome  
✅ Rematch button works and generates new trace  
✅ All 367 existing tests pass (no regression)  
✅ ESLint 0 errors  
✅ Code coverage maintained or improved  
✅ No console warnings or errors  

---

## Notes

- Phase 7 unifies live and replay paths (same trace-driven architecture)
- All existing tests remain compatible (no breaking changes)
- Quality profiles are visual-only (don't affect simulation)
- Between-rounds UI is extensible (can add more features later)
- Trace export enables debugging and offline analysis

---

**Ready for implementation after Phase 1–6 completion.**
