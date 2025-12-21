# Repository Guidelines

> A quick, actionable contributor guide for RobotSpaceBattler.

**Important:** This project follows the constitution defined in `.specify/memory/constitution.md`.

Do not create explainer documents or other documentation unless specifically asked to.

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
  - Entrypoints: `main.tsx`, `App.tsx`
  - `simulation/ai/pathfinding/` – NavMesh pathfinding system (see Pathfinding Architecture below)
  - `simulation/ai/coordination/` – Behavior blending system for concurrent AI execution
  - `simulation/ai/pathing/` – Legacy reactive steering (being phased out)

- `tests/` – Vitest unit tests (`tests/setup.ts` for jsdom/shims)
- `playwright/tests/` – E2E specs
- `dist/` – production build output (generated)
- Root configs: `vite.config.ts`, `vitest.config.ts`,
  `playwright.config.ts`, `eslintrc.cjs`, `prettierrc.txt`, `tsconfig.json`,
  `index.html`

## Pathfinding Architecture

The NavMesh pathfinding system provides obstacle-aware navigation for robots. It consists of:

### Core Components

**NavMesh Generation** (`src/simulation/ai/pathfinding/navmesh/`)

- `NavMeshGenerator.ts` - Converts arena geometry to walkable polygons
- Handles walls, pillars, and dynamic obstacles
- Configurable clearance radius for robot size

**Path Search** (`src/simulation/ai/pathfinding/search/`)

- `AStarSearch.ts` - A* algorithm for optimal path finding
- `PathCache.ts` - LRU cache for frequently requested paths (60s TTL)
- Polygon-based graph search with heuristic distance estimation

**Path Smoothing** (`src/simulation/ai/pathfinding/smoothing/`)

- `StringPuller.ts` - Funnel algorithm for path straightening
- `PathOptimizer.ts` - Removes redundant waypoints, simplifies paths
- Reduces waypoint count by ~40% while maintaining obstacle avoidance

**Integration** (`src/simulation/ai/pathfinding/integration/`)

- `PathfindingSystem.ts` - ECS system managing path calculations
- `NavMeshResource.ts` - Shared NavMesh instance with performance metrics
- `PathComponent.ts` - Per-robot path state (waypoints, status, timestamps)

**Coordination** (`src/simulation/ai/coordination/`)

- `BehaviorBlender.ts` - Blends pathfinding with combat/retreat behaviors
- Priority-based weighted blending: retreat > combat > pathfinding > idle
- Enables concurrent AI execution without hard state switching

### Performance Characteristics

- **Path Calculation**: <5ms P95 for individual robots
- **System Execution**: <16ms for 20 robots simultaneously (60fps budget)
- **Memory Usage**: <5MB sustained for full arena NavMesh + cache
- **Cache Hit Rate**: >70% in typical gameplay scenarios

### Debug Visualization

- `src/visuals/debug/NavMeshDebugger.tsx` - NavMesh polygon wireframe overlay
- `src/visuals/debug/PathDebugger.tsx` - Active robot paths with waypoint markers
- Enable with `visible` prop on debug components

### Test Coverage

55 tests covering all pathfinding components:

- NavMesh generation (walls, pillars, clearance)
- A* search (optimal paths, obstacle avoidance)
- Path smoothing and optimization
- Caching and performance
- Edge cases (unreachable targets, narrow passages)
- Integration and behavior blending

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

## Testing Guidelines

- Frameworks: Vitest + Testing Library; Playwright for E2E.
- Name unit tests `*.test.ts`/`*.test.tsx` under `tests/`.
- Run coverage: `npm run test:coverage`. Aim for meaningful coverage on core systems and
  UI logic.

## Commit & Pull Request Guidelines

- Commits: imperative, concise subject (≤72 chars). Example: `ecs: add robot spawn system`.
- PRs: describe changes, link issues, add screenshots/GIFs for UI changes, and note any
  spec impacts.
- Before opening: `npm run format && npm run lint && npm run test` (and
  `npm run playwright:test` when relevant).

## Agent-Specific Notes

- **Constitution compliance required**: See `.specify/memory/constitution.md` for the
  6 core architectural principles.
- Keep systems small (<300 lines), export pure testable functions, emit events rather
  than side effects.
- Also see `.github/copilot-instructions.md` for a concise agent orientation and keep it
  in sync with this guide.

- Feature specs: active feature artifacts live under the top-level `specs/` folder and
  are organized by numbered feature directories (for example `specs/001-title-simulation-spec`).

- For that feature the files are:
  -- update this as needed

- Agents MUST consult `.specify/memory/constitution.md` and the `specs/` folder when
  planning or implementing changes to ensure conformity with project governance.

- **ES modules policy for agents:** When creating or modifying Node-invoked scripts, use ESM syntax
  (`import` / `export`) and avoid `require()` / `module.exports` in `.js` files. If CommonJS is
  required, name the file with a `.cjs` extension. Agents must follow this rule for any automated
  edits to scripts or CI configuration.
