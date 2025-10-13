<!-- Copilot / AI agent instructions for quickly being productive in this repo -->
# RobotSpaceBattler — Agent Instructions

This file tells an AI coding agent how the project is structured, where to find core systems, and which commands and conventions to use.

**REQUIRED READING**: `.specify/memory/constitution.md` 

- Specs & tasks: `.specify` folder contains specs, plans, and task templates for the Spec Kit workflow.

Feature specs location: The repository also stores active feature specifications under a
top-level `specs/` directory. Each feature uses a numbered folder (for example,
`specs/001-title-simulation-spec`) that contains the spec, research, plan, and contract
artifacts. Agents should prefer `specs/` for feature-level artifacts and `.specify/` for
templates and the constitution governing how specs are created.

Example (`specs/001-title-simulation-spec`):
- `spec.md` — the main feature specification and acceptance criteria.
- `plan.md` — implementation plan scaffold derived from the spec (Phase 0/1).
- `research.md` — Phase 0 research notes and decisions.
- `data-model.md` — canonical entities and shapes extracted from the spec.
- `quickstart.md` — how to run deterministic tests and dev flows for this feature.
- `contracts/` — API/behavior contracts (e.g., `scoring-contract.md`,
  `respawn-contract.md`, `observability-contract.md`).

When implementing or modifying features, update both the spec artifacts under
`specs/` and the `.specify/` templates if responsibilities or workflow steps change.

When in doubt
- Follow `.specify/memory/constitution.md` for architectural principles (Component/Library-First, Test-First (TDD), Size & Separation, React & r3f Best Practices, Observability & Performance, Deprecation & Dependency Hygiene).
- Follow `spec.md` for current feature branch in `specs` folder

Feedback
- Ask the repo maintainer or current user if you need runtime secrets, non-public endpoints, or to change project scripts.
