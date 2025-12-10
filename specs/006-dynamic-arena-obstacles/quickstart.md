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
```

Start the development server and play-test a sample scene (dev server runs on :5173):

```bash
npm run dev
# then open http://localhost:5173 and load sample scene 'Dynamic Arena Sample' from developer UI
```

Add a new debug fixture for rapid iteration: create `specs/fixtures/dynamic-arena-sample.json`, then start the dev server and load the fixture in the scene inspector or debug component.
