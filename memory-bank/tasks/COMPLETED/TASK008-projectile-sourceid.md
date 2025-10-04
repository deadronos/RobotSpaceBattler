# [TASK008] ProjectileSystem: sourceId wiring from weapon

**Status:** Completed  
**Added:** 2025-09-17  
**Updated:** 2025-09-17

## Original Request

Replace hard-coded `sourceId: 0` used when spawning projectiles with the actual `sourceId` or entity id of the weapon or firing entity so damage & attribution are correct.

## Implementation Plan

- Inspect `src/systems/ProjectileSystem.ts` for the place where projectiles are spawned and where the `sourceId` (or equivalent) is set on the projectile entity.
- Trace the weapon/attachment component or firing event that triggers projectile spawn to locate the originating entity id.
- Modify projectile spawn code to use the originating entity id (or weapon.id) and propagate it into projectile component data (e.g., `projectile.sourceId`).
- Ensure other systems that read `sourceId` (DamageSystem, scoring) accept the value and attribute damage correctly.
- Add unit tests that verify attribution:
  - A projectile spawned by entity X should carry `sourceId = X` and DamageSystem should increment kill/score for X on a successful kill.
  - Ensure existing projectile tests do not assume `sourceId === 0`.

## Acceptance Criteria

- Spawned projectiles carry the originating weapon/entity id as `sourceId`.
- Damage attribution uses `sourceId` for scoring and logging.
- Unit tests added/updated to check proper `sourceId` wiring.

## Test Plan (Vitest)

- Add `tests/projectile-sourceid.test.ts`:
  - Create two entities: shooter (id A) and target (id B). Fire a projectile from shooter and run the systems until the projectile hits target. Assert that the projectile component contains `sourceId === A` and the DamageSystem attributes damage/kill to A.
  - Add a negative test to ensure an environment-spawned projectile (if any) without a valid sourceId behaves gracefully (e.g., `sourceId` may be null or -1 and scoring not attributed).

## Notes

- This change reduces ambiguity in scoring and event logs and is required for analytics/telemetry of shooters.
- Keep changes small and safe: update tests in step with code changes to avoid breakage.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks

| ID  | Description                                             | Status   | Updated    | Notes                                                                           |
| --- | ------------------------------------------------------- | -------- | ---------- | ------------------------------------------------------------------------------- |
| 1.1 | Derive projectile owner id from resolved firing entity  | Complete | 2025-09-17 | `projectileSystem` now prefers the resolved entity id over stale event ownerId. |
| 1.2 | Add regression test covering fallback owner attribution | Complete | 2025-09-17 | Added coverage to `tests/weapon-targeting.test.ts`.                             |

## Progress Log

### 2025-09-17

- Confirmed existing projectile wiring and added fallback to resolved owner id when spawning rockets in `src/systems/ProjectileSystem.ts`.
- Added Vitest regression ensuring rocket projectiles inherit the resolved owner id even if the fire event passes a placeholder.
- Ran `npm run test -- weapon-targeting.test.ts` to verify affected suite.
