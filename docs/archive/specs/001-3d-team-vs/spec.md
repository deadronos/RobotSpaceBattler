# 3D Team vs Team Autobattler

> **Physics Scale Reference**: See
> [006-dynamic-arena-obstacles/spec.md](../006-dynamic-arena-obstacles/spec.md#physics-scale--collider-design-decisions-2025-12-10)
> for world unit scale (1:1 meters) and collider sizing decisions.

- **Feature Branch**: `001-3d-team-vs`
- **Created**: 2025-10-06
- **Status**: Implemented (core simulation + minimal UI)

## Summary

The repository implements a complete 10v10 autobattler loop:

- 10 red + 10 blue robots spawn into the arena at match start.
- Robots run autonomous AI (`seek`/`engage`/`retreat`) with captain coordination.
- Three weapon types (`laser`, `gun`, `rocket`) use rock-paper-scissors multipliers.
- Projectiles apply direct-hit damage; rockets apply an AOE explosion.
- Victory is declared when exactly one team has remaining active robots.
- The match auto-restarts after a 5 second countdown.

The UI is intentionally minimal: a top-left status label plus a Settings modal
(currently only toggles Debug UI). There is no post-battle stats screen or
dedicated victory overlay.

## Functional Requirements (as implemented)

- **FR-001**: System MUST spawn exactly 10 red team robots and 10 blue team robots.
  - Implementation: `spawnTeams` uses `TEAM_CONFIGS[team].spawnPoints.slice(0, 10)`.

- **FR-002**: System MUST provide autonomous AI control for all robots.
  - AI behavior uses `RobotAIState.mode: "seek" | "engage" | "retreat"`.
  - Team coordination uses a captain role (`robot.isCaptain`).
  - Captain election is deterministic per `contracts/captain-election-contract.md`.

- **FR-003**: System MUST support three weapon types with RPS balance.
  - Laser beats Gun, Gun beats Rocket, Rocket beats Laser.
  - Exact base damages and multipliers are in `contracts/scoring-contract.md`.

- **FR-004**: System MUST detect weapon hits and apply damage.
  - Damage is `baseDamage(attackerWeapon) * multiplier(attackerWeapon, defenderWeapon)`.

- **FR-005**: System MUST remove eliminated robots from active simulation.
  - When a robot dies, captaincy is re-applied for that team.

- **FR-006**: System MUST determine and display the winning team.
  - Winner is displayed via the `#status` element.
  - A 5 second auto-restart countdown is shown in the status.
  - Manual controls:
    - `Space`: pause/resume.
    - `R`: reset immediately.
  - Settings access is provided via a gear button.

- **FR-007**: System MUST render the arena as a space-station environment.

- **FR-008**: System MUST render real-time shadows for major scene elements.

- **FR-009**: System MUST render visible robots with team differentiation.
  - Robot visuals are procedural placeholders (not humanoid meshes).

- **FR-010**: System SHOULD target interactive frame rates and provide tuning knobs.
  - Manual quality toggles exist (instancing enablement + max instance budgets).

- **FR-011**: System MUST use an ECS architecture with Miniplex.

- **FR-012**: System MUST support collision and projectile trajectories.
  - Rendering uses `@react-three/rapier` for environment colliders.
  - Robot movement collision against static arena walls/pillars is resolved in code.

- **FR-013**: System MUST provide free camera controls.
  - The scene uses `OrbitControls`.

- **FR-014**: System MUST support match reset / replay.
  - Auto-restart on victory and manual reset are implemented.

- **FR-015**: System MUST include a minimal app scaffold that mounts the simulation.
  - `src/main.tsx`, `src/App.tsx`, `src/components/Scene.tsx`, and
    `src/components/Simulation.tsx` exist and render a canvas.

- **FR-019**: System SHOULD track per-robot and team aggregates.
  - Telemetry aggregates are tracked in `src/state/telemetryStore.ts`.
  - They are not currently surfaced as an in-game stats UI.

## Not Implemented

- Dedicated victory overlay UI with Stats / Settings buttons
- Post-battle stats screen
- Team composition editing via Settings
- Cinematic camera mode
- Automatic quality scaling, time dilation, and performance warning overlays

## Key Files

- App shell and minimal UI: `src/App.tsx`
- 3D scene setup: `src/components/Scene.tsx`
- Simulation integration (useFrame loop): `src/components/Simulation.tsx`
- Match loop and victory/restart: `src/runtime/simulation/battleRunner.ts`
- Match state machine: `src/runtime/state/matchStateMachine.ts`
- ECS types + world container: `src/ecs/world.ts`
- Robot spawning: `src/ecs/systems/spawnSystem.ts`
- Captain election: `src/lib/captainElection.ts`
- AI update loop: `src/ecs/systems/aiSystem.ts`
- Weapons and multipliers: `src/simulation/combat/weapons.ts`

## Validation

```bash
npx vitest tests/spawn-system.spec.ts
npx vitest tests/captain-election.spec.ts
npx vitest tests/runtime/matchStateMachine.spec.ts
npx vitest tests/runtime/battleRunner.spec.ts
npx vitest tests/ui/AppShortcuts.test.tsx
```
