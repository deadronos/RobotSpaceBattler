# [TASK011] - Shared Materials Utilities and Textures

Status: Completed
Added: 2025-09-17
Updated: 2025-09-17

## Original Request

Create shared PBR materials utilities and a small placeholder texture set that establish the metallic grey spacestation look. Wire helpers for albedo/roughness/normal/ao and emissive settings.

## Thought Process

Centralizing material creation ensures consistent look and lowers draw calls via material reuse. Starting with placeholders keeps asset weight low and unblocks lighting/tile work.

## Implementation Plan

- Create `src/utils/materials.ts` with factory functions:
  - `createMetalGreyMaterial(opts)` returning a `MeshStandardMaterial`
  - `createEmissiveMaterial(opts)` extending metal grey with emissive
  - Share default params: color tint, metallic, roughness, normalScale, aoMapIntensity
- Add tiny placeholder textures (data URLs or generated):
  - `textures/metal-grey/` albedo, roughness, normal, ao (very small, tileable)
  - Export a `loadPlaceholderMetalTextures()` util
- Ensure R3F compatibility: prefer one material instance per variant; document reuse
- Add minimal unit tests for defaults

## Subtasks

| ID  | Description                                                 | Status    | Updated    | Notes                                 |
| --- | ----------------------------------------------------------- | --------- | ---------- | ------------------------------------- |
| 1.1 | Create `src/utils/materials.ts` with defaults and factories | Completed | 2025-09-17 | Added JSDoc and emissive helpers      |
| 1.2 | Add placeholder tiling textures and loader util             | Completed | 2025-09-17 | Procedural textures via `DataTexture` |
| 1.3 | Document usage in JSDoc and `docs/`                         | Completed | 2025-09-17 | Notes added to milestone doc          |
| 1.4 | Add unit tests for defaults and factory options             | Completed | 2025-09-17 | `tests/materials.test.ts`             |

## Acceptance Criteria

- `materials.ts` exports compile and factories return MeshStandardMaterial with expected defaults
- Visual check: applied to a box shows metallic grey with subtle roughness/normal
- Tests pass for default parameters and emissive handling

## Links

- Milestone Plan: `plan/milestone-06-implementation-plan.md`
- Design doc: `docs/milestone-06-environment-visuals.md`
