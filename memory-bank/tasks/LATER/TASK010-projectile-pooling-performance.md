# TASK010 - Projectile pooling & performance profiling

**Status:** Not Started  
**Added:** 2025-09-17

## Original Request

Investigate projectile allocation and garbage-collection pressure during high-fire scenarios. If needed, add a simple projectile pool or reuse strategy to reduce allocations and improve frame-time stability.

## Thought Process

Projectiles are frequently spawned and removed; this can create GC churn in JavaScript. A pool that recycles projectile objects (or reuses entities) can reduce pressure. First measure and confirm a meaningful hotspot before changing design.

## Implementation Plan

- Add micro-benchmarks or a simple perf test harness that spawns many projectile events for N frames and measures average step time.
- If allocations are a hotspot, implement a pooling layer inside `ProjectileSystem` that reuses entity objects or keeps a lightweight pool of projectile data structures.
- Add unit tests to confirm behavior equivalence (pooling does not change game outcomes) and a small benchmark script in `scripts/` (optional) to reproduce perf numbers.

## Acceptance Criteria

- Measured baseline performance and identified whether projectile allocation is a measurable problem.
- If pooling is implemented: demonstrable reduction in allocations and improved average frame step time in the benchmark.
- Changes are covered by targeted unit tests and documented in `docs/` or the TASK file.

## Notes

- Keep pooling implementation opt-in behind a feature flag so behavior is unchanged by default.
- Prefer a minimal, well-tested implementation rather than a large refactor.
