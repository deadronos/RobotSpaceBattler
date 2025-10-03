<!-- Copilot / AI agent instructions for quickly being productive in this repo -->
# RobotSpaceBattler — Agent Instructions

This file tells an AI coding agent how the project is structured, where to find core systems, and which commands and conventions to use.

**REQUIRED READING**: `.specify/memory/constitution.md` — Contains 6 core architectural principles that ALL code changes must follow:
1. Physics-First Authority (NON-NEGOTIABLE) — Rapier RigidBody is authoritative
2. Deterministic Simulation — Fixed-step loop with seeded RNG
3. Test-Driven Development (NON-NEGOTIABLE) — Unit tests + E2E validation
4. Small, Composable Systems — <300 lines, export pure functions
5. ECS-Driven Architecture — miniplex authoritative data model
6. On-Demand Rendering — frameloop="demand" with explicit invalidate()

Quick orientation
- Tech: React + TypeScript + Vite + react-three-fiber (three.js) + @react-three/rapier (physics).
- ECS: miniplex (see `src/ecs/miniplexStore.ts` and `SPEC.md`). UI state is in `src/store/uiStore.ts` (zustand).
- Entry points: `src/main.tsx` -> `src/App.tsx` -> `src/components/Scene.tsx` -> `src/components/Simulation.tsx`.

What to know first (big picture)
- Renderer: `src/components/Scene.tsx` creates the Three.js `Canvas` and wraps `Simulation` with `Physics`.
- Simulation: `src/components/Simulation.tsx` contains the game simulation, robot spawner and per-frame systems (AI, movement, weapons). Inspect this for game-loop and ECS usage.
- ECS & physics: miniplex stores component bags; Rapier `RigidBody` is authoritative for physics updates. See `SPEC.md` (root) for the intended authority model and systems list.

Developer workflows (explicit commands)
- Install dependencies: `npm install`.
- Dev server: `npm run dev` (Vite, default port set in `vite.config.ts` => 5173).
- Build: `npm run build`.
-- Unit tests: `npm run test` (Vitest, runs once). Use `npm run test:watch` for interactive watch mode.
- Playwright E2E: install browsers `npm run playwright:install`, run `npm run playwright:test` (or `npx playwright test`). Playwright tests expect the dev server on port 5174 (see `playwright/tests/smoke.spec.ts`).
- Lint / format: `npm run lint`, `npm run format`.

Project-specific conventions & patterns
- One-file entry systems: high-level systems live under `src/components/Simulation.tsx` and call out to smaller modules/components. Look for small, focused files rather than a deep directory tree.
- Physics-first transforms: Rapier RigidBody should be treated as the source of truth for positions when physics are in use. Avoid directly mutating mesh transforms in systems that also use Rapier.
- ECS usage: `miniplex` is used as a lightweight store for entity/component data. Components are plain objects; systems iterate over entity ids. See `SPEC.md` for expected component shapes (Transform, Team, Health, Weapon, etc.).
- UI state: `zustand` store in `src/store/uiStore.ts` holds small UI flags (paused). Use `useUI()` to read/update flags.

Files to inspect for common tasks
- Start here: `src/components/Simulation.tsx` (main simulation loop and spawner).
- Renderer/scene: `src/components/Scene.tsx`.
- Small state: `src/store/uiStore.ts`.
- ECS bootstrap: `src/ecs/miniplexStore.ts`.
- Tests: `tests/Simulation.test.tsx` (unit), `playwright/tests/smoke.spec.ts` (e2e).
- Design docs: `SPEC.md` contains architecture, systems and pitfalls — treat it as authoritative for system boundaries.
- Constitution: `.specify/memory/constitution.md` defines the 6 non-negotiable architectural principles.
- Specs & tasks: `.specify/` folder contains specs, plans, and task templates for the Spec Kit workflow.

Editing & testing notes for agents
- Hot-reload friendly: modify components and use `npm run dev` to see changes in the browser at http://localhost:5173.
- Playwright smoke test assumes the dev server runs on port 5174. When adding tests, prefer selectors already used (`#status`, `canvas`).
- When changing physics or ECS code, run unit tests and the Playwright smoke to catch regressions quickly.

Examples
- Toggle pause UI uses `src/store/uiStore.ts` (button in `src/App.tsx`). Small changes to UI flags should use `useUI()`.
- Scene composition: lights and Physics wrapper live in `src/components/Scene.tsx`. Add global scene-level effects here.

Limitations / things not discoverable automatically
- Procedural robots are used as placeholders; glTF replacement is expected later (note in README / SPEC.md).
- Deterministic AI mode / fixed RNG is mentioned in `SPEC.md` but there is no global RNG utility yet — if you add deterministic tests, create a seeded RNG helper and reference it in systems.

If you change major systems
- Update `SPEC.md` if you alter system responsibilities (physics authority, AI tick rates, projectile model). Tests may need updates.
- Update `.specify/` documentation (specs, plans, tasks) if architectural patterns or system responsibilities change.
- Ensure changes comply with constitution principles in `.specify/memory/constitution.md`.

When in doubt
- Follow `.specify/memory/constitution.md` for architectural principles (Physics-First, Deterministic, Test-Driven, etc.).
- Follow `SPEC.md` for system intent and implementation details.
- Prefer making minimal, reversible changes and add small focused tests (Vitest) and a Playwright smoke check when behavior affects rendering/boot flow.

Feedback
- Ask the repo maintainer (via PR comment) if you need runtime secrets, non-public endpoints, or to change project scripts.
