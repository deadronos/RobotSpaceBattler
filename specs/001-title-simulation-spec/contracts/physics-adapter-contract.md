# Physics Adapter Parity Contract

Purpose

Define the required parity between the Rapier-backed physics adapter and the deterministic
adapter used in unit tests. The goal is that canonical adapter operations return the same
semantic results (within stated tolerances) independent of backing implementation so that
systems (Hitscan, ProjectileSystem, Respawn proximity checks) behave identically in test
harnesses and runtime.

Scope

The contract covers three adapter operations commonly used by simulation systems:

- raycast(origin, direction, maxDistance)
- overlapSphere(center, radius)
- proximityQuery(entityId, range)

Each operation documents the expected return shape, ordering guarantees, and error/fallback
behaviors.

Contract: raycast

- Signature: raycast(origin: {x:number,y:number,z:number}, direction: {x:number,y:number,z:number}, maxDistance: number)
- Return: null | {
    targetId?: string;            // canonicalized gameplay id string when a collider maps to an entity
    id?: string | number;         // raw id included when targetId cannot be derived
    position?: [number,number,number];
    normal?: [number,number,number];
    toi?: number;                 // time-of-impact along ray (distance)
  }
- Ordering: the adapter must return the closest hit along the ray (smallest `toi`).
- Tolerances: when using deterministic adapter heuristics, `toi` may be computed geometrically;
  tests should allow a tolerance of 1e-6 for floating-point differences.
- Determinism: for identical origin/direction/maxDistance, adapters must produce equivalent
  results (same `targetId` and `toi` ordering). If multiple colliders exist at the same `toi`,
  adapters must deterministically choose the same hit according to a stable tie-breaker
  (for example, collider id string ascending).

Contract: overlapSphere

- Signature: overlapSphere(center: {x:number,y:number,z:number}, radius: number)
- Return: Array<{ targetId: string; position?: [number,number,number]; distanceSq?: number }>.
- Ordering: results should be returned sorted by ascending distance (nearest first). Sorting
  is required so consumers observe deterministic ordering.
- Determinism: for identical inputs, deterministic adapter and Rapier adapter must return the
  same set of `targetId`s and the same ordering (within numerical tolerances).

Contract: proximityQuery

- Signature: proximityQuery(entityId: string, range: number)
- Return: Array<{ entityId: string; distanceSq: number }>, sorted ascending by `distanceSq`.
- Determinism: The same entity set and ordering must be returned across adapters for canonical
  test scenarios.

Mapping rules & id canonicalization

- Adapters must prefer to return canonical gameplay ids as strings. When mapping Rapier collider
  payloads to ECS entities, adapters MUST attempt the following (in priority order):
  1. `collider.userData.gameplayId` (string) — preferred
  2. `collider.userData.id` (string or number) — stringify if number
  3. `collider.entityId` or body tags that contain an entity id
- If no id can be mapped, adapter may return `id` (number/string) but callers should expect
  `targetId` to be present for deterministic flows.

Error handling

- Adapters MUST not throw for normal misses; a raycast miss returns `null`.
- For adapter-internal errors (WASM not initialized, invalid parameters), deterministic adapter
  used in unit tests should return a stable empty result rather than throw to avoid non-deterministic
  test failures. The Rapier-backed adapter may surface an error in integration tests if Rapier
  is not available, but unit tests should mock or substitute the deterministic adapter.

Acceptance tests

- Tests in `tests/contracts/physicsAdapter.contract.test.ts` MUST assert parity for a set of
  canonical scenarios that include:
  - Single direct hit (raycast hits one collider)
  - Multiple colliders at different distances (raycast ordering)
  - Edge grazing hit where `toi` is near tolerance
  - overlapSphere with multiple overlapping entities
  - proximityQuery with sorted neighbors

Change control

- If the adapter signature changes, update this contract and the corresponding contract
  tests before merging system changes that rely on the adapter.

---

(End of contract)
