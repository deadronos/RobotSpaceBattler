# [TASK015] - Performance Validation and Profiling

Status: Pending  
Added: 2025-09-17  
Updated: 2025-09-17

## Original Request

Validate environment performance on dev machine: draw calls, texture memory, shadow costs. Provide a simple profiling checklist and a small utility/test to count materials/textures.

## Thought Process

Catch regressions early with a tiny measurement utility and checklist. Focus on material/texture reuse and shadow budgets.

## Implementation Plan

- Create a diagnostic util `src/utils/sceneMetrics.ts`:
  - Functions to collect counts: meshes, materials (unique), textures (unique), draw calls (if accessible)
- Add a smoke test that mounts `Scene` with environment enabled and logs metrics
- Document acceptable thresholds and remediation tips (reduce shadow size, material reuse)

## Subtasks

| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 5.1 | Implement `sceneMetrics.ts` with basic counters | Not Started | 2025-09-17 |  |
| 5.2 | Add unit test or script to print metrics | Not Started | 2025-09-17 | Vitest/Node |
| 5.3 | Write checklist in docs with targets | Not Started | 2025-09-17 |  |

## Acceptance Criteria

- Metrics util returns sane counts on the demo scene
- Checklist exists with guidance to fix common perf issues
- No significant regressions versus baseline with environment disabled

## Links

- Milestone Plan: `plan/milestone-06-implementation-plan.md`
- Design doc: `docs/milestone-06-environment-visuals.md`
