# Research Notes (As Built)

**Feature**: 001-3d-team-vs
**Date**: 2025-10-06
**Status**: Captured from current implementation

This file documents the design decisions as they exist in the repository today.

## Key Decisions

### Simulation Architecture: Miniplex ECS + Explicit System Loop

- Simulation state is stored as typed entities in a Miniplex `World<BattleEntity>` (`src/ecs/world.ts`).
- The simulation loop is centralized in `BattleRunner` (`src/runtime/simulation/battleRunner.ts`).

### Physics Usage: Rendering Colliders + Optional Raycasting

- The scene uses `@react-three/rapier` `Physics` for environment colliders and debug integration.
- Robot movement collision against static arena walls/pillars is resolved in the movement system
  (`src/ecs/systems/movementSystem.ts`).
- `BattleRunner` receives an injected Rapier world instance for raycasting/avoidance
  (`BattleRunner.setRapierWorld`).

### AI Model: Simple Modes + Captain Coordination

- `RobotAIState.mode` is one of `seek`, `engage`, `retreat`.
- Captains are elected deterministically (see `contracts/captain-election-contract.md`) and influence
  target selection.
- Formation anchors are computed per team to keep robots spread and to bias movement.

### UI State: Minimal Shell + Debug Tools

- UI is intentionally lightweight: `#status` text plus a `SettingsModal`.
- Telemetry is recorded in a Zustand store (`src/state/telemetryStore.ts`) for debugging and future UI.

### Performance/Quality: Manual Toggles

- Quality settings are managed via `QualityManager` (`src/state/quality/QualityManager.ts`).
- Instancing can be enabled/disabled and budgets adjusted (bullets/rockets/lasers/effects).
- Automatic quality scaling and time dilation are not implemented.
