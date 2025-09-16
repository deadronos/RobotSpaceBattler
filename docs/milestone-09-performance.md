# Milestone 09 — Performance Profiling & Optimizations

1. Goal
   - Profile and optimize the simulation to reliably support many entities and sustain target frame rates.

2. Deliverables
   - Profiling scripts and documentation (how to reproduce stress scenarios)
   - ECS query optimizations and pooling for transient entities
   - Rendering optimizations: batching, instancing, LOD

3. Tasks
   - Create benchmark scenes for worst-case entity counts.
   - Run profiler to identify hotspots (GC, CPU, draw calls).
   - Implement pooling for projectiles and temporary effects.
   - Optimize materials to reduce shader permutations.

4. Timeline
   - 2-4 sprints depending on findings.

5. Risks
   - Significant refactors may be required if architecture limits scaling.

6. Acceptance Criteria
   - Target frame-rate (e.g., 60 FPS) at defined entity levels.
   - Measurable reduction in GC and CPU frame time for stress scenes.
