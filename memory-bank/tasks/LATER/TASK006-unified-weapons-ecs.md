# TASK006 - Unified weapons ECS

**Status:** In Progress
**Added:** 2025-09-15
**Updated:** 2025-09-17

## Original Request

Build a modular weapons architecture that supports guns, lasers, and rockets using shared ECS components and systems.

## Thought Process

A unified weapon model reduces duplication between hitscan, projectile, and beam weapons. Shared components like cooldown, ammo, and ownership keep behaviour consistent while specialised systems handle unique mechanics.

## Implementation Plan

- Draft weapons design doc.
- Define weapon-related ECS components.
- Implement seeded RNG helper.
- Add WeaponSystem skeleton.
- Add HitscanSystem skeleton.
- Add ProjectileSystem skeleton.
- Add BeamSystem skeleton.
- Add unit tests for seeded RNG.
- Integrate systems into Simulation.
- Document usage and examples.
- Add tests for weapon behaviours.
- Profile projectile pooling and performance.

## Progress Tracking

**Overall Status:** In Progress - 70%

### Subtasks

| ID   | Description                                | Status      | Updated    | Notes                                                                                  |
| ---- | ------------------------------------------ | ----------- | ---------- | -------------------------------------------------------------------------------------- |
| 6.1  | Draft weapons design doc                   | Complete    | 2025-09-15 |                                                                                        |
| 6.2  | Define weapon ECS components               | Complete    | 2025-09-17 | `src/ecs/weapons.ts` now matches live component inventory.                             |
| 6.3  | Implement seeded RNG helper                | Complete    | 2025-09-15 | via TASK002                                                                            |
| 6.4  | Implement WeaponSystem skeleton            | Complete    | 2025-09-17 | Coordinating cooldown+target logic in `WeaponSystem.ts`.                               |
| 6.5  | Implement HitscanSystem skeleton           | Complete    | 2025-09-17 | Physics-aware raycast + friendly-fire filtering live in `HitscanSystem.ts`.            |
| 6.6  | Implement ProjectileSystem skeleton        | Complete    | 2025-09-17 | Rocket spawning, homing, and AOE handling landed in `ProjectileSystem.ts`.             |
| 6.7  | Implement BeamSystem skeleton              | Complete    | 2025-09-17 | Beam lifecycle + tick damage handled in `BeamSystem.ts`.                               |
| 6.8  | Add unit tests for seeded RNG              | Complete    | 2025-09-15 |                                                                                        |
| 6.9  | Integrate systems into Simulation          | Complete    | 2025-09-17 | `Simulation.tsx` wires weapon -> damage -> respawn queue.                              |
| 6.10 | Document usage and examples                | In Progress | 2025-09-17 | Updated `docs/weapons.md` with pipeline + usage; still need runnable snippet/examples. |
| 6.11 | Add tests for weapon behaviours            | Complete    | 2025-09-16 | Coverage across hitscan/projectile/beam suites in `tests/`.                            |
| 6.12 | Profile projectile pooling and performance | Not Started |            | Pending perf investigation.                                                            |

## Progress Log

### 2025-09-15

- Created weapons design doc (`docs/weapons.md`).
- Added weapon component definitions and system skeletons.
- Implemented seeded RNG helper with tests.

### 2025-09-16

- Promoted projectile and beam entities to renderable Rapier/Three nodes.
- Hooked Simulation to render ECS projectiles/beams and keep state synced.
- Updated ProjectileSystem to read/write Rapier transforms instead of manual integration.
- WeaponSystem now derives aim vectors from tracked targets and emits targetId.
- Hitscan/Beam/Projectile systems resolve owners via helpers, enforce friendly-fire filters, and reuse event target ids.
- Robot factory now assigns numeric entity ids for stable owner/source identifiers.
- Added weapon-targeting regression tests.

### 2025-09-17

- Reviewed current `/src` weapon systems to confirm implementation coverage.
- Refreshed `docs/weapons.md` to match the live pipeline and document usage guidance.
- Narrowed remaining scope to developer examples and projectile pooling perf profiling.
