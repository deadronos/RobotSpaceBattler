# [TASK012] - Modular Tiles and Layout

Status: Pending  
Added: 2025-09-17  
Updated: 2025-09-17

## Original Request

Create modular floor/wall/corner tile components and compose a simple level layout suitable for the arena, using the shared materials.

## Thought Process

Modular components keep geometry simple and reusable; a small arena confirms scale, tiling, and materials in-context.

## Implementation Plan

- Create components in `src/components/environment/`:
  - `FloorTile`, `WallTile`, `CornerTile` (basic box/plane geometry; UVs tileable)
  - `EnvironmentLayout` composing a small arena (e.g., 10x10 floor, enclosing walls)
- Support props: tile size, height, material variant
- Ensure materials from `materials.ts` are passed and reused
- Optional: grid helper for debug placement

## Subtasks

| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 2.1 | Scaffold environment components folder and tile components | Not Started | 2025-09-17 |  |
| 2.2 | Implement `EnvironmentLayout` with a basic arena | Not Started | 2025-09-17 |  |
| 2.3 | Wire shared materials and verify tiling/UVs | Not Started | 2025-09-17 |  |
| 2.4 | Add quick story/demo in `Scene.tsx` behind a flag | Not Started | 2025-09-17 |  |

## Acceptance Criteria

- Tiles render with correct scale and materials; seams acceptable at typical distances
- `EnvironmentLayout` creates an arena with consistent tiling and wall heights
- Reuses shared materials (no unnecessary material instances)

## Links

- Milestone Plan: `plan/milestone-06-implementation-plan.md`
- Design doc: `docs/milestone-06-environment-visuals.md`
