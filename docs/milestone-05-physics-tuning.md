# Milestone 05 — Physics & Rapier Tuning

1. Goal
   - Improve physics stability, reduce tunneling, and introduce material-driven interactions.

2. Deliverables
   - Physics config and constants file
   - Continuous collision detection for fast projectiles
   - Surface material definitions (friction, restitution, damage modifiers)
   - Tests reproducing previous physics issues

3. Tasks
   - Audit Rapier usage and current parameters.
   - Introduce CCD and tuned timestep handling where needed.
   - Add surface materials and wire them into damage and movement systems.

4. Timeline
   - 2 sprints for initial tuning and tests; ongoing tuning as features grow.

5. Risks
   - Tuning may degrade performance if not carefully profiled.
   - Changes to authoritative physics rules may require API/big changes.

6. Acceptance Criteria
   - Reduced tunneling in projectile tests.
   - Stable stacks and predictable collisions in the test suite.
