# TASK001 - Friendly-fire and AoE attribution investigation

**Status:** In Progress
**Added:** 2025-10-17
**Updated:** 2025-10-17

## Original Request
Investigate friendly-fire handling and AoE attribution edge cases and add tasks/tests to lock down desired behavior.

## Thought Process
- Weapons/Projectiles store `ownerId` and systems propagate `sourceId` to DamageEvent.
- AoE may overlap multiple entities including friendlies; ensure friendly-fire toggle prevents damage application but still triggers VFX.
- Scoring must attribute kills to `sourceId` where appropriate; projectiles should snapshot ownerId at spawn.

## Implementation Plan
- Add unit tests reproducing friendly-fire off for AoE (projectile impact nearby friendlies should not take damage).
- Audit `ProjectileSystem` to confirm `ownerId` propagation and that `DamageEvent.sourceId` is set.
- Add integration Playwright or Vitest tests if needed.

## Progress Tracking
**Overall Status:** In Progress - 20%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Write unit test: projectile AoE with friendlies present | In Progress | 2025-10-17 | Start with small world fixture |
| 1.2 | Audit ProjectileSystem & DamageSystem | Not Started | | |
| 1.3 | Add integration test if unit tests pass | Not Started | | |

## Progress Log
### 2025-10-17
- Created task and initial plan. Will add tests next.
