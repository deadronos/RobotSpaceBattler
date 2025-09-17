# Milestone 06 — Environment Visual Overhaul (Metallic Grey Spacestation)

1. Goal
   - Deliver a coherent metallic grey spacestation aesthetic using PBR materials, emissive elements, and modular tiles.

2. Deliverables
   - Scene/environment components for modular tiles
   - Shared material utilities (`src/utils/materials.ts`)
   - Small texture set (albedo/roughness/normal/ao) and tiling materials
   - Lighting setup: IBL + directional + local area lights

3. Tasks
   - Create modular floor/wall/tile prefabs and a simple level layout.
   - Implement PBR materials and parameterized shader inputs (roughness, metallic).
   - Add emissive panels and animated flicker for ambiance.
   - Validate performance on dev machine (profiling draw calls, texture memory).

4. Timeline
   - 2-3 sprints for a solid baseline visual layer.

5. Risks
   - Asset sizes causing slow loads or memory spikes.
   - Performance differences across GPUs.

6. Acceptance Criteria
   - A demo scene matching the metallic grey look.
   - Good visual consistency with acceptable frame rates on the target environment.

## Implementation Notes (2025-09-17)

- Shared PBR material factories live in `src/utils/materials.ts` and expose `createMetalGreyMaterial`, `createEmissiveMaterial`, and `loadPlaceholderMetalTextures()` for reuse across environment props.
- Procedural placeholder textures for the metallic kit are generated in `src/textures/metalGrey/index.ts` and repeat cleanly to minimize visible seams.
- Modular environment building blocks are available under `src/components/environment/` (`FloorTile`, `WallTile`, `CornerTile`, `EmissivePanel`).
- `EnvironmentLayout` composes a 10×10 arena, including corner pillars and emissive wall panels with a configurable flicker hook.
- `EnvironmentLighting` establishes the baseline rig (procedural environment map + directional + local fill lights) and exposes props for tuning exposure and shadow budgets.
- Scene-level diagnostics can be collected via `collectSceneMetrics` (`src/utils/sceneMetrics.ts`) to validate mesh/material/texture reuse.

## Performance Checklist

1. Use `collectSceneMetrics(scene)` during development to confirm:
   - Mesh count within expected budget (< 150 for the arena demo).
   - Unique materials ≤ 6 and textures ≤ 4 for the modular kit.
2. Keep shadow map sizes at or below 1024 unless profiling shows spare GPU headroom.
3. Prefer reusing materials returned from `createMetalGreyMaterial`/`createEmissiveMaterial` to avoid extra draw calls.
4. If draw calls climb unexpectedly, inspect for accidental material cloning or per-frame material mutation.
