# RobotSpaceBattler Project Overview

## Project Purpose
A React + Three.js 3D space battle simulator with real-time physics (Rapier), ECS architecture, and dynamic camera modes. MVP feature: 3D team-vs battle graphics with accessibility support.

## Tech Stack
- **Frontend**: React 19, TypeScript 5, React Three Fiber (r3f) 9.3, Three.js 0.180, PostProcessing
- **3D Physics**: Rapier3D 0.19.1 (@react-three/rapier)
- **State Management**: Zustand 5.0.8
- **ECS**: Miniplex 2.0.0
- **Testing**: Vitest 3.2.4, Playwright 1.55.1, Testing Library, @react-three/test-renderer
- **Build**: Vite + React SWC, ESLint, Prettier
- **Asset Processing**: glTF Transform 4.2.1

## Project Structure
```
src/
  components/        # React components (battle UI, scene, overlays, hud)
  ecs/              # ECS: world, systems/, entities/, simulation/
  hooks/            # Custom hooks (camera, battle adapter, UI shortcuts, etc.)
  store/            # Zustand stores (uiStore for UI state + preferences)
  systems/          # Game systems (cameraSystem, physicsSync, uiAdapter, etc.)
  types/            # TypeScript types (ui.ts includes battle view models)
  selectors/        # Derived state selectors (battleSelectors for round/robot views)
  utils/            # Utilities
  styles/           # CSS (hud.css for battle UI styling)

specs/002-3d-simulation-graphics/
  spec.md           # Feature specification & requirements
  plan.md           # Technical architecture & file structure
  data-model.md     # Canonical entities (RoundView, RobotView, CameraState, etc.)
  tasks.md          # Implementation task breakdown & execution order
  contracts/        # API/behavior contracts

tests/
  unit/             # Unit tests (battle-ui, visualDiff, etc.)
  integration/      # Integration tests (battle-selectors, camera-mode, etc.)
  utils/            # Test helpers (r3fHelper for mounting r3f components)

playwright/tests/   # E2E tests (battle-ui, battle-perf, camera-mode, toggle-latency)
playwright/utils/   # Playwright helpers (visualDiff, latency measurement)
```

## Code Style & Conventions
- **Naming**: PascalCase (components, types), camelCase (functions, vars)
- **File naming**: Components: `ComponentName.tsx`, types: lowercase (e.g., `ui.ts`), tests: `*.test.ts(x)`
- **TypeScript**: ES2022 target, strict mode enabled
- **React**: Functional components, hooks, r3f best practices (pure renderers, minimal render-loop hooks)
- **Imports**: Single quotes, semicolons, `simple-import-sort` ESLint plugin
- **Spacing**: 2-space indentation, 100-char printWidth (Prettier)
- **Comments**: Minimal; code should be self-explanatory (see self-explanatory-code-commenting.instructions.md)
- **Testing**: TDD-first approach required; ARIA accessibility testing, SSIM visual diffs (threshold 0.97)

## Key Patterns
- **Constitution-first**: 6 core principles in `.specify/memory/constitution.md` (Component/Library-First, Test-First, Size & Separation, React & r3f Best Practices, Observability, Deprecation Hygiene)
- **Pure systems**: Systems should emit events, not side effects
- **Selectors**: Use battleSelectors for safe, allocation-light UI view models
- **Events**: UI adapter exposes onRoundStart/onRoundEnd/onCameraChange event hooks
- **Accessibility**: ARIA annotations required; reduced-motion support via uiStore preferences

## Commands to Run After Task Completion
```bash
# Formatting & Linting
npm run format                    # Format src/**/*.{ts,tsx,js,json,md}
npm run lint:fix                  # Fix linting errors
npm run lint                      # Check ESLint (no fix)

# Testing
npm run test                      # Run Vitest once
npm run test:watch               # Watch mode
npm run test:coverage            # Coverage report
npm run ci:test                  # CI coverage mode (cross-env CI=true)

# E2E Testing
npm run playwright:install       # Install Playwright browsers
npm run playwright:test          # Run all Playwright tests

# Build & Deploy
npm run dev                       # Start Vite dev server (port 5173)
npm run build                     # Production build
npm run preview                   # Serve production build locally

# Validation
npm run check:source-size        # Check file size constraints
npm run check:pr-constitution    # Validate PR compliance with constitution
```

## Git & Terminal Commands
- **Windows PowerShell**: Default shell
- **Git**: `git status`, `git diff`, `git add`, `git commit -m`, `git push`
- **Directory**: `cd`, `ls` (PowerShell alias for dir), `pwd`
- **File ops**: `cp`, `rm`, `mkdir`
