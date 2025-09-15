# TASK006 - Unified weapons ECS

**Status:** In Progress
**Added:** 2025-09-15
**Updated:** 2025-09-16

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

**Overall Status:** In Progress - 35%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 6.1 | Draft weapons design doc | Complete | 2025-09-15 | |
| 6.2 | Define weapon ECS components | In Progress | 2025-09-15 | |
| 6.3 | Implement seeded RNG helper | Complete | 2025-09-15 | via TASK002 |
| 6.4 | Implement WeaponSystem skeleton | In Progress | 2025-09-15 | |
| 6.5 | Implement HitscanSystem skeleton | In Progress | 2025-09-15 | |
| 6.6 | Implement ProjectileSystem skeleton | In Progress | 2025-09-16 | Added Rapier-backed projectile entities with ECS sync. |
| 6.7 | Implement BeamSystem skeleton | In Progress | 2025-09-16 | Added beam render component to visualise active beams. |
| 6.8 | Add unit tests for seeded RNG | Complete | 2025-09-15 | |
| 6.9 | Integrate systems into Simulation | In Progress | 2025-09-16 | Projectiles/beams now spawn with visual + physics actors in Simulation. |
| 6.10 | Document usage and examples | In Progress | 2025-09-15 | |
| 6.11 | Add tests for weapon behaviours | Not Started |  | |
| 6.12 | Profile projectile pooling and performance | Not Started |  | |

## Progress Log
### 2025-09-15
- Created weapons design doc (`docs/weapons.md`).
- Added weapon component definitions and system skeletons.
- Implemented seeded RNG helper with tests.
\n### 2025-09-16\n- Promoted projectile and beam entities to renderable Rapier/Three nodes.\n- Hooked Simulation to render ECS projectiles/beams and keep state synced.\n- Updated ProjectileSystem to read/write Rapier transforms instead of manual integration.\n
