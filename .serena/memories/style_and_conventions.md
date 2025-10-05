Code style & conventions (augmented):

- Language and stack: TypeScript + React + Vite + react-three-fiber + @react-three/rapier.
- Formatting & linting: Prettier and ESLint. Project uses 2-space indent, single quotes, semicolons, trailing commas (es5), and printWidth 100.

Runtime and design rules (must comply with `.specify/memory/constitution.md`):
- Physics-First: Rapier RigidBody is authoritative. Systems must not overwrite rigid-body transforms directly; use Rapier APIs or dedicated sync systems.
- Deterministic Simulation: Simulation uses `useFixedStepLoop` with a fixed seed (DETERMINISTIC_SEED=12345) and fixed timestep (1/60) for deterministic tests. When adding deterministic tests, provide a seeded RNG helper.
- Testable systems: Systems should export small, pure functions and expose instrumentation hooks when appropriate. `Simulation.tsx` exposes `__testFixedStepHandle` and `__testSimulationInstrumentationHook` for test instrumentation.
- Small composable systems: Keep files under ~300 lines when possible; systems should accept explicit parameter objects (e.g., `weaponSystem({ world, stepContext, events })`).
- ECS usage: miniplex-based components and `worldController` are the canonical representations of game state. Use `entityLookup` and `getRenderKey` for stable render keys.

Testing conventions:
- Unit tests: Vitest under `tests/` and `tests/unit/` where appropriate. Use the exported test handles for deterministic unit tests of simulation logic.
- E2E: Playwright smoke tests under `playwright/tests/`.
