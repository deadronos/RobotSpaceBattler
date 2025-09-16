# Milestone 02 — Robot Evolution System

1. Goal
   - Build a modular robot system enabling procedural and designer-driven evolution, upgrades, and mix-and-match parts.

2. Deliverables
   - Robot prefab API (`src/robots/robotPrefab.tsx`)
   - Upgrade components and data schema
   - Spawn rules and deterministic RNG hooks (`src/utils/seededRng.ts`)
   - Unit tests for prefab generation

3. Tasks
   - Design robot component schema (body, sensors, weapons, locomotion, utility).
   - Implement a prefab factory and deterministic spawn patterns.
   - Add upgrade/evolution system applying component deltas.
   - Add sample prefabs for light, medium, heavy classes.

4. Timeline
   - 3-4 sprints (2-3 weeks each) to prototype and ship basic system.

5. Risks
   - Overcomplex part interaction causing bugs.
   - Performance impact with many unique prefabs.

6. Acceptance Criteria
   - Prefabs can be generated deterministically in tests.
   - Upgrades apply without breaking physics or ECS invariants.
