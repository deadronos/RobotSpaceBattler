---
# Research — Weapon Diversity Feature (005)

## Technical Context Extraction

### Unknowns / Needs Clarification
- Final values for advantage/disadvantage multipliers (tunable, initial defaults provided)
- Rocket AoE radius and falloff profile (initial: 2–3 units, linear falloff, but needs tuning)
- Visual/audio asset delivery timeline (placeholder assets acceptable for now)
- Performance/quality scaling thresholds for VFX (from specs/002)
- AI weapon selection heuristics (how to prefer weapons based on context)

### Dependencies
- ECS architecture and simulation loop (from specs/001)
- Renderer and UI system (from specs/002)
- Deterministic replay/MatchTrace (from specs/003)
- AI roaming/wall-awareness (from specs/004)

### Integration Points
- Telemetry hooks for weapon events (pickup, fire, hit, AoE, damage)
- In-memory telemetry aggregator for test harness
- MatchTrace file persistence for replay/analysis
- Quality-scaling manager for VFX

---
## Research Tasks

1. Research best practices for damage multipliers in RPS systems (game balance).
2. Research rocket AoE radius and falloff profiles in similar games.
3. Research placeholder VFX/asset pipeline for rapid prototyping.
4. Research performance/quality scaling for particle/beam effects in WebGL/React-three-fiber.
5. Research AI weapon selection heuristics for range and archetype advantage.
6. Research telemetry event design for automated test harnesses and replay.

---
## Decision Log (to be updated as research completes)
- [Pending]