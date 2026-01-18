# Quickstart: NavMesh Pathfinding (Using the Implemented Library)

**Feature**: NavMesh Pathfinding (library)  
**Date**: 2025-12-10  
**For**: Developers running tests, debugging, or integrating pathfinding into gameplay

## Prerequisites

- Node.js 18+ installed
- Dependencies installed (`npm install`)

## Sanity Check

```bash
npm run test
npm run typecheck
npm run lint
```

## Focused Tests

```bash
# Run all pathfinding-related unit and integration tests
npm run test -- pathfinding

# Run a specific suite
npm run test -- PathfindingSystem.test.ts
```

## Minimal Usage (Library)

The public API is exported from `src/simulation/ai/pathfinding/index.ts`.

```ts
import NavMesh from 'navmesh';

import {
  extractArenaConfiguration,
  NavMeshGenerator,
  NavMeshResource,
  PathfindingSystem,
  createPathComponent,
} from '@/simulation/ai/pathfinding';

const arenaConfig = extractArenaConfiguration();
const mesh = new NavMeshGenerator().generateFromArena(arenaConfig, 0.95);
const meshInstance = new NavMesh(mesh.polygons.map((p) => p.vertices));
const navMeshResource = new NavMeshResource(mesh, meshInstance);
const pathfinding = new PathfindingSystem(navMeshResource);

const pathComponent = createPathComponent();
pathComponent.requestedTarget = { x: 10, y: 0, z: 10 };
pathComponent.status = 'pending';

pathfinding.execute([
  { id: 'robot-1', position: { x: 0, y: 0, z: 0 }, pathComponent },
]);

// If a path exists, PathfindingSystem mutates the component:
// - pathComponent.path
// - pathComponent.status
// - pathComponent.lastCalculationTime
```

## Debug Visualization

Optional debug components exist under `src/visuals/debug/`:

- `NavMeshDebugger` renders mesh polygons
- `PathDebugger` renders one or more `NavigationPath` instances

They are not wired into the app by default; mount them in a dev-only scene where you have
access to the generated `NavigationMesh` and active paths.

```tsx
import { NavMeshDebugger } from '@/visuals/debug/NavMeshDebugger';
import { PathDebugger } from '@/visuals/debug/PathDebugger';

export function DebugOverlay({ navMesh, paths }: { navMesh: any; paths: any[] }) {
  return (
    <>
      <NavMeshDebugger navMesh={navMesh} />
      <PathDebugger paths={paths} showWaypoints />
    </>
  );
}
```

## Notes

- Dynamic obstacle invalidation is not currently integrated end-to-end.
- Updating the mesh at runtime requires recreating the search/system state (see
  contracts/pathfinding-api.md).
