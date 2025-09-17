# [TASK013] - Emissive Panels and Flicker Animation

Status: Pending  
Added: 2025-09-17  
Updated: 2025-09-17

## Original Request

Add emissive panel components and a subtle animated flicker for ambiance.

## Thought Process

A light ambient motion improves scene life without heavy effects. Keep animation cheap and configurable.

## Implementation Plan

- Create `EmissivePanel` in `src/components/environment/EmissivePanel.tsx`
  - Props: size, color, emissiveIntensity, flicker (boolean), flickerSpeed, flickerAmount
- Implement `useEmissiveFlicker` hook in `src/components/environment/hooks.ts` or `src/utils/materials.ts`
  - Uses a sine/noise-based modulation per-frame when enabled
  - Avoid material churn; update emissiveIntensity only
- Provide a few panels in `EnvironmentLayout`

## Subtasks

| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 3.1 | Implement `EmissivePanel` component | Not Started | 2025-09-17 |  |
| 3.2 | Implement `useEmissiveFlicker` hook | Not Started | 2025-09-17 |  |
| 3.3 | Integrate panels into `EnvironmentLayout` | Not Started | 2025-09-17 |  |
| 3.4 | Unit test: flicker modulates intensity within bounds | Not Started | 2025-09-17 | Vitest |

## Acceptance Criteria

- Panels render with emissive tint; optional flicker animates smoothly without stutter
- No per-frame material re-instantiation; only property updates
- Flicker parameters are configurable and tested for bounds

## Links

- Milestone Plan: `plan/milestone-06-implementation-plan.md`
- Design doc: `docs/milestone-06-environment-visuals.md`
