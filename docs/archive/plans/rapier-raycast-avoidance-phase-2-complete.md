# Phase 2 Complete: Create Physics Query Service

Abstracted Rapier raycasting behind a service that gracefully handles missing physics world,
returning null when Rapier is unavailable for headless testing/determinism.

## Files created/changed

- `src/simulation/ai/pathing/physicsQueryService.ts` [NEW]
- `tests/ai/physicsQueryService.spec.ts` [NEW]

## Functions created/changed

- `Vec3` - 3D vector interface type
- `RaycastHit` - raycast result with point, normal, distance
- `PhysicsQueryService` - interface with castRay() and castRayFan() methods
- `RapierWorld` - minimal type definition for Rapier world (avoids full import)
- `createPhysicsQueryService(world)` - factory function with null-safe fallback

## Tests created/changed

- 11 tests covering null/undefined world fallback
- Mocked Rapier world hit/miss scenarios
- FilterMask parameter passing verification
- castRayFan batch operation tests

## Review Status

APPROVED

## Git Commit Message

```text
feat: add physics query service for Rapier raycasting

- Add PhysicsQueryService interface with castRay() and castRayFan() methods
- Add createPhysicsQueryService() factory with null-safe fallback
- Add comprehensive unit tests for both Rapier and fallback paths
```
