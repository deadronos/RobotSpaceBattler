# Space Station Auto-Battler (Prototype)

A 3D team-vs-team auto-battler simulation built with React, TypeScript, and Three.js.

![Space Station Auto-Battler](public/image.png)

## Overview

This project simulates a battle between two teams of 10 humanoid robots (Red vs Blue) on a space station arena. It features:

- **Autonomous AI**: Robots use NavMesh pathfinding, behavior blending, and state machines for
  intelligent navigation and combat.
- **NavMesh Pathfinding**: Obstacle-aware navigation using A* search on polygon meshes with path
  smoothing and caching.
- **Behavior Blending**: Priority-based weighted blending of pathfinding, combat, and retreat
  behaviors for smooth concurrent AI.
- **Physics**: Powered by Rapier physics engine via `@react-three/rapier` for realistic movement and collisions.
- **ECS Architecture**: Uses `miniplex` for efficient entity management.
- **Visuals**: React Three Fiber renderer with shadows, lighting, and instanced visual effects.
- **Procedural Generation**: Arena and robot meshes are procedurally generated (placeholder visuals).

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the Simulation

Start the development server:

```bash
npm run dev
```

Open your browser to `http://localhost:5173`.

### Other Commands

- **Build**: `npm run build` - Builds the project for production.
- **Preview**: `npm run preview` - Serves the production build locally.
- **Lint**: `npm run lint` - Runs ESLint.
- **Format**: `npm run format` - formats code with Prettier.
- **Test**: `npm run test` - Runs unit tests with Vitest.
- **E2E Test**: `npm run playwright:test` - Runs end-to-end tests.

## Project Structure

The codebase is organized in `src/` as follows:

- **`components/`**: React components for the UI and 3D scene (React Three Fiber).
- **`ecs/`**: Entity Component System definitions (World, Systems, Entities).
- **`lib/`**: Utility libraries (Math, Random, Constants).
- **`runtime/`**: Simulation loop and state management logic.
- **`simulation/`**: Core game logic (AI, Pathing, Combat rules, Arena geometry).
- **`state/`**: Global application state (Zustand stores, Quality settings).
- **`visuals/`**: Visual managers (Instancing, Particle effects, Renderer stats).

## Key Technologies

- **React** + **TypeScript**: UI and logic.
- **React Three Fiber (@react-three/fiber)**: 3D rendering.
- **Rapier (@react-three/rapier)**: Physics engine.
- **Miniplex**: ECS library.
- **Zustand**: State management.
- **Vitest**: Unit testing.
- **Playwright**: E2E testing.

## Pathfinding System

The NavMesh pathfinding system enables robots to navigate around obstacles intelligently:

### Features

- **A* Path Search**: Optimal path finding on polygon-based navigation meshes
- **Path Smoothing**: Funnel algorithm and path optimizer reduce waypoint count by ~40%
- **LRU Caching**: Frequently requested paths cached with 60s TTL (>70% hit rate)
- **Behavior Blending**: Concurrent AI execution with weighted blending (retreat > combat >
  pathfinding > idle)
- **Performance**: <5ms P95 path calculation, <16ms for 20 robots, <5MB memory

### Architecture

- `NavMeshGenerator` - Converts arena geometry to walkable polygons
- `AStarSearch` - Optimal path finding algorithm
- `PathOptimizer` & `StringPuller` - Path smoothing and simplification
- `PathfindingSystem` - ECS integration for per-robot path management
- `BehaviorBlender` - Priority-based weighted blending of AI behaviors

### Debug Visualization

Use `NavMeshDebugger` and `PathDebugger` components to visualize:

- NavMesh polygon structure (wireframe overlay)
- Active robot paths with waypoint markers
- Real-time path calculations

See `src/visuals/debug/` for implementation details.

## Documentation

This codebase is fully documented with JSDoc comments. You can inspect any function, class, or
interface in your IDE to see detailed descriptions of its purpose, parameters, and return values.

## Spec Kit (AI-assisted spec & implementation)

This repository is compatible with the GitHub Spec Kit workflow. For a quick introduction and
to get started see the Spec Kit get-started guide:

[Spec Kit: Get started](https://github.com/github/spec-kit?tab=readme-ov-file#-get-started)

Available Slash Commands

| Command | Description |
|---|---|
| /constitution | Create or update project governing principles and development guidelines |
| /specify | Define what you want to build (requirements and user stories) |
| /clarify | Clarify underspecified areas (run before /plan unless explicitly skipped) |
| /plan | Create technical implementation plans with your chosen tech stack |
| /tasks | Generate actionable task lists for implementation |
| /analyze | Cross-artifact consistency & coverage analysis (run after /tasks) |
| /implement | Execute tasks to build the feature according to the plan |

## Pull Request Templates & Contributing guidance

To keep changes aligned with the project's constitution and review expectations, we maintain
multiple PR templates under `.github/PULL_REQUEST_TEMPLATE/`. When opening a PR, pick the
template that best matches the change:

- `feature.md` — new features, user-visible changes, and behavior additions.
- `bugfix.md` — fixes for defects and regressions.
- `chore.md` — maintenance, dependency updates, infrastructure, and cleanup work.

Each template contains a required `CONSTITUTION-CHECK` section. Complete this section with
concrete evidence of compliance (file paths, LOC decomposition plan if any file exceeds
300 LOC, TDD/test evidence, r3f/rendering notes, and any agentic-AI approvals). The CI
workflow will validate that a `CONSTITUTION-CHECK` section is present and will post an
auto-generated draft comment listing changed files and suggested decomposition steps.
