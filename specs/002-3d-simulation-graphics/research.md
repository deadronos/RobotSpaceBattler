# Research: 3D simulation fight graphics

This document records the Phase 0 research tasks and the decisions made to
resolve outstanding clarifications required to implement the battle UI.

## Questions / Unknowns

1. Visual regression strategy: pixel-perfect diffs vs tolerant diffs vs structural snapshots.  
2. Performance instrumentation and CI strategy for perf validations (how to measure and where).  
3. Camera and UI transition edge cases (render-context loss, mid-transition restarts).  

## Research Tasks

- Evaluate SSIM-based tolerant visual diffs (SSIM ≥ 0.97) vs pixelmatch for layout regressions and CI runtime cost.  
- Confirm Playwright `toMatchAriaSnapshot` usage and best practice for automated triage bundles.  
- Inventory existing performance manager knobs and validate which visual fidelity options are safe to toggle at runtime (LOD tiers, particle density, shadow resolution).  

## Decisions

Decision: Use a hybrid strategy — structural ARIA snapshots as primary checks and SSIM-tolerant visual diffs (threshold >= 0.97) for layout/visual regressions.  

Rationale: ARIA snapshots reliably validate UI semantics and are fast. Pixel-perfect diffs are brittle for GPU-rendered scenes and can cause high false-positive rates; SSIM provides perceptual tolerance and reduces noisy failures while still catching meaningful regressions.  

Alternatives considered: Strict pixelmatch diffs (rejected for brittleness) and full manual visual review (rejected for cost).  

---

Decision: Use existing Playwright perf harness and extend it to measure representative round frame-times in CI-controlled runs; store perf snapshots as artifacts and fail only when quality-scaling does not maintain >=30 fps under stressed test inputs.  

Rationale: Existing fixtures and `perfHelper.ts` make this the lowest-risk integration; CI should verify quality-scaling behavior rather than raw 60 fps on arbitrary CI runners.  

Alternatives considered: Run GPU-backed benchmarks in a dedicated lab only (keeps CI green but reduces automated verification scope); rejected because automated checks with triage artifacts provide faster feedback.  

---

Decision: Implement camera and UI transition code defensively — make show/hide transitions idempotent and resilient to rendering-context loss. Add unit tests for interruption/restart scenarios.  

Rationale: Defensive transitions prevent stacked animations and ensure reconnect/resume flows are deterministic.  

Alternatives considered: Simpler transitions without idempotency (rejected because of reported edge-case flakiness).  

## Actionable Research Tasks (for Phase 0 -> Phase 1 handoff)

1. Prototype a Playwright SSIM pipeline on an example scene and measure CI runtime overhead.  
2. Add a small benchmark harness that drives the performance manager across predetermined scenarios (particles-heavy, many robots, cinematic camera) and capture FPS distributions.  
3. Define the minimal set of UI toggles and document how they map to performance manager knobs (e.g., particleCount -> performanceManager.setParticleDensity(level)).  

## Outcome

All clarified: visual-diff approach chosen, test harness selection confirmed, and defensive transition strategy agreed. Proceed to Phase 1 design and contract drafting.
