# Milestone 06 — Environment Visual Overhaul (Metallic Grey Spacestation)

Goal

- Deliver a coherent metallic grey spacestation aesthetic using PBR materials, emissive elements, and modular tiles.

Scope & Success Criteria

- Demo scene uses modular floor/wall/corner tiles arranged into a small arena.
- Shared PBR material utilities expose roughness/metallic/normal strength/ao intensity and emissive controls.
- Lighting combines IBL (environment map), a directional key light, and a few local fills/area lights.
- Performance remains acceptable on the target dev machine (steady frame rate, modest draw calls, controlled texture memory).

Assumptions

- No external HDRI/texture assets checked in initially; start with generated/placeholder textures and wire asset hooks.
- Keep all changes opt-in and localized to new environment components to avoid gameplay regressions.

Out of Scope (for this milestone)

- Asset pipeline for production textures (addressed in Milestone 07).
- Dynamic GI or advanced postprocessing beyond basic tone mapping/exposure.

Architecture Overview

- Renderer: `src/components/Scene.tsx` remains the composition point.
- New environment module (components + materials utils) is self-contained and toggled on within `Scene`.
- ECS remains authoritative for simulation; environment is mostly static render content.

Phases & Deliverables

1. Shared Materials & Textures

- Deliverables:
  - `src/utils/materials.ts`: helpers to create standard PBR materials with consistent defaults for the metallic grey look
  - Minimal placeholder tiling textures (procedural or generated data) and wiring for albedo/roughness/normal/ao
- Notes:
  - Centralize parameters: color tint, metallic, roughness, normalScale, aoMapIntensity, emissive color/intensity.
  - Ensure materials are R3F/three-friendly and reused for batching where possible.

1. Modular Tiles & Layout

- Deliverables:
  - Components for FloorTile, WallTile, CornerTile and a simple `EnvironmentLayout` that composes a small test arena
  - Optional grid/snap utility for tile placement
- Notes:
  - Geometry: start with simple boxes/planes; set sensible UVs for tiled materials; keep triangle count low
  - Keep transforms static for physics; environment is non-interactive (no RigidBodies for now)

1. Emissive Panels & Ambient Motion

- Deliverables:
  - Emissive panel components with parameterized emissive color/intensity
  - A tiny flicker/oscillation hook or system (React hook in render layer) to animate emissive intensity subtly
- Notes:
  - Keep animation light (sin noise or lightweight PRNG) and configurable via props

1. Lighting Setup (IBL + Directional + Local)

- Deliverables:
  - IBL environment hook (placeholder HDR; ready for future HDRI)
  - Directional light with shadow settings appropriate for the scene scale
  - A few local fills or area lights to accent panels and corners
- Notes:
  - Provide a simple "lighting preset" component with props for intensity/exposure; avoid heavy shadow maps

1. Performance Validation

- Deliverables:
  - Quick profiling checklist (draw calls, texture memory, material count)
  - A small script/utility or test to report material/texture counts after scene mount
- Notes:
  - Keep texture sizes tiny initially; prefer reuse of materials; ensure no per-frame material instancing

Risks & Mitigations

- Texture sizes balloon → start with procedural/placeholder and provide slots for later assets
- Shadow map cost → limit shadow casters/receivers; cap resolution; use bias carefully
- Overdraw from emissive quads → prefer opaque emissive surfaces; avoid large transparent surfaces

Validation Plan

- Visual: screenshot pass comparing intended metallic grey palette
- Technical: inspect materials/texture reuse; verify total draw calls and texture memory are within targets
- Tests: small unit coverage for `materials.ts` defaults and for a basic emissive flicker hook

Links

- Design doc: `docs/milestone-06-environment-visuals.md`
- Tasks: see memory-bank/tasks (TASK011–TASK015)
