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
