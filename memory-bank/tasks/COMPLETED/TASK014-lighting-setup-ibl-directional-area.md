# [TASK014] - Lighting Setup (IBL + Directional + Local)

Status: Completed
Added: 2025-09-17
Updated: 2025-09-17

## Original Request

Add IBL/environment lighting, a directional key light, and a few local fills/area lights, with a simple preset component.

## Thought Process

Provide a consistent, tunable baseline lighting rig that can evolve later with a real HDRI.

## Implementation Plan

- Implement an `EnvironmentLighting` component in `src/components/environment/EnvironmentLighting.tsx`
  - Props: exposure, envIntensity, dirIntensity, castShadows, shadowSize
- IBL: start with a neutral placeholder env (procedural or generated cube texture); wire for future HDRI
- Directional: set angle, intensity, and conservative shadow settings
- Local fills: 2-3 small area/point lights near walls/panels; keep intensities low
- Expose a single preset used from `Scene.tsx`

## Subtasks

| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 4.1 | Implement `EnvironmentLighting` with props | Completed | 2025-09-17 | Procedural `Environment` + directional + points |
| 4.2 | Add placeholder environment map loader | Completed | 2025-09-17 | Procedural sphere via drei `Environment` |
| 4.3 | Tune directional shadows and verify costs | Completed | 2025-09-17 | Shadow size capped at 1024 |
| 4.4 | Wire into `Scene.tsx` behind a flag | Completed | 2025-09-17 | `ENABLE_ENVIRONMENT` toggles preset |

## Acceptance Criteria

- Lighting renders consistently with env + directional + locals; shadows reasonable
- Toggling the preset updates lighting without console errors
- No significant perf regression from shadows; shadow map sizes capped

## Links

- Milestone Plan: `plan/milestone-06-implementation-plan.md`
- Design doc: `docs/milestone-06-environment-visuals.md`
