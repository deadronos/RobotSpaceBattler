# Implementation Notes: 3D Team vs Team Autobattler

- **Branch**: `001-3d-team-vs`
- **Date**: 2025-10-06
- **Spec**: [spec.md](./spec.md)
- **Status**: As-built notes (supersedes earlier aspirational plan)

## Scope

The current repository implements the core simulation loop and a minimal UI shell.

Earlier plan drafts described additional UI (victory overlay, stats modal, performance banner,
team composition settings). Those are not implemented.

## Architecture (as built)

- `App` owns the simulation runtime:
  - `BattleWorld` (Miniplex ECS container)
  - `TelemetryPort` (bridges runtime events into the telemetry store)
  - `MatchStateMachine` (phase: initializing/running/paused/victory)

- `Simulation` wires rendering + physics + runtime loop:
  - `Scene` (r3f `Canvas`, lights, shadows, `OrbitControls`)
  - `@react-three/rapier` `Physics` world (environment colliders + raycasting)
  - `BattleRunner` (authoritative simulation stepper)

- `BattleRunner.step(deltaSeconds)`:
  - advances time and updates systems
  - when `phase === "running"`, runs AI, combat, movement, projectiles, and effects
  - evaluates victory and drives the restart countdown

## Source Layout (current)

- Simulation loop: `src/runtime/simulation/battleRunner.ts`
- Match state machine: `src/runtime/state/matchStateMachine.ts`
- ECS container and entities: `src/ecs/world.ts`
- ECS systems: `src/ecs/systems/*.ts`
- AI: `src/ecs/systems/aiSystem.ts` and `src/simulation/ai/*`
- Weapons/damage: `src/simulation/combat/weapons.ts`
- Team spawn config: `src/lib/teamConfig.ts`
- UI shell: `src/App.tsx`, `src/components/Scene.tsx`, `src/components/Simulation.tsx`,
  `src/components/ui/SettingsModal.tsx`

## Known Gaps vs earlier drafts

- No victory overlay UI (status is text-only).
- No post-battle stats UI (telemetry exists but is not surfaced).
- No team composition settings.
- No cinematic camera.
- No automatic quality scaling/time dilation.

## Validation

```bash
npx vitest tests/spawn-system.spec.ts
npx vitest tests/captain-election.spec.ts
npx vitest tests/runtime/matchStateMachine.spec.ts
npx vitest tests/runtime/battleRunner.spec.ts
npx vitest tests/ui/AppShortcuts.test.tsx
```
