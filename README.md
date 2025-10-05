# Space Station Auto-Battler (Prototype)

This repository is a starter/skeleton for a 3D team-vs-team auto-battler:

- 10 vs 10 humanoid robots (red vs blue)
- Procedurally-generated robot meshes (replaceable with glTF later via gltfjsx)
- Rapier physics via @react-three/rapier
- React + TypeScript + react-three-fiber
- miniplex ECS, zustand for UI/game state
- Vite, Vitest, Playwright, ESLint, Prettier


What this skeleton includes:

- Basic scene with directional + ambient light and shadows
- Physics playground and robot spawner (10 red / 10 blue)
- Simple steer-to-target AI, per-frame updates
- Basic ECS pattern with miniplex
- Test scaffolding (Vitest + Playwright)

## Spec Kit (AI-assisted spec & implementation)

This repository is compatible with the GitHub Spec Kit workflow. For a quick introduction and
to get started see the Spec Kit get-started guide:

[Spec Kit: Get started](https://github.com/github/spec-kit?tab=readme-ov-file#-get-started)

Available Slash Commands

| Command | Description |
|---|---|
| /constitution | Create or update project governing principles and development guidelines |
| /specify | Define what you want to build (requirements and user stories) |
| /clarify | Clarify underspecified areas (run before /plan unless explicitly skipped) |
| /plan | Create technical implementation plans with your chosen tech stack |
| /tasks | Generate actionable task lists for implementation |
| /analyze | Cross-artifact consistency & coverage analysis (run after /tasks) |
| /implement | Execute tasks to build the feature according to the plan |

Bootstrap workflow (quick start)

STEP 1: Establish project principles

Run your AI agent from the project root. You will know things are configured correctly if the
`/constitution`, `/specify`, `/plan`, `/tasks`, and `/implement` commands are available.

Start by creating the project's governing principles with `/constitution`. This helps ensure
consistent decisions during planning and implementation. Example guidance to include:

- Code quality and testing standards
- Expected performance and UX constraints
- Rules for architecture choices and rollbacks

The `/constitution` command writes or updates `.specify/memory/constitution.md`, which the agent
references throughout the Spec Kit workflow.

STEP 2: Create project specifications

Use `/specify` to author concrete functional requirements and user stories. Be explicit about
the problem, acceptance criteria, and any constraints; avoid committing to a tech stack at this
stage.

STEP 3: Clarify requirements

Run `/clarify` to resolve ambiguous or underspecified points before planning. This reduces
rework and improves downstream estimates.

STEP 4: Generate a plan

Use `/plan` to create a technical plan that maps requirements to tasks, tests, and deliverables.

STEP 5: Validate the plan

Ask the agent to audit the plan for coverage, testability, and alignment with the
`.specify/memory/constitution.md` principles.

STEP 6: Implementation

When the plan is validated, run `/implement` to execute tasks. The agent will follow the plan
and provide progress updates and artifacts under `.specify/`.

For a guided walkthrough of the full Spec Kit workflow, follow the link above.

## Pull Request Templates & Contributing guidance

To keep changes aligned with the project's constitution and review expectations, we maintain
multiple PR templates under `.github/PULL_REQUEST_TEMPLATE/`. When opening a PR, pick the
template that best matches the change:

- `feature.md` — new features, user-visible changes, and behavior additions.
- `bugfix.md` — fixes for defects and regressions.
- `chore.md` — maintenance, dependency updates, infrastructure, and cleanup work.

Each template contains a required `CONSTITUTION-CHECK` section. Complete this section with
concrete evidence of compliance (file paths, LOC decomposition plan if any file exceeds
300 LOC, TDD/test evidence, r3f/rendering notes, and any agentic-AI approvals). The CI
workflow will validate that a `CONSTITUTION-CHECK` section is present and will post an
auto-generated draft comment listing changed files and suggested decomposition steps.

If the auto-generated draft appears as a comment on your PR, copy or refine its contents
into the PR body `CONSTITUTION-CHECK` section and edit details to describe your plan and
TDD evidence. The CI will fail if the `CONSTITUTION-CHECK` section is missing.

For maintainers: consider adding a short note in PR reviews when the `CONSTITUTION-CHECK`
section is incomplete or requires follow-up (e.g., create a follow-up task for file
refactoring or a deprecation plan).

