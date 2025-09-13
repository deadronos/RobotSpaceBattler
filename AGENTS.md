# Repository Guidelines

This guide applies to the entire repository. It explains how the project is organized, how to build and test it, and the conventions to follow when contributing.

## Project Structure & Module Organization

- `src/` — application code
  - `components/` React UI and scene components
  - `ecs/` entity/component/system helpers
  - `robots/` robot generation and helpers
  - `store/` Zustand UI/simulation state
  - Key entries: `main.tsx`, `App.tsx`, `components/Simulation.tsx`
- `tests/` — unit tests (Vitest) and setup (`tests/setup.ts`)
- `playwright/tests/` — end-to-end specs (Playwright)
- `dist/` — production build output (generated)
- Root configs: `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `eslintrc.cjs`, `prettierrc.txt`, `tsconfig.json`, `index.html`

## Build, Test, and Development Commands

- `npm run dev` — start Vite dev server (default port 5173)
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the built app locally
- `npm run lint` — ESLint over `src`
- `npm run format` — Prettier write format for source files
- `npm run test` — run Vitest unit tests (jsdom)
- `npm run test:coverage` — Vitest with coverage report
- `npm run playwright:install` — install Playwright browsers
- `npm run playwright:test` — run Playwright E2E tests (spins up dev server)

- ## Coding Style & Naming Conventions

- Language: TypeScript + React. Indent 2 spaces; single quotes; semicolons; trailing commas (es5); `printWidth: 100` (see `prettierrc.txt`).
- Linting: ESLint (`eslint:recommended`, React, TypeScript) + `eslint-config-prettier`.
- Naming: React components PascalCase (`Scene.tsx`), variables/functions camelCase, types/interfaces PascalCase.
- Files: Components in `src/components`, game logic in `src/ecs`/`src/robots`, state in `src/store`.

 
## Testing Guidelines

- Unit: Vitest + Testing Library (`tests/`). Name tests `*.test.ts`/`*.test.tsx`. Keep pure logic testable; prefer deterministic inputs.
- Setup: `tests/setup.ts` configures jsdom and shims (e.g., `ResizeObserver`).
- Coverage: use `npm run test:coverage` and aim for meaningful coverage on core systems and UI logic.
- E2E: Playwright specs in `playwright/tests` (e.g., `smoke.spec.ts`). Install browsers first, then `npm run playwright:test`.

Notes for agents and physics/ECS

- Rapier RigidBody is authoritative for physical transforms — systems should set/read RigidBody velocity/linvel rather than directly mutating mesh transforms. See `SPEC.md` for more detail on sync rules.
  
  Example (preferred):

  ```ts
  // prefer: set linear velocity on the RigidBody (physics authoritative)
  const body = rigidBodyRef.current
  if (body) {
    // set linear velocity (x, y, z)
    body.setLinvel({ x: 1, y: 0, z: 0 })
  }
  ```

  ```ts
  // avoid: directly mutating mesh.position when using Rapier
  // (this can cause desync and non-physical behavior)
  mesh.position.x += 1 // not recommended when a RigidBody controls transform
  ```

- AI/automation agents: also read `.github/copilot-instructions.md` (new) for a concise agent-focused orientation; keep that file in sync with `AGENTS.md` when you change workflows or entry points.

## Commit & Pull Request Guidelines

- Commits: imperative, concise subject (≤72 chars), optionally with scope (e.g., `ecs:`). Example: `Add robot spawn system and tests`.
- PRs: include a clear description, linked issues, and screenshots/GIFs for UI/visual changes. Note impacts to `SPEC.md` if architecture changes.
- Before submitting: run `npm run format && npm run lint && npm run test` and, when relevant, `npm run playwright:test`.

