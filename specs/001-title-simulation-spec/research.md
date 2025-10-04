# Phase 0 — Research

Date: 2025-10-03

Decisions captured from Clarifications session:

- Scoring: Full scoring rules (team +1 for opponent kills; suicide −1 to killer's team;
  friendly-fire −1 to attacker). ScoringSystem must append a bounded in-memory audit entry
  for each death.

- Respawn: Default respawn delay = 5000ms; respawn grants 2000ms invulnerability; spawn
  queue must prevent overcrowding; proximity-avoidance is desirable but deferred to Phase
  2/implementation.

- Deterministic IDs: Use deterministic-prefix+UUID for rendering IDs; gameplay and
  serialization IDs must be deterministic (derived from simNowMs, frameCount, and step RNG).

- Fixed-step loop: `useFixedStepLoop` must accumulate elapsed time and run multiple fixed
  steps per frame when needed; tests should use `FixedStepDriver` directly.

- Friendly-fire toggle: Must be supplied to systems via StepContext or explicit parameter —
  systems must not read `useUI.getState()`.

Rationale (summary):

- Determinism and Physics-first authority are core constitution rules; aligning scoring,
  respawn timing, and IDs with StepContext removes sources of flakiness and enables
  reproducible traces.

- Moving session-level toggles into StepContext decouples UI from simulation, improving
  testability and reducing hidden dependencies.

Open research gaps & follow-ups (Phase 1 inputs):

- Proximity-avoidance algorithm for spawn placement (spatial index vs heuristic).

- Audit log export formats (JSON lines, compact binary) for future lockstep/networking needs.

- Pooling strategy and performance test harness for 500-entity performance target.

References:

- Feature spec: specs/001-title-simulation-spec/spec.md
- Constitution: .specify/memory/constitution.md

## Tech Context

This feature targets the repository's existing frontend tech stack:

## Technologies

- React + TypeScript
- Vite
- @react-three/fiber (Three.js)
- @react-three/rapier (physics)
- miniplex (ECS)
- zustand (UI state)
- Vitest (unit tests)
- Playwright (E2E)

## Dependencies Notes

`docs/DEPENDENCIES-deep-dive.md` has descriptions for mentioned techs.

## Platform Notes & References

This project uses `@react-three/rapier` (Rapier WASM) for physics and `miniplex`
for ECS. The sections below summarize practical, repo-relevant patterns and
links to authoritative APIs discovered during research. Use these notes when
implementing the systems in Phase 2 (Scoring, Respawn, PhysicsSync, Weapon/Hitscan).

### @react-three/rapier (Rapier) — practical guidance

- Treat the Rapier RigidBody API as authoritative for transforms. Read
  translations/rotations via `rigidBody.translation()` / `rigidBody.rotation()` and
  set them with `setTranslation()` / `setRotation()` or velocity helpers like
  `setAngvel()` / `setLinvel()` instead of mutating meshes.

- Subscribe to physics events via `<RigidBody onCollisionEnter={...}>` and
  `onContactForce` handlers to capture collision details (contact points,
  forces). These callbacks provide reliable collision data for DamageSystem and
  ScoringSystem.

- Avoid touching the Rapier world inside component render bodies. Access the
  Rapier world in effects (for example, `const { world } = useRapier(); useEffect(() => { ... }, [])`).
  This prevents render-lifecycle races and matches `react-three-rapier` guidance.

- Configure physics timing explicitly: use `<Physics timeStep={1/60}>` for a
  fixed timestep and `updateLoop="independent"` when you want physics to run
  separately from the render frame. For on-demand rendering pair it with
  `<Canvas frameloop="demand">` so simulation changes trigger renders only
  when necessary.

- Use `InstancedRigidBodies` for large numbers of projectiles or identical
  dynamic objects to reduce CPU/JS work and improve memory locality. When using
  instancing, access per-instance APIs via the returned instance refs.

- Choose collider strategies consciously: automatic colliders (`colliders="hull"`)
  are convenient but can be expensive for complex geometry; manual colliders
  (`BoxCollider`, `SphereCollider`, `MeshCollider`) give control and predictable
  colliders for gameplay logic.

- Use sensor colliders for spawn-proximity checks or trigger areas (they do not
  produce contact forces but can detect intersections reliably).

### miniplex (ECS) — practical guidance

- Reuse query objects. Create queries once (for example:
  `const moving = world.with("position", "velocity")`) and reuse them in
  systems to avoid repeated query allocation overhead.

- Iterate queries with `for...of` so removals are safe during iteration. Do not
  iterate over `query.entities` with `forEach` for systems that may remove
  entities.

- When mutating component values that the `where` clause depends on, call
  `world.reindex(entity)` so queries remain correct. Prefer emitting components
  to represent state transitions (e.g., `dead`, `damaged`) instead of heavy `where`
  filters when appropriate.

- Use `world.id(entity)` and `world.entity(id)` for stable lookups where needed.
  Decide on a canonical id type (we recommend deterministic string ids for
  gameplay traces) and enforce that consistently across factories.

- Use `onEntityAdded` subscriptions from queries to initialize components like
  health or weapon state at creation time. This keeps factories thin and tests
  deterministic.

- Use `miniplex-react` helpers (`createReactAPI`, `useEntities`, `<Entities>`) to
  connect ECS with React rendering while preserving the single-source-of-truth
  ECS model.

### Deterministic testing patterns (practical tips)

- Do not rely on Rapier in unit tests that must be deterministic and fast.
  Wrap physics-dependent operations (raycasts, collision checks, position queries)
  behind small adapter functions and provide a deterministic fallback that uses a
  seeded RNG and simple geometric heuristics. Add tests that assert parity
  between the Rapier-backed implementation and the deterministic fallback for
  canonical scenarios.

- Access Rapier world only in `useEffect` or in test harness setup so test
  harnesses can mock or replace the physics adapter without touching render
  logic.

- Expose a `FixedStepDriver` and small `FixedStepHarness` for tests that need to
  exercise multiple steps deterministically. The harness should accept a `seed`
  value and provide a `simNowMs` and `rng` to each step (this is planned in
  Phase 2 tasks). Tests should assert deterministic trace equality across runs
  given the same seed.

- Prefer pure, small functions for decision logic (classification, damage
  math, spawn selection). Unit-test those functions independently from ECS and
  Rapier to keep tests fast and focused.

### Actionable next steps (Phase 2 alignment)

- Implement a small physics adapter abstraction `src/utils/physicsAdapter.ts`
  with two implementations: `rapierAdapter` (calls Rapier APIs) and
  `deterministicAdapter` (heuristic + seeded RNG). Add contract tests that
  assert output equivalence for canonical cases. (Related tasks proposed in the
  analysis: deterministic fallback tests and implementation.)

- Add a `PhysicsSyncSystem` TDD task to verify authoritative Rapier→ECS sync and
  to enforce the rule that systems read transforms from Rapier rather than
  mutating meshes.

- Reconcile team/id typings between `data-model.md` and `src/` (prefer string
  gameplay IDs and canonical team enum values) and add a small test validating
  idFactory determinism.

References

- React Three Rapier README & examples: /pmndrs/react-three-rapier (rigid body
  APIs, collision events, physics timing, instanced bodies, sensors)
- Miniplex README & examples: /hmans/miniplex (query reuse, entity lifecycle,
  TypeScript typing, React bindings)


Next: Produce data model and contracts for Scoring and Respawn (Phase 1).

<!-- eof -->