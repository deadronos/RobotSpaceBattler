---
post_title: Phase 7 - Live Match Playback Architecture
author1: Agent
post_slug: phase-7-live-playback
microsoft_alias: N/A
featured_image: N/A
categories: []
tags: [architecture, rendering, trace-driven]
ai_note: Clarification document
summary: >-
  Architectural clarification for rendering live simulated matches in real-time
  using a unified trace-driven approach. Replaces separate "live" and "replay"
  paths with a single unified system.
post_date: 2025-10-18
---

# Phase 7: Live Match Playback Architecture

**Date**: October 18, 2025  
**Status**: Planned (follows Phases 1-6, ready for implementation)  
**Tasks**: T050-T053

## Problem Statement

The spec (Spec 003, SC-001) requires:
> "When a match starts, two teams of robots spawn in the arena with 3D models, move, fire
> projectiles, and the match runs to completion with a single winning team displayed."

**Current Gap**:

- Rendering infrastructure exists and is fully tested (367 tests passing)
- But live matches don't render—only placeholders appear
- App uses static fallback instead of wiring trace to renderer

## Solution: Unified Trace-Driven Rendering

Instead of maintaining two separate code paths (live simulation vs. replay), we adopt a
**single unified approach**:

1. **During simulation**: Capture all events (spawn, move, fire, damage, death) into a
   growing MatchTrace
2. **During rendering**: Read from that live trace and render entities at current
   timestamp
3. **Post-match**: Same trace can be replayed deterministically (same RNG seed)

### Why This Works

- **Single Source of Truth**: Trace = simulation output (no redundancy)
- **No Coordination Problem**: Renderer follows trace timestamp naturally
- **Deterministic**: Replay uses same RNG seed for identical outcomes
- **Quality Invariant**: Visual settings never affect trace or outcome
- **Backwards Compatible**: Existing replay system unchanged

## Architecture Diagram

```plaintext
ECS Simulation                Live Trace Builder              Renderer
───────────────              ──────────────────              ────────
  spawn()     ─┐
              ├──→ addEvent() ──→ MatchTrace  ──→ useMatchSimulation()
  move()      ┤                    {events:[]}      ├─ RenderedRobot[]
  fire()      ├──→ addEvent()                       ├─ RenderedProjectile[]
  damage()    ┤                  (grows each        └─ HUD overlay
  death()     ─┤                   frame)
```

## Implementation: 4 Tasks (T050-T053)

### T050: Live Trace Capture Hook

**Create**: `src/hooks/useLiveMatchTrace.ts`

New hook: `useLiveMatchTrace(world: SimulationWorld): MatchTrace`

Responsibilities:
- Subscribe to entity spawns/deaths
- Capture move events from position changes
- Capture fire events from projectile creation
- Capture damage/death from health changes
- Return live `MatchTrace` object that grows each frame
- Assign sequenceId to each event for deterministic ordering

### T051: Wire Live Trace to Renderer

**Modify**: `src/components/Scene.tsx` and `src/components/Simulation.tsx`

Changes:
- Call `useLiveMatchTrace(world)` in Simulation component
- Pass live trace to `MatchSceneInner` when rendering
- Remove static `RobotPlaceholder` components
- Render dynamic entities from trace

Result: Live match renders in 3D as simulation runs.

### T052: Add Quality Toggle UI

**Modify**: `src/components/hud/ControlStrip.tsx` and `useVisualQuality` hook

Changes:
- Add button to toggle visual quality (High/Medium/Low)
- Update UI store to expose quality selector
- Verify visual changes don't affect trace (quality-invariant simulation)

Result: Players can trade graphics fidelity for performance.

### T053: Between-Rounds UI Component

**Create**: `src/components/match/BetweenRoundsUI.tsx`

Responsibilities:
- Display match result summary (winner, team stats)
- Show kill/damage breakdown
- "Rematch" button (new RNG seed, same teams)
- Team selection screen for first match
- "Export Trace" button (save as JSON for debugging)

Result: Smooth UI flow from one match to next.

## Event Capture Specification

Five instrumentation points in ECS simulation:

### 1. Spawn Events

**Location**: `src/ecs/systems/spawnSystem.ts` → `spawnInitialTeams()`

```typescript
// Add after entity creation:
traceBuilder.addEvent({
  type: 'spawn',
  timestampMs: currentTimestampMs,
  sequenceId: nextSequenceId(),
  entityId: robot.id,
  teamId: robot.team,
  position: { x: robot.position.x, y: robot.position.y, z: robot.position.z },
})
```

### 2. Move Events

**Location**: `src/ecs/simulation/aiController.ts` → `applyMovement()`

```typescript
// Add after position update:
traceBuilder.addEvent({
  type: 'move',
  timestampMs: currentTimestampMs,
  sequenceId: nextSequenceId(),
  entityId: robot.id,
  newPosition: robot.position,
})
```

### 3. Fire Events

**Location**: `src/ecs/systems/weaponSystem.ts` → `runWeaponSystem()`

```typescript
// Add after projectile spawn:
traceBuilder.addEvent({
  type: 'fire',
  timestampMs: currentTimestampMs,
  sequenceId: nextSequenceId(),
  firingEntityId: firer.id,
  projectileId: projectile.id,
  targetPosition: projectile.position,
})
```

### 4. Damage Events

**Location**: `src/ecs/systems/damageSystem.ts` → `applyDamage()`

```typescript
// Add after health update:
traceBuilder.addEvent({
  type: 'damage',
  timestampMs: currentTimestampMs,
  sequenceId: nextSequenceId(),
  targetId: target.id,
  attackerId: attacker?.id,
  amount: damage,
  newHealth: target.health,
  maxHealth: target.maxHealth,
})
```

### 5. Death Events

**Location**: `src/ecs/systems/damageSystem.ts` → `eliminateRobot()`

```typescript
// Add before entity removal:
traceBuilder.addEvent({
  type: 'death',
  timestampMs: currentTimestampMs,
  sequenceId: nextSequenceId(),
  deadEntityId: robot.id,
  killerEntityId: killerRobot?.id,
})
```

## Integration Checklist

- [ ] T050: `useLiveMatchTrace` hook captures all 5 event types
- [ ] T050: Events have proper sequenceId for tie-breaking
- [ ] T050: Hook tracks RNG seed and algorithm metadata
- [ ] T051: Scene.tsx passes live trace to MatchSceneInner
- [ ] T051: Placeholders removed; dynamic rendering active
- [ ] T051: HUD shows entity count and match progress
- [ ] T052: Quality toggle button added to ControlStrip
- [ ] T052: Visual profiles applied without affecting trace
- [ ] T053: BetweenRoundsUI component created
- [ ] T053: Rematch flow working end-to-end
- [ ] All tests still passing (367/368)
- [ ] ESLint clean (0 errors)
- [ ] Manual verification: Play a match, see robots render and fight

## Testing Strategy

### Unit Tests (T050)
- Verify events captured with correct timestamps
- Verify sequenceId ordering for simultaneous events
- Verify RNG metadata recorded in trace

### Integration Tests (T051)
- Start app → see match render
- Verify HUD updates match trace progress
- Verify victory overlay triggers on match end

### E2E Tests (T052-T053)
- Toggle quality settings → visual changes only
- Click Rematch → new trace generated
- Export trace → valid JSON structure

### Existing Tests (verify no regression)
- All 367 existing tests still pass
- Replay system unchanged
- Contract validation still works

## Success Criteria

✅ User starts app and sees a fully rendered 3D battle  
✅ Robots move, fire, take damage in real-time  
✅ Victory overlay displays winner after match ends  
✅ Quality settings don't affect simulation outcome  
✅ Traces are deterministic (same seed = same winner)  
✅ All 367 tests passing  
✅ ESLint 0 errors  

## Design Decisions

| Decision | Rationale | Alternative |
|----------|-----------|-------------|
| Capture at source (not post-sim) | Timing precision | Could reconstruct after, but loses accuracy |
| Reuse MatchSceneInner | No new rendering code | Could create separate live renderer |
| Single trace-driven path | Fewer bugs, clearer | Separate live/replay implementations |
| Grow trace linearly | Simple, debuggable | Could use circular buffer |
| sequenceId for ordering | Deterministic | Could use insertion order only |

---

**Next Steps**: Implement T050-T053 to complete Phase 7 and deliver full feature.
