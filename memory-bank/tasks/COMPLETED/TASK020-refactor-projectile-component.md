# [TASK020] - Refactor Projectile component: extract physics-sync & streak logic

**Status:** Completed  
**Added:** 2025-10-02  
**Updated:** 2025-10-04

## Original Request
Refactor `src/components/Projectile.tsx` to extract physics synchronization into a shared hook and move visual streak math into a small presentational component to reduce allocations and improve testability.

## Thought Process
- Per-projectile math objects are allocated in the component and per-frame logic mixes physics sync and visual calculations. Extracting these concerns will improve CPU usage and allow unit tests for the sync and streak behaviors.

## Implementation Plan
- Implement `useEntityPhysicsSync(entity, options)` that reads/writes position and velocity from/to rigid body and updates ECS position. Unit test with a mock rigid handle.
- Implement `<ProjectileStreak />` presentational subcomponent (or `useStreakTransform(velocity)`) to handle streak rotation/scale/visibility; reuse shared math objects where possible to avoid per-instance allocations.
- Replace direct mesh math in `Projectile` with the new hook/component and keep visual parity. Add tests for streak visibility thresholds and physics sync behaviors.  

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 5.1 | Implement `useEntityPhysicsSync` + tests | Complete | 2025-10-04 | Added `src/hooks/useEntityPhysicsSync.ts` and targeted Vitest coverage. |
| 5.2 | Implement `ProjectileStreak` component/hook | Complete | 2025-10-04 | Created `src/components/ProjectileStreak.tsx` with reusable math state. |
| 5.3 | Wire into `Projectile.tsx` and clean up lifecycle code | Complete | 2025-10-04 | `Projectile.tsx` now consumes hook and renders `<ProjectileStreak />`. |
| 5.4 | Add unit tests and validate render tests | Complete | 2025-10-04 | Added `tests/useEntityPhysicsSync.test.tsx` and `tests/projectile-streak.test.ts`; ran focused Vitest suite. |

## Progress Log
### 2025-10-02
- Task created and scoped.

### 2025-10-04
- Implemented `src/hooks/useEntityPhysicsSync.ts` to centralize rigid-body translation/velocity sync and refactored `Projectile.tsx` to consume it.
- Extracted `<ProjectileStreak />` (in `src/components/ProjectileStreak.tsx`) handling streak transforms with reusable math refs; `Projectile` now memoizes color palette and delegates streak rendering.
- Authored Vitest coverage in `tests/useEntityPhysicsSync.test.tsx` and `tests/projectile-streak.test.ts`, executed `npm run test -- useEntityPhysicsSync.test.tsx projectile-streak.test.ts` (passing).