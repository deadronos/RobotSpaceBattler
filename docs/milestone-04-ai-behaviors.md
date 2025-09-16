# Milestone 04 — AI Behaviors & Tactics

1. Goal
   - Implement layered AI (perception -> decision -> tactics) for believable robot behavior and squad tactics.

2. Deliverables
   - AI modules under `src/systems/ai/` (perception, decision, tactic)
   - Example behavior sets (aggressive, defensive, flanker)
   - Deterministic mode for unit tests and simulation playback

3. Tasks
   - Design perception filters and memory (sight/hearing, stale time).
   - Implement utility-based decision-making or a small behavior tree runtime.
   - Add squad-level directives and simple pathing heuristics.
   - Add unit tests for decision determinism.

4. Timeline
   - 3 sprints for core behaviors, additional sprints for polish and squad tactics.

5. Risks
   - Non-deterministic behaviors in tests due to RNG or physics.
   - Interference with existing movement/weapon systems.

6. Acceptance Criteria
   - Deterministic AI decisions in unit tests.
   - Visible, debuggable behaviors in Simulation demo.
