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
