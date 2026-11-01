# RobotSpaceBattler – agent guide

3D team-vs-team auto-battler: React 19, TypeScript (strict), react-three-fiber,
Miniplex ECS, Zustand, Rapier (static-geometry raycasts only), Vite, Vitest, Playwright.

## Commands

- `npm run dev` – Vite dev server (`http://localhost:5173/RobotSpaceBattler/`)
- `npm run lint` – oxlint (warnings fail) plus the 300-line source-size check
- `npm run format` / `npm run format:check` – oxfmt
- `npm run typecheck` · `npm test` · `npm run build`
- `npm run playwright:preview` – e2e smoke against a production build
- Before a PR: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run build`

## Hard rules

- Source and test files stay at or below 300 lines (CI-enforced). Split by responsibility.
- The ECS owns simulation state. Rendering only projects it.
- The simulation is deterministic per seed: no `Math.random()` or `Date.now()` in sim code.
- ESM only, no `any`, and tests with every behaviour change.
- Keep docs in lockstep with code. When behaviour changes, update the matching docs/agents
  file, plan or architecture note in the same PR. If code and docs disagree, don't
  silently pick one: tell the user and ask whether to fix the code or the docs.

## Read when relevant

- [Rules and conventions](docs/agents/rules.md)
- [Architecture and code map](docs/agents/architecture.md)
- [Tooling](docs/agents/tooling.md)
- [Testing and benchmarks](docs/agents/testing.md)
- [Workflow: issue → plan → implement](docs/agents/workflow.md)
- [Git, commits and PRs](docs/agents/git-and-prs.md)
- [Gotchas](docs/agents/gotchas.md)

Current priorities: [scratch.md](scratch.md). Other docs: [docs/README.md](docs/README.md).
`docs/archive/` is history (old specs, plans, reviews), not instructions.
