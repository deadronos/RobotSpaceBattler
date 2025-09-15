---
title: Space Station Auto-Battler Architecture
version: 1.0
date_created: 2025-09-14
last_updated: 2025-09-14
owner: RobotSpaceBattler Team
tags: [architecture, design, game, ai, physics]
---

# Introduction

This specification defines the architecture, components, interfaces, and acceptance criteria for the "Space Station Auto-Battler" prototype (a 10v10 deterministic-feeling 3D auto-battler). It is written to be machine- and human-consumable and provides explicit data contracts, constraints, testing strategies, and examples to support engineering and generative AI automation.

## 1. Purpose & Scope

- Purpose: Describe a clear, unambiguous architecture for the Space Station Auto-Battler so implementers and automation tools (generative models, CI pipelines, test harnesses) can reason about, implement, and validate core systems.

- Scope: The document covers the in-browser single-process prototype using React + TypeScript + react-three-fiber + @react-three/rapier for physics, miniplex for ECS, and zustand for small UI state.

- Intended audience: Engineers, automated code-generation agents, QA engineers, and CI systems that need deterministic contracts for entities/systems, and test automation.

- Assumptions: Units are meters; Rapier physics is authoritative for dynamic transforms; simulation runs on the main thread and uses fixed timestep for determinism where possible.

## 2. Definitions

- ECS: Entity-Component-System, a pattern implemented with `miniplex` in this prototype.

- RigidBody: Rapier physics body (`@react-three/rapier`) used as authoritative transform for physical entities.

- Deterministic-feeling: The simulation should be as reproducible as practical (fixed timestep, seeded RNG for non-deterministic choices).

- Team: Logical grouping of robots: `"red"` or `"blue"`.

- Projectile Prefab: Data describing the spawn parameters for a projectile (shape, speed, damage, owner).

## 3. Requirements, Constraints & Guidelines

Functional requirements

- REQ-001: The simulation must spawn up to 10 robots per team (20 total) with physics-enabled colliders and visuals.

- REQ-002: Robots must be controlled by AI systems that select targets and set linear velocities via Rapier (no direct mesh position mutation).

- REQ-003: Weapons must spawn projectiles using Rapier RigidBodies; collisions apply damage to `Health` components.

- REQ-004: The UI must be able to pause/resume the simulation and read core telemetry (entity counts, fps, paused state).

Non-functional requirements

- NFR-001: Startup must render a scene with lighting and shadows within 5 seconds on a typical dev machine.

- NFR-002: Core unit tests and a Playwright smoke test must run in CI and pass as a minimal gate.

- NFR-003: The system should be test-friendly (pure logic separated from physics where practical).

Security & operational constraints

- SEC-001: No network calls or secret material required for the prototype; any optional analytics must be explicitly gated and documented.

Architectural constraints

- CON-001: Rapier RigidBody transforms are the authoritative source for dynamic positions when physics is enabled. ECS `Transform` should be synchronized from Rapier, not used to overwrite Rapier directly.

- CON-002: Use miniplex as the ECS implementation and zustand for small UI flags (pause, deterministic mode).

- CON-003: AI-heavy computations should be throttled (e.g., 200ms tick) or optionally moved to a worker if expanded beyond prototype scope.

Design guidelines

- GUD-001: Prefer simple colliders (capsule, box) for robots and sphere/ball colliders for projectiles to avoid performance pitfalls.

- GUD-002: Pool projectiles and ephemeral effects to avoid GC churn.

- GUD-003: Always perform sweep checks or raycasts for fast projectiles to reduce tunneling.

Patterns

- PAT-001: Physics-first transform model: Physics -> ECS -> Render.

- PAT-002: One-file entry systems (see `src/components/Simulation.tsx`) that orchestrate per-frame ticks and smaller helper modules for individual systems.

## 4. Interfaces & Data Contracts

All shapes below are TypeScript-like pseudo-schemas that should be serializable to JSON for tests and tooling.

Entity (generic)

```ts
type EntityId = string;
interface Entity {
  id: EntityId;
  components: Record<string, any>;
}
```

Transform component

```ts
interface Transform {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}
```

RigidBodyRef component (rapier reference holder, not serializable)

```ts
interface RigidBodyRef {
  refId: string; // local id used by the runtime to map to Rapier RigidBody
}
```

Team

```ts
type Team = 'red' | 'blue';
interface TeamComp { team: Team }
```

Health

```ts
interface Health { hp: number; maxHp: number; alive: boolean }
```

Weapon

```ts
interface Weapon {
  cooldownMs: number;
  lastFiredAt: number; // timestamp in ms
  projectilePrefab: ProjectilePrefab;
  range: number;
  power: number;
}
```

ProjectilePrefab

```ts
interface ProjectilePrefab {
  speed: number;
  radius: number;
  damage: number;
  lifetimeMs: number;
  isHitscan?: boolean; // optional behavior toggle
}
```

RobotStats

```ts
interface RobotStats { speed: number; turnSpeed: number }
```

Target

```ts
interface Target { entityId: EntityId | null }
```

System contracts (events and expected inputs/outputs)

- Spawn System: Input: spawn request {team, position, prefabOptions}. Output: entity id created with components (Transform, RigidBodyRef, Team, Health, Weapon, RobotStats, Render).

- Physics Sync: Reads Rapier bodies each physics tick; writes ECS `Transform` positions for rendering/logic.

- Movement System: Reads RobotStats and Target; writes commands to Rapier RigidBody (setLinvel or applyImpulse).

- Weapon System: Reads Weapon and Target distance; spawns Projectile entity when fired.

- Projectile System: On collision event, look up impacted entity by RigidBodyRef and apply damage to `Health`.

JSON schema example for `ProjectilePrefab` (for tooling):

```json
{
  "type": "object",
  "properties": {
    "speed": { "type": "number" },
    "radius": { "type": "number" },
    "damage": { "type": "number" },
    "lifetimeMs": { "type": "number" },
    "isHitscan": { "type": ["boolean", "null"] }
  },
  "required": ["speed","radius","damage","lifetimeMs"]
}
```

Event model

- Collision events: { type: 'collision', colliderA: refId, colliderB: refId, timestamp }

- Spawn events: { type: 'spawn', entityId, prefab }

API surface for tests (recommended test harness helpers)

```ts
// Recommended test harness TypeScript signatures
function spawnRobot(team: Team, position: { x: number; y: number; z: number }): Promise<EntityId>;
function stepSimulation(dtMs: number): Promise<void>; // advances fixed-step loop for deterministic tests
function readEntity(id: EntityId): Promise<EntitySnapshot>; // snapshot of components for assertions
```

Recommended helper names:

- spawnRobot(team, position)
- stepSimulation(dtMs)
- readEntity(id)

## 5. Acceptance Criteria

- AC-001: Given the app is started in dev mode, When the simulation begins, Then the scene contains at least one directional light, a physics `Physics` wrapper, and a `Canvas` element (Playwright should find `canvas`).
- AC-002: Given `spawnRobot('red', pos)` is invoked 10 times and `spawnRobot('blue', pos)` 10 times, When simulation runs for 5s, Then at least one projectile must have been spawned and at least one `Health` component value changed.
- AC-003: Given a projectile prefab with `speed` high enough to tunnel in naive placement, When `Projectile System` is run, Then either sweep/raycast or collision should register and apply damage (no silent misses in deterministic tests).
- AC-004: Given `paused` flag toggled, When simulation is paused, Then Rapier body velocities should be zeroed or kept frozen and no AI decisions should progress.

## 6. Test Automation Strategy

- Test Levels: Unit (pure logic), Integration (systems interaction without rendering), End-to-End (Playwright smoke test). See `tests/` and `playwright/tests/smoke.spec.ts` for current examples.
- Frameworks: Vitest for unit + integration; Playwright for E2E; Testing Library for small UI assertions.
- Determinism for tests: Use a seeded RNG for any random choices in AI; provide `stepSimulation(dtMs)` to drive fixed-step simulation in tests.
- CI Integration: Add a lightweight Playwright smoke test and Vitest run as CI gates. Ensure Playwright uses a predictable port (scripts already reference port 5174 for E2E smoke).
- Coverage: Unit tests should cover target selection, damage application, projectile lifetime and pooled reuse code paths.
- Performance tests: Manual stress tests for entity counts; automated timing assertions may be flaky and should be optional.

Test harness recommendations

- Provide helper functions under `tests/utils`:
  - createSeededRng(seed: number)
  - spawnRobotForTest(team, position)
  - stepFixed(ms) that runs both physics and ECS ticks deterministically

## 7. Rationale & Context

- Physics-first authority reduces desyncs between visuals and simulation and is easier to reason about when using Rapier.
- Throttled AI improves CPU usage while staying responsive for prototype purposes.
- Projectile pooling and sweep checks prevent common performance and correctness problems (GC churn, tunneling).

## 8. Dependencies & External Integrations

### External Systems

- EXT-001: Browser (Chromium/Firefox/Safari) - runtime environment for the prototype.

### Third-Party Services

- SVC-001: None required for core prototype. Any telemetry must be optional.

### Infrastructure Dependencies

- INF-001: CI runners with Node.js and Chrome for Playwright tests.

### Data Dependencies

- DAT-001: No external data required. Prefab JSON may be stored in-repo under `src/robots`.

### Technology Platform Dependencies

- PLT-001: Node.js (>=14 recommended) for dev tooling; Vite for dev server; TypeScript.

### Compliance Dependencies

- COM-001: No regulatory constraints for this prototype.

## 9. Examples & Edge Cases

Example: spawning a robot (pseudo-code)

```ts
const id = spawnRobot({ team: 'red', position: {x:0,y:1,z:0} });
// after one simulation step
const snapshot = readEntity(id);
expect(snapshot.components.Team.team).toBe('red');
expect(snapshot.components.Health.alive).toBe(true);
```

Edge cases and handling

- Fast projectiles: perform a raycast from origin to expected position each physics step; if hit, spawn impact event, apply damage, and destroy projectile.
- Physics/Render desync: Always read Rapier RigidBody transforms into ECS Transform before rendering; never write Rapier transforms from mesh positions.
- Entity removal mid-system: Use safe deletion queues — mark entity dead and remove after current system tick to avoid iterator invalidation.

## 10. Validation Criteria

- Unit tests (Vitest) must cover: target selection, damage math, projectile lifetime, and pooling logic.
- Integration tests must simulate spawn -> fire -> collision -> health decrement path.
- Playwright smoke must locate the `canvas` element and verify the simulation started (e.g., entity count or HUD changes) within a configurable timeout.

Pass/Fail criteria for CI

- PASS: All unit and integration tests pass; Playwright smoke test passes on a headless Chromium run.
- FAIL: Any deterministic integration test that asserts on spawn/fire/collision path fails; E2E timeout to find `canvas` or initial telemetry.

## 11. Related Specifications / Further Reading

- `SPEC.md` — original concept & notes (legacy human-focused spec)
- `docs/DEPENDENCIES.md` — third-party dependency overview
- `src/components/Simulation.tsx` — runtime orchestration (implementation entrypoint)
- `src/ecs/miniplexStore.ts` — ECS bootstrap and patterns

---

Notes: Keep this file machine-friendly: avoid idioms, use explicit examples and JSON-like schemas. Update `last_updated` when changes are made to systems (physics authority, AI tick rates, or new components).
