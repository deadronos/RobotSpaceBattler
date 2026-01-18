# NavMesh Library Research

**Date**: 2025-12-10  
**Context**: Browser-based 3D simulation; evaluate a lightweight NavMesh search dependency

## Decision

Use the `navmesh` npm package (mikewesthad/navmesh) for path search and funnel-style
smoothing primitives.

## How It Is Used (Current Implementation)

- NavMesh generation is custom and lives in
  `src/simulation/ai/pathfinding/navmesh/NavMeshGenerator.ts`.
- Search uses `src/simulation/ai/pathfinding/search/AStarSearch.ts`, which wraps the `navmesh`
  package.
- The `navmesh` package uses 2D points `{ x, y }`; this project maps arena `(x, z)` to
  `(x, y)`.
- Integration helpers live in `src/simulation/ai/pathfinding/integration/`:

  - `NavMeshResource`
  - `PathComponent`
  - `PathfindingSystem`

## Alternatives

- `@recast-navigation/core`: Strong option if/when runtime mesh updates and more advanced
  features become necessary, but it brings WASM complexity and a larger footprint.

## Limitations

- Runtime NavMesh updates/dynamic obstacle invalidation are not integrated end-to-end.
- Updating the mesh requires recreating the search/system state (see
  `contracts/pathfinding-api.md`).

## References

- navmesh: [mikewesthad/navmesh](https://github.com/mikewesthad/navmesh)
- @recast-navigation/core: [isaac-mason/recast-navigation-js](https://github.com/isaac-mason/recast-navigation-js)
