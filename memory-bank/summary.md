# Memory Bank Summary — RobotSpaceBattler

Generated: 2025-09-14

This file summarizes the repository's Memory Bank guidance and the key project entities stored in the agent memory.

## Purpose
The memory bank collects structured project knowledge that persists across agent sessions: architecture notes, active context, tasks, progress history, and other documents that let the agent resume work quickly.

## Core Memory Bank Files (as described in `.github/instructions/memory-bank.instructions.md`)

- `projectbrief.md` — Foundation document that shapes all memory bank files; defines project scope and goals.
- `productContext.md` — Why the project exists, problems it solves, user experience goals.
- `activeContext.md` — Current work focus, recent changes, next steps, active decisions.
- `systemPatterns.md` — Architecture, key technical decisions, design patterns, component relationships.
- `techContext.md` — Technologies used, development setup, constraints, dependencies.
- `progress.md` — What works, what's left, current status, known issues.
- `tasks/` — Folder containing `TASKID-taskname.md` files and `tasks/_index.md` which lists task statuses.

## Project-level memory entity

# Memory Bank Summary — RobotSpaceBattler

Generated: 2025-09-14

This file summarizes the repository's Memory Bank guidance and the key project entities stored in the agent memory.

## Purpose

The memory bank collects and preserves structured project knowledge so the agent can resume work across sessions. It contains architecture notes, active context, tasks, progress history, and other documents.

## Core memory-bank files

Per `.github/instructions/memory-bank.instructions.md`, the core memory-bank files are:

- `projectbrief.md` — Foundation document defining core requirements, goals, and project scope.
- `productContext.md` — Why the project exists, problems it solves, and UX goals.
- `activeContext.md` — Current work focus, recent changes, next steps, and active decisions.
- `systemPatterns.md` — System architecture, design patterns, and component relationships.
- `techContext.md` — Technologies, development setup, constraints, and dependencies.
- `progress.md` — What works, what's left, current status, and known issues.
- `tasks/` — Folder containing `TASKID-taskname.md` task files and `tasks/_index.md` (task index).

## Project-level memory entity: RobotSpaceBattler

Key observations saved to memory:

- Tech: React + TypeScript + Vite + react-three-fiber (Three.js) + @react-three/rapier (physics).
- ECS: miniplex (`src/ecs/miniplexStore.ts`).
- UI state: zustand in `src/store/uiStore.ts` (useUI hook).
- Entry points: `src/main.tsx` → `src/App.tsx` → `src/components/Scene.tsx` → `src/components/Simulation.tsx`.
- Simulation: `src/components/Simulation.tsx` implements the game loop, spawner, AI, movement, weapons systems.
- Physics: Rapier RigidBody is authoritative for transforms (see `src/systems/physicsSync.ts`).
- Robots: procedural generation via `src/robots/RobotFactory.tsx` (glTF planned later).
- Tests & dev: Vitest unit tests in `tests/`, Playwright E2E in `playwright/tests/` (smoke.spec.ts). Dev scripts: `npm run dev`, `npm run build`, `npm run test`, `npm run playwright:test`.
- Ports & tooling: Vite dev default port 5173; Playwright smoke expects dev server on 5174. Lint/format: `npm run lint`, `npm run format`.

## Memory entities created

- `.github/instructions/projectbrief.md`
- `.github/instructions/productContext.md`
- `.github/instructions/activeContext.md`
- `.github/instructions/systemPatterns.md`
- `.github/instructions/techContext.md`
- `.github/instructions/progress.md`
- `.github/instructions/tasks/` (folder)

## Relations stored in memory

- `RobotSpaceBattler` → `has-memory-bank-file` → each `.github/instructions/*.md` file
- `RobotSpaceBattler` → `has-memory-bank-folder` → `.github/instructions/tasks/`

#

## Memory-bank files saved as entities

- `.github/instructions/projectbrief.md` — foundation document (should exist; create if missing).
- `.github/instructions/productContext.md` — product context and UX goals.
- `.github/instructions/activeContext.md` — current focus and next steps.
- `.github/instructions/systemPatterns.md` — architecture and system patterns.
- `.github/instructions/techContext.md` — tech stack and constraints.
- `.github/instructions/progress.md` — progress tracking and known issues.
- `.github/instructions/tasks/` — tasks folder; should contain `tasks/_index.md` and individual `TASKID-taskname.md` files.

## Relations created in memory

- `RobotSpaceBattler` -> `has-memory-bank-file` -> each of the `.github/instructions/*.md` files.
- `RobotSpaceBattler` -> `has-memory-bank-folder` -> `.github/instructions/tasks/`.


