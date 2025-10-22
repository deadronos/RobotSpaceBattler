# Contributing

Thank you for helping improve this project. The notes below are intended to make
local development and collaboration straightforward across platforms.

## Local checks

Run these commands locally before opening a pull request:

```powershell
npm ci
npm run format
npm run lint
npm run test
```

## Cross-platform notes

- On Windows, Git Bash or WSL often provide the most compatible environment for
  development tooling. If you use PowerShell or CMD, ensure `node` is on PATH.

## Continuous integration

Pull requests run formatting, linting, and tests via GitHub Actions. If your change
affects gameplay, physics, or core systems, add or update unit tests under `tests/`.

Please choose the appropriate PR template (feature / bugfix / chore) and complete the
required `CONSTITUTION-CHECK` section in your PR; CI will validate the presence of this
section and may post an auto-generated draft to help you fill it in.

## Spec Kit onboarding

This repository uses the GitHub Spec Kit workflow. Authoritative specifications and
process artifacts live under the `.specify/` directory.

Start here:

[Spec Kit: Get started](https://github.com/github/spec-kit?tab=readme-ov-file#-get-started)

### Key slash commands

| Command | Purpose |
|---|---|
| /constitution | Establish project principles used by the agent and humans |
| /specify | Author the functional specification and acceptance criteria |
| /clarify | Resolve underspecified requirements before planning |
| /plan | Produce a technical implementation plan and task breakdown |
| /tasks | Emit actionable tasks for developers and the AI agent |
| /implement | Execute tasks to produce code, tests, and docs |

### Suggested bootstrap steps

1. Run `/constitution` to create `.specify/memory/constitution.md` describing the
   project's principles (testing, determinism, physics-first authority, etc.).
2. Run `/specify` to author the functional specification under `.specify/specs/`.
3. Run `/clarify` to remove ambiguous requirements.
4. Run `/plan` to produce an implementation plan and task list.
5. Run `/tasks` and review the task breakdown.
6. Run `/implement` to apply the tasks; then run tests and validate.

If preferred, reference the `README.md` Spec Kit section for more details.

## ES Modules (Node scripts)

This repository uses ES modules by default (see `package.json` -> `type: "module"`).

- All `.js` files that are executed by Node (including CI scripts) must use ESM syntax (`import` / `export`).
- Do not use `require()` or `module.exports` in `.js` files. If a file must remain CommonJS, name it with a `.cjs` extension.

Quick examples:

- Bad (CommonJS in `.js`):

```js
const fs = require('fs').promises;
```

- Good (ESM):

```js
import { promises as fs } from 'fs';
```

For CI and automation scripts:

- Ensure any Node-invoked script uses ESM or is explicitly `.cjs`.
- When adding or changing CI scripts, run workflows locally when possible and
  confirm they run on Node 20 in CI.

Automated tools (bots/agents) that modify repository scripts must follow this
policy. See `AGENTS.md` for agent-specific responsibilities.
