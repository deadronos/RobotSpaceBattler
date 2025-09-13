# Documentation Index

- Overview: see [overview.md](./overview.md)
- Quick start: see root [README.md](../README.md)
- Architecture & systems: see root [SPEC.md](../SPEC.md)
- Agent guidance: [AGENTS.md](../AGENTS.md) and [.github/copilot-instructions.md](../.github/copilot-instructions.md)
- Testing:
  - Unit: Vitest setup in [tests/](../tests/) and config in [vitest.config.ts](../vitest.config.ts)
  - E2E: Playwright specs in [playwright/tests](../playwright/tests) and [playwright.config.ts](../playwright.config.ts)
- Development commands (package scripts): see [package.json](../package.json)
- Configuration:
  - Vite: [vite.config.ts](../vite.config.ts)
  - ESLint / Prettier: [eslintrc.cjs](../eslintrc.cjs), [prettierrc.txt](../prettierrc.txt)
  - TypeScript: [tsconfig.json](../tsconfig.json)

## Source Structure

- `src/` application code
  - `components/` React UI and scene components (e.g., `Scene.tsx`, `Simulation.tsx`)
  - `ecs/` entity/component/system helpers
  - `robots/` robot generation and helpers
  - `store/` Zustand UI/simulation state
  - Entries: `main.tsx`, `App.tsx`, `components/Simulation.tsx`

## Common Tasks

- Run dev server: `npm run dev` (http://localhost:5173)
- Build / preview: `npm run build` / `npm run preview`
- Lint / format: `npm run lint` / `npm run format`
- Tests: `npm run test` (coverage: `npm run test:coverage`)
- Playwright (E2E): `npm run playwright:install` then `npm run playwright:test`

## Notes

- Physics authority: use Rapier RigidBody APIs for movement; avoid directly mutating mesh transforms when a RigidBody exists (see SPEC).
- The procedural robot prefab can be replaced with glTF assets in the future.

