# [TASK020] - Refactor Projectile component: extract physics-sync & streak logic

**Status:** Pending  
**Added:** 2025-10-02  
**Updated:** 2025-10-02

## Original Request
Refactor `src/components/Projectile.tsx` to extract physics synchronization into a shared hook and move visual streak math into a small presentational component to reduce allocations and improve testability.

## Thought Process
- Per-projectile math objects are allocated in the component and per-frame logic mixes physics sync and visual calculations. Extracting these concerns will improve CPU usage and allow unit tests for the sync and streak behaviors.

## Implementation Plan
- Implement `useEntityPhysicsSync(entity, options)` that reads/writes position and velocity from/to rigid body and updates ECS position. Unit test with a mock rigid handle.
- Implement `<ProjectileStreak />` presentational subcomponent (or `useStreakTransform(velocity)`) to handle streak rotation/scale/visibility; reuse shared math objects where possible to avoid per-instance allocations.
- Replace direct mesh math in `Projectile` with the new hook/component and keep visual parity. Add tests for streak visibility thresholds and physics sync behaviors.  

## Progress Tracking

**Overall Status:** Not Started - 0%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 5.1 | Implement `useEntityPhysicsSync` + tests | Not Started | 2025-10-02 | Mock rigid handles for tests |
| 5.2 | Implement `ProjectileStreak` component/hook | Not Started | 2025-10-02 | Reuse vector/quaternion instances where possible |
| 5.3 | Wire into `Projectile.tsx` and clean up lifecycle code | Not Started | 2025-10-02 | Ensure entity.render/rigid attach/detach remains correct |
| 5.4 | Add unit tests and validate render tests | Not Started | 2025-10-02 | Run `r3f-ecs-sync` and projectile tests |

## Progress Log
### 2025-10-02
- Task created and scoped.
