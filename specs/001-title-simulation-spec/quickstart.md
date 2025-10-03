# Quickstart — Simulation Feature

This quickstart describes how to run deterministic tests and a dev run for the
Simulation feature.

Prerequisites

- node 18+ (as configured in repository)
- npm install

Dev server

1. npm run dev
2. Open [http://localhost:5173](http://localhost:5173) (or configured port)

Deterministic unit/integration tests

- Unit tests use Vitest. To run once: npm run test

- For deterministic simulation traces, tests should instantiate `FixedStepDriver` with
  a known seed and step length. Example test harness pattern:

  - const driver = new FixedStepDriver({seed: 12345, stepMs: 16.6667});
  - for (let i=0;i<1000;i++) driver.stepOnce();
  - Inspect emitted events and compare against golden traces.

Passing StepContext.simNowMs in tests

- When calling systems that do time-based work (RespawnSystem, BeamSystem), provide the
  driver's simNowMs. Do not rely on Date.now() in tests.

StepContext harness: example

- Create a seeded driver and inject `stepContext` into systems when testing:

  ```ts
  import { createFixedStepDriver } from '../../src/utils/fixedStepDriver';
  const driver = createFixedStepDriver(12345, 1/60);
  // Advance a few steps and call system under test with driver.stepOnce()
  const ctx = driver.stepOnce();
  mySystem(world, ctx);
  ```

Observability & diagnostics

- Use the runtime event log and DiagnosticsOverlay to capture deterministic traces during
  development and when debugging test failures. The overlay exposes fixed-step metrics (steps
  per frame and backlog) and rAF timing metrics when `showFixedStepMetrics` is enabled in UI.
  Use `getRuntimeEventLog()` from `src/ecs/ecsResolve.ts` in tests to assert audit entries.

Playwright E2E

- Install browsers: npm run playwright:install
- Start dev server on port 5174 for Playwright tests (see playwright.config.ts)
- Run: npm run playwright:test

Notes

- Use the `--runInBand` test flag if needing isolated process runs when module-scoped
  counters must be avoided.

- For local debugging, prefer the `test-mode` entrypoint in Simulation that accepts an
  injected `driver` or `simNowMs` override to reproduce scenarios precisely.
