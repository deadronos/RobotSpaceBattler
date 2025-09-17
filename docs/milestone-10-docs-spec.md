# Milestone 10 — Docs & SPEC Updates

1. Goal
   - Keep `SPEC.md` and project docs aligned with architecture and implementation choices.

2. Deliverables
   - Updated `SPEC.md` sections for Robots, Weapons, AI, Physics, Environment
   - Migration notes for any breaking changes
   - API reference snippets for new public interfaces

3. Tasks
   - After each major change, update SPEC with rationale and examples.
   - Maintain a changelog or decision log in `memory-bank/`.

4. Timeline
   - Ongoing, but initial revision within 1 sprint after milestone changes.

5. Risks
   - Docs fall out of sync if not updated alongside code changes.

6. Acceptance Criteria
   - SPEC reflects implemented APIs and is referenced by tests.

7. Recent updates (dev branch)

   - `SPEC.md` expanded with concrete component shapes for `RobotStats` and `Weapon` components, implementation notes for the Rapier authority model, and short API snippets for spawning robots and firing weapons.
   - Migration guidance added: prefer `RigidBody` APIs (setLinvel, setTranslation) over direct mesh transforms.

8. Next steps

   - Link SPEC sections from the developer README and `memory-bank/` so tests and contributors can easily find authoritative API shapes.
   - Add unit tests that assert the component shapes remain stable (schema tests) and fail CI on breaking changes.

