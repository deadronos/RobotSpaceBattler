# Phase 1 Complete: Create Collision Group Constants

Defined bitmask constants for Rapier collision filtering with a helper function
to pack membership and filter values into 32-bit interaction groups.

## Files created/changed

- `src/lib/physics/collisionGroups.ts` [NEW]
- `tests/lib/collisionGroups.spec.ts` [NEW]

## Functions created/changed

- `CollisionGroup` - const object with WALL, PILLAR, ROBOT, PROJECTILE, STATIC_GEOMETRY bitmasks
- `CollisionGroupValue` - TypeScript type for type-safe usage
- `interactionGroups(membership, filter)` - packs two 16-bit values into 32-bit integer

## Tests created/changed

- 5 tests for CollisionGroup bitmask values
- 7 tests for `interactionGroups()` function covering edge cases

## Review Status

APPROVED

## Git Commit Message

```
feat: add collision group constants for Rapier raycasting

- Add CollisionGroup bitmasks (WALL, PILLAR, ROBOT, PROJECTILE, STATIC_GEOMETRY)
- Add interactionGroups() helper to pack membership/filter into 32-bit value
- Add comprehensive unit tests for all collision group functionality
```
