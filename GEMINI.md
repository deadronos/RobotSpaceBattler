# RobotSpaceBattler Development Guidelines

**Important:** This project follows the constitution defined in `.specify/memory/constitution.md`.

## 📖 Guidance for Agents & Contributors
For detailed guidance on project structure, workflows, and AI agent instructions, please refer to:
- [**AI Agent Instructions**](.github/copilot-instructions.md): Core orientation for AI tools and agents.
- [**Repository Guidelines**](AGENTS.md): Actionable contributor guide and project module organization.

---

Auto-generated from system analysis. Last updated: 2025-12-29

## Active Technologies
- **Core:** TypeScript 5.9+, React 19+, Vite 7+
- **3D/Physics:** Three.js, React Three Fiber, Rapier3D (@react-three/rapier)
- **Architecture:** Miniplex (ECS), Zustand (State Management)
- **Testing:** Vitest, Playwright

## Project Structure
The project is a single-page application (SPA) structured as follows:

```
src/
├── components/   # React components
├── ecs/          # Entity Component System definitions
├── lib/          # Utilities and helpers
├── runtime/      # Game runtime loop and initialization
├── simulation/   # Core game logic (AI, Pathfinding, Physics)
├── state/        # Global state (Zustand stores)
├── ui/           # User Interface components (HUD, Menus)
└── visuals/      # 3D rendering components
tests/            # Unit and Integration tests (Vitest)
playwright/       # End-to-End tests
specs/            # Feature specifications and plans
```

## Commands
- **Start Dev Server:** `npm run dev`
- **Build:** `npm run build`
- **Lint:** `npm run lint`
- **Format:** `npm run format`
- **Unit Tests:** `npm run test` (or `npm run test:watch`)
- **Coverage:** `npm run test:coverage`
- **E2E Tests:** `npm run playwright:test`
- **Constitution Check:** `npm run check:pr-constitution`

## Code Style
- **Strict TypeScript:** No `any`, strict null checks.
- **React:** Functional components, Hooks.
- **Formatting:** Prettier is enforced.
- **Linting:** ESLint with strict rules (including imports and unused vars).

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

## Recent Features (Specs)
- **001-3d-team-vs:** Core 3D team versus mode.
- **002-3d-simulation-graphics:** Enhanced simulation graphics.
- **003-extend-placeholder-create:** Placeholder creation extensions.
- **004-ai-roaming-wall-awareness:** AI improvements for obstacle avoidance.
- **005-weapon-diversity:** New weapon types and mechanics.
- **006-dynamic-arena-obstacles:** Dynamic elements in the battle arena.
- **007-specify-scripts-bash:** Scripting improvements.

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->