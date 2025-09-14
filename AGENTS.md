# Repository Guidelines

> A quick, actionable contributor guide for RobotSpaceBattler.

**Important:** Follow the instructions in `.github/instructions/memory-bank.instructions.md` for project context and memory management.
the relevant files are in 'memory-bank' and 'memory-bank/tasks'


## Project Structure & Module Organization
- `src/` – app code
  - `components/` UI and scenes (React)
  - `ecs/` entity/component/system helpers
  - `robots/` robot generation and helpers
  - `store/` Zustand UI/simulation state
  - Entrypoints: `main.tsx`, `App.tsx`, `components/Simulation.tsx`
- `tests/` – Vitest unit tests (`tests/setup.ts` for jsdom/shims)
- `playwright/tests/` – E2E specs
- `dist/` – production build output (generated)
- Root configs: `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `eslintrc.cjs`, `prettierrc.txt`, `tsconfig.json`, `index.html`

## Build, Test, and Development Commands
- `npm run dev` – start Vite dev server (port 5173)
- `npm run build` – build to `dist/`
- `npm run preview` – serve production build
- `npm run lint` – ESLint over `src`
- `npm run format` – Prettier write format
- `npm run test` / `test:watch` / `test:coverage` – Vitest
- `npm run ci:test` – coverage once with `CI=true`
- `npm run playwright:install` then `npm run playwright:test` – E2E (dev server on 5174)

## Coding Style & Naming Conventions
- TypeScript + React. Indent 2 spaces; single quotes; semicolons; trailing commas (es5); `printWidth: 100`.
- Lint: ESLint (TS, React) with `eslint-config-prettier`.
- Naming: Components PascalCase (`RobotPanel.tsx`); functions/vars camelCase; types/interfaces PascalCase.
- Files: UI in `src/components`, game logic in `src/ecs`/`src/robots`, state in `src/store`.

## Testing Guidelines
- Frameworks: Vitest + Testing Library; Playwright for E2E.
- Name unit tests `*.test.ts`/`*.test.tsx` under `tests/`.
- Run coverage: `npm run test:coverage`. Aim for meaningful coverage on core systems and UI logic.

## Commit & Pull Request Guidelines
- Commits: imperative, concise subject (≤72 chars). Example: `ecs: add robot spawn system`.
- PRs: describe changes, link issues, add screenshots/GIFs for UI changes, and note any `SPEC.md` impacts.
- Before opening: `npm run format && npm run lint && npm run test` (and `npm run playwright:test` when relevant).

## Agent-Specific Notes
- Rapier RigidBody is authoritative for transforms. Prefer `RigidBody.setLinvel({ x, y, z })` over mutating mesh positions to avoid desync.
- Also see `.github/copilot-instructions.md` for a concise agent orientation and keep it in sync with this guide.
