# Phase 3 Complete: Create Raycast Scheduler

Implemented frame staggering to distribute raycast load across frames,
so each robot only raycasts every Nth frame with results cached between raycasts.

## Files created/changed

- `src/simulation/ai/pathing/raycastScheduler.ts` [NEW]
- `tests/ai/raycastScheduler.spec.ts` [NEW]

## Functions created/changed

- `shouldRaycastThisFrame(entityId, frameCount, staggerInterval?)` - staggering check
- `CachedResult` interface - stores avoidanceVector and frameStamp
- `RaycastCache` interface - get/set/clear operations
- `createRaycastCache()` - factory for Map-based cache

## Tests created/changed

- 13 tests covering staggering logic with various intervals
- Cache get/set/clear operations and edge cases

## Review Status

APPROVED

## Git Commit Message

```text
feat: add raycast scheduler for frame staggering

- Add shouldRaycastThisFrame() for modulo-based frame distribution
- Add RaycastCache with get/set/clear for result caching
- Add comprehensive unit tests for staggering and caching
```
