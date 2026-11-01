# Architecture & Project Structure

RobotSpaceBattler is a 3D team versus game built with React, Three.js, and Miniplex (ECS).

## Project Structure Overview

- `src/` – Core application code.
  - `main.tsx`, `App.tsx` – Application entrypoints.
  - `simulation/` – Game logic (AI, Physics, Pathfinding).
  - `visuals/` – 3D rendering and debug components.
  - `ecs/` – Entity definitions and system orchestration.
  - `state/` – Global state management (Zustand).
  - `ui/` – React-based HUD and menus.

## Rendering & Position Ownership

**The ECS is the single owner of robot positions.** The simulation (fixed 60 Hz
steps in `BattleRunner`) writes `robot.position`; everything on screen is a
projection of it.

- **No per-frame React renders.** `matchStateMachine` only notifies `onChange`
  on phase changes, resets, and the whole-second tick of the victory countdown;
  per-step `elapsedMs` is available through `getSnapshot()`. `App` and
  `Simulation` therefore do not re-render while a match runs. `Simulation` is
  `React.memo`.
- **Ref-driven transforms.** `RobotPlaceholder` renders once per robot and
  copies the ECS position onto its group in `useFrame`
  (`applyRobotTransform`). Geometries and materials are module-level and shared
  (one pair per team colour). Obstacles (`ObstacleVisual`) are synced the same
  way. Instanced projectiles, lasers and effects read their live ECS stores in
  `useFrame`. (Instancing robots is tracked in #168.)
- **Membership vs. motion.** `useEntityList` re-renders a layer only when
  entities are added or removed (a robot spawned or died), never because they
  moved. `FallbackVfx` (non-instanced VFX, used when instancing is off) is the
  only subtree that re-renders per frame, and only while it has entities.
- **HUD** (`TeamHud`, `RobotListPanel`) reads mutable ECS data on a ~4 Hz tick
  (`useHudTick`), not per frame.
- **Rapier does not own robots.** Robots have no RigidBody or collider. The
  Rapier world holds static geometry only (walls, pillars, obstacle bindings);
  the only queries are predictive-avoidance raycasts filtered to
  `CollisionGroup.STATIC_GEOMETRY`, so robot colliders were never hit and only
  cost broadphase time. If robot-vs-robot physics queries are needed later,
  add `kinematicPosition` bodies and call `setNextKinematicTranslation` from
  the ECS position each fixed step; never the other way round.

## Pathfinding Architecture

The NavMesh system provides obstacle-aware navigation for robots.

### Core Components

**NavMesh Generation** (`src/simulation/ai/pathfinding/navmesh/`)

- `NavMeshGenerator.ts` - Converts arena geometry to walkable polygons.
- Handles static and dynamic obstacles with configurable clearance.

**Path Search** (`src/simulation/ai/pathfinding/search/`)

- `AStarSearch.ts` - Optimal pathfinding over polygon graphs.
- `PathCache.ts` - LRU cache (60s TTL) for high-frequency requests.

**Path smoothing** (`src/simulation/ai/pathfinding/smoothing/`)

- `StringPuller.ts` - Funnel algorithm for straightening paths.
- `PathOptimizer.ts` - Reduces waypoint count by ~40%.

**Integration** (`src/simulation/ai/pathfinding/integration/`)

- `PathfindingSystem.ts` - ECS system managing calculations.
- `PathComponent.ts` - Per-robot path state.

**Coordination** (`src/simulation/ai/coordination/`)

- `BehaviorBlender.ts` - Weighted blending of retreat, combat, and pathfinding.

### Performance & Metrics

- Path Calculation: <5ms P95.
- System Budget: <16ms for 20 simultaneous robots.
- Memory: <5MB sustained.

### Debug Visualization

- `NavMeshDebugger.tsx` - Polygon wireframes.
- `PathDebugger.tsx` - Waypoint markers and lines.
