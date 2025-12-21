# Phase 8 Complete: Add Collision Groups to Visual Components

Added collision group filtering to arena geometry (walls and pillars) so that
Rapier raycasts can filter for static obstacles only.

## Files created/changed

- `src/visuals/arena/Walls.tsx` [MODIFY]
- `src/visuals/arena/Pillars.tsx` [MODIFY]

## Functions created/changed

- Added `collisionGroups` prop to Wall RigidBody (membership: WALL)
- Added `collisionGroups` prop to Pillar RigidBody (membership: PILLAR)
- Both filter for ROBOT | PROJECTILE for physics collisions

## Tests created/changed

- Manual verification (raycasts now filter correctly for STATIC_GEOMETRY)

## Review Status

APPROVED

## Git Commit Message

```text
feat: add collision groups to arena walls and pillars

- Add collisionGroups prop to Wall RigidBody with WALL membership
- Add collisionGroups prop to Pillar RigidBody with PILLAR membership
- Enable filtered raycasting for predictive wall avoidance
```
