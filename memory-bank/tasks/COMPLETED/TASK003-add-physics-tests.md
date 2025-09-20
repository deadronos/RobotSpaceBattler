# TASK003 - Add unit tests for physics sync

**Status:** Completed

**Goal:** Increase coverage for `physicsSync` and related systems without requiring full WebGL rendering.

**Acceptance criteria:**

- Unit tests for core `physicsSync` behaviors (entity transform sync, projectile cleanup).
- Tests run under Vitest and are stable in CI.

## Progress Log

### 2025-09-14

- Created initial Vitest unit tests for `syncRigidBodiesToECS` (tests/physicsSync.test.ts). The tests mock the `miniplexStore` to run headless without WebGL or Rapier.
- Tests added: copy rb translation into ECS positions; skip entities without rb; skip when position length < 3.
- Marked task complete after initial unit tests for `syncRigidBodiesToECS`. Further tests (projectile cleanup) can be added in follow-up tasks.
- Added projectile cleanup unit tests (tests/projectileCleanup.test.ts) covering TTL expiry, out-of-bounds removal, and survival when in bounds.
- Also added collision/onHit simulation tests to verify damage application and projectile removal on hit.
