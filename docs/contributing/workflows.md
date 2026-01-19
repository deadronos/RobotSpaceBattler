# Development Workflows

## SpecKit Workflow

Feature development is driven by specifications in the `specs/` directory.

### Directory Structure

- `specs/NNN-feature-name/`
  - `spec.md` – Requirements and acceptance criteria.
  - `plan.md` – Implementation steps.
  - `research.md` – Phase 0 technical notes.
  - `contracts/` – API and behavior definitions.

### Commands

- `/constitution` - Reference `.specify/memory/constitution.md`.
- `/specify` - Generate specs from prompts.
- `/plan`, `/tasks`, `/implement` - Core development loop steps.

## Git & PR Guidelines

- **Commits**: Concise, imperative subjects (e.g., `ecs: add spawn system`).
- **PRs**: Link issues, include screenshots for UI changes, and note spec impacts.
- **Validation**: Run `npm run format && npm run lint && npm run test` before opening.

## Agent Guidance

Agents must prioritize the following resources:

1. **Constitution**: `.specify/memory/constitution.md` (6 core principles).
2. **Current Spec**: The `spec.md` for your active feature task.
3. **Internal Tools**: Use SpecKit prompts in `.github/prompts`.
