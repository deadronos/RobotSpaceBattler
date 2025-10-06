# RobotSpaceBattler Development Guidelines
**Important:** This project follows the constitution defined in `.specify/memory/constitution.md`.

Auto-generated from all feature plans. Last updated: 2025-10-06

## Active Technologies
- TypeScript 5.x (ES2022 target), React 19+ (001-3d-team-vs)

## Project Structure
```
backend/
frontend/
tests/
```

## Commands
npm test [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] npm run lint

## Code Style
TypeScript 5.x (ES2022 target), React 19+: Follow standard conventions

## Agentic AI Usage & Governance
When agents are used to automate development tasks, include a short section describing
what the agent is allowed to do and the human-in-the-loop controls in place. At minimum
record:

- Agent name and version.
- Privileges granted (read-only, can open PRs, can merge with approvals, can deploy).
- Audit/approval workflow (who receives notifications, how to revoke privileges).

Trigger events requiring a constitution review are described in the main constitution
(see `.specify/memory/constitution.md`). Agents that will create/merge PRs or change
infrastructure MUST be explicitly approved by maintainers and documented here.

## Recent Changes
- 001-3d-team-vs: Added TypeScript 5.x (ES2022 target), React 19+

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->