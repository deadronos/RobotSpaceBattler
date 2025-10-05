Onboarding checklist (updated with exact references):

- Verify dev server: npm run dev -> open http://localhost:5173
- Run unit tests: npm run test (Vitest)
- Run Playwright smoke: npm run playwright:install then ensure dev server on 5174 and run npm run playwright:test
- Read these source locations for fast orientation:
  - `src/components/Simulation.tsx` — search for `DETERMINISTIC_SEED` (value `12345`), `FIXED_TIMESTEP` (`1/60`), and exported test handles `__testFixedStepHandle`, `__testSimulationInstrumentationHook`.
  - `src/ecs/miniplexStore.ts` — functions `createRobotEntity`, `resetWorld`, `setPauseVel`, `getPauseVel`, and `worldController`.
  - `src/store/uiStore.ts` — `useUI()` store shape and update methods.
  - `SPEC.md` and `.specify/memory/constitution.md` — authoritative project rules (physics-first, deterministic simulation, test-driven development, small systems, ECS-driven architecture, on-demand rendering).

Developer checks when modifying critical systems:
- If editing physics/transform code, ensure Rapier remains authoritative and update `physicsSyncSystem` as necessary.
- If changing timestep, update constants in `Simulation.tsx` and test harnesses referencing `DETERMINISTIC_SEED` and `FIXED_TIMESTEP`.

Next automation step for this task:
- List serena memories and update any that don't align to the current codebase (done programmatically in this session). Keep memories concise and include exact symbol/file references.
