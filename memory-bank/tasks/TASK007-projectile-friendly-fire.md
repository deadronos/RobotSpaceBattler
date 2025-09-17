# [TASK007] ProjectileSystem: add friendly-fire checks

**Status:** Not Started  
**Added:** 2025-09-17  
**Updated:** 2025-09-17

## Original Request

Implement friendly-fire filtering in the `ProjectileSystem` so that projectiles do not apply damage to same-team entities when friendly-fire is disabled by the game mode or global config.

## Implementation Plan

- Inspect `src/systems/ProjectileSystem.ts` to find where projectiles perform collision/hit resolution.
- Add a config flag in the system or reference a global game mode flag (e.g. `useUI()` or `uiStore` or central `gameConfig`) to determine whether friendly-fire is allowed.
- On hit resolution, ignore collisions where `projectile.sourceTeam === target.team` when friendly-fire is disabled.
- Ensure projectiles still apply effects to neutrals/environment or when friendly-fire is enabled.
- Add unit tests for:
  - Projectile does not damage same-team entity when friendly-fire is false.
  - Projectile damages other-team entity normally.
  - Projectile still collides with environment and triggers FX/events.

## Acceptance Criteria

- Projectiles ignore same-team entities when friendly-fire is disabled.
- Tests demonstrate both blocked friendly-fire and allowed enemy damage.
- No regressions in existing projectile lifecycle tests.

## Test Plan (Vitest)

- New tests added to `tests/projectile-friendly-fire.test.ts`:
  - Setup a minimal ECS world (or mock) with two entities: shooter (team A) and target (team A). Spawn a projectile with `sourceTeam = A` and `friendlyFire = false`. Run the collision resolution step and assert target's health unchanged.
  - Repeat with target on team B and assert damage applied.
  - Add a test to ensure that environment collisions still resolve (mock an environment body) and that the projectile is cleaned up after impact.

## Notes

- If there is an existing central config or `uiStore` entry for game rules, prefer to read friendly-fire from there for consistency.
- Keep the change minimal and thoroughly test edge cases like AOE projectiles and chain reactions.
