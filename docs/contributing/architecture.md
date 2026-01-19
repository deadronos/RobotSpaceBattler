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
