# [TASK007] ProjectileSystem: add friendly-fire checks

**Status:** Completed  
**Added:** 2025-09-17  
**Updated:** 2025-09-17

## Original Request

Implement friendly-fire filtering in the `ProjectileSystem` so that projectiles do not apply damage to same-team entities when friendly-fire is disabled by the game mode or global config.

## Implementation Plan

- Inspect `src/systems/ProjectileSystem.ts` to find where projectiles perform collision/hit resolution. (Done)
- Add a config flag in the system or reference a global game mode flag (e.g. `useUI()` or `uiStore`) to determine whether friendly-fire is allowed. (Done; `useUI.friendlyFire`)
- On hit resolution, ignore collisions where `projectile.sourceTeam === target.team` when friendly-fire is disabled. (Done)
- Ensure projectiles still apply effects (like AoE) on impact even if initial collision was with an ally. (Done)
- Add unit tests for:
  - Projectile does not damage same-team entity when friendly-fire is false. (Done)
  - Projectile damages other-team entity normally. (Done)
  - AoE excludes allies when friendly-fire is disabled. (Done)

## Acceptance Criteria

- Projectiles ignore same-team entities when friendly-fire is disabled.
- Tests demonstrate both blocked friendly-fire and allowed enemy damage.
- No regressions in existing projectile lifecycle tests.

## Test Plan (Vitest)

- New tests added to `tests/projectile-friendly-fire.test.ts`:
  - Same-team direct hit: no damage when FF disabled.
  - Enemy direct hit: damage applied.
  - AoE: allies excluded, enemies damaged when FF disabled.
  - Friendly-fire enabled: allies can be damaged.

## Notes

- If there is an existing central config or `uiStore` entry for game rules, prefer to read friendly-fire from there for consistency.
- Keep the change minimal and thoroughly test edge cases like AOE projectiles and chain reactions.

## Progress Log

### 2025-09-17

- Added `friendlyFire` flag to `useUI` store with setter/toggle.
- Updated `ProjectileSystem` to honor friendly-fire for both direct and AoE, while still triggering AoE on allied impacts.
- Added `tests/projectile-friendly-fire.test.ts` with coverage for disabled and enabled FF.
