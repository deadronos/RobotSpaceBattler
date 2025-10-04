# Repository Guidelines

> A quick, actionable contributor guide for RobotSpaceBattler.

**Important:** This project follows the constitution defined in `.specify/memory/constitution.md`. All contributors
and AI agents MUST adhere to the 6 core principles (Physics-First Authority, Deterministic Simulation,
Test-Driven Development, Small Composable Systems, ECS-Driven Architecture, On-Demand Rendering).

## Instructions/Prompts are in:  `.github/prompts`

possible prompts for SpecKit workflow:
/constitution `.github/prompts/constitution.prompt.md`
/specify `.github/prompts/specify.prompt.md`
/clarify `.github/prompts/clarify.prompt.md`
/plan `.github/prompts/plan.prompt.md`
/tasks `.github/prompts/tasks.prompt.md`
/analyze `.github/prompts/analyze.prompt.md`
/implement `.github/prompts/implement.prompt.md`

Project documentation and workflow artifacts are managed in `specs/` (numbered folders with specs, plans, tasks, templates).


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
- Root configs: `vite.config.ts`, `vitest.config.ts`,
  `playwright.config.ts`, `eslintrc.cjs`, `prettierrc.txt`, `tsconfig.json`,
  `index.html`

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

- TypeScript + React. Indent 2 spaces; single quotes; semicolons; trailing commas (es5);
  `printWidth: 100`.
- Lint: ESLint (TS, React) with `eslint-config-prettier`.
- Naming: Components PascalCase (`RobotPanel.tsx`); functions/vars camelCase; types/interfaces
  PascalCase.
- Files: UI in `src/components`, game logic in `src/ecs`/`src/robots`, state in `src/store`.

## Testing Guidelines

- Frameworks: Vitest + Testing Library; Playwright for E2E.
- Name unit tests `*.test.ts`/`*.test.tsx` under `tests/`.
- Run coverage: `npm run test:coverage`. Aim for meaningful coverage on core systems and
  UI logic.

## Commit & Pull Request Guidelines

- Commits: imperative, concise subject (≤72 chars). Example: `ecs: add robot spawn system`.
- PRs: describe changes, link issues, add screenshots/GIFs for UI changes, and note any
  `SPEC.md` impacts.
- Before opening: `npm run format && npm run lint && npm run test` (and
  `npm run playwright:test` when relevant).

## Agent-Specific Notes

- **Constitution compliance required**: See `.specify/memory/constitution.md` for the
  6 core architectural principles.
- Rapier RigidBody is authoritative for transforms. Prefer
  `RigidBody.setLinvel({ x, y, z })` over mutating mesh positions to avoid desync.
- Use deterministic fixed-step loop (`useFixedStepLoop`) with seeded RNG for all
  simulation logic.
- Keep systems small (<300 lines), export pure testable functions, emit events rather
  than side effects.
- Also see `.github/copilot-instructions.md` for a concise agent orientation and keep it
  in sync with this guide.

- Feature specs: active feature artifacts live under the top-level `specs/` folder and
  are organized by numbered feature directories (for example `specs/001-title-simulation-spec`).

- For that feature the files are:
  - `specs/001-title-simulation-spec/spec.md` — main feature specification and
    acceptance criteria.
  - `specs/001-title-simulation-spec/plan.md` — phased implementation plan (Phase 0/1).
  - `specs/001-title-simulation-spec/research.md` — research findings and decisions.
  - `specs/001-title-simulation-spec/data-model.md` — canonical entity shapes and rules.
  - `specs/001-title-simulation-spec/quickstart.md` — how-to run tests and dev flows for
    the feature.
  - `specs/001-title-simulation-spec/contracts/` — behavioral contracts for systems like
    scoring, respawn, and observability.

- Agents MUST consult `.specify/memory/constitution.md` and the `specs/` folder when
  planning or implementing changes to ensure conformity with project governance.
