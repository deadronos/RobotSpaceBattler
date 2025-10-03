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

Replaying and producing golden traces

- You can produce a simple replay trace (JSON) from a deterministic driver run and
  compare it against an expected golden trace to detect regressions. Example flow:

  ```ts
  import { createFixedStepDriver } from '../../src/utils/fixedStepDriver';
  import { createRuntimeEventLog } from '../../src/utils/runtimeEventLog';

  const driver = createFixedStepDriver(12345, 1/60);
  const eventLog = createRuntimeEventLog({ capacity: 10000 });

  // Example runner: advance driver N steps and capture events into a replay array
  const replay: Array<{ frame: number; events: any[] }> = [];
  for (let i = 0; i < 500; i++) {
    const ctx = driver.stepOnce();
    // Call systems under test that append into eventLog
    // e.g. scoringSystem(world, { stepContext: ctx, runtimeEventLog: eventLog, ... })
    // For demo: read any new audit entries and append to the replay payload
    const recent = eventLog.read({ order: 'newest-first' }).slice(0, 20);
    replay.push({ frame: ctx.frameCount, events: recent });
  }

  // Persist the replay as JSON for golden comparisons
  // Node environment example (runs in tests or small script):
  // import { writeFileSync } from 'fs';
  // writeFileSync('replay-12345.json', JSON.stringify(replay, null, 2));
  ```

Guidance for golden trace comparisons

- Keep golden traces under `tests/golden/` named by seed and scenario (for example
  `tests/golden/seed-12345-basic-combat.json`).
- Golden traces should be specific to the test scenario: event order, classification,
  and critical numeric fields (ids, timestamps, score deltas). Avoid encoding transient
  fields like runtime object refs or non-deterministic render keys.
- To assert equality in tests, compare only the subset of fields necessary to prove
  correctness (for example: event type, frameCount, simNowMs, victimId, killerId,
  classification, scoreDelta). This reduces brittleness while preserving determinism checks.
- Update golden traces intentionally via a documented workflow and a commit that includes
  the new golden file plus a short rationale. Prefer small scenario-specific golden files
  rather than one massive trace file.

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
