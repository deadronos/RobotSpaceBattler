# Quickstart — Dynamic Arena Obstacles (Phase 1)

Created: 2025-12-10

This file documents how to run unit and integration tests for the Dynamic Arena Obstacles feature during development.

Run unit tests for obstacles only:

```bash
# Run all tests matching the obstacles path
npm run test -- tests/simulation/obstacles
```

Run integration tests (headless/CI mode):

```bash
# Use CI harness to run integration tests for obstacles
CI=true npm run ci:test -- --grep obstacles

# AI/pathfinding obstacle integrations
npm run test -- tests/integration/ai-reroute.spec.ts tests/integration/ai-deadlock.spec.ts
```

Start the development server and play-test a sample scene (dev server runs on :5173):

```bash
npm run dev
# then open http://localhost:5173
# The sample obstacle fixture loads automatically; use the Obstacle Editor panel to tweak movement/schedules.
```

Debug tooling (dev server):

- `Obstacle Editor` lets you select/edit obstacles (movement speed, hazard schedule, durability).
- `Obstacle Spawner` quickly adds new obstacles for ad-hoc tests.
- `Performance / Debug` panel toggles instancing and obstacle visuals (`Show obstacle visuals`), plus per-category instancing limits.

Stress/perf check:

```bash
npm run test -- tests/stress/obstacles.stress.spec.ts
```

Playwright E2E (requires `npm run playwright:install` once):

```bash
npm run playwright:test -- playwright/tests/obstacle-editor.spec.ts
```

Add a new debug fixture for rapid iteration: edit `specs/006-dynamic-arena-obstacles/dynamic-arena-sample.json`, start the dev server, and reload. The Obstacle Editor shows current fixtures; use the `Copy JSON` / `Apply JSON` controls to iterate.
