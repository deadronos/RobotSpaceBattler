# Non-deterministic API usage sweep report

This short report summarizes remaining `Date.now()` and `Math.random()` usages found in the
repository and classifies them as simulation-critical or not.

Findings (Oct 04, 2025):

- `src/components/environment/hooks.ts`
  - Uses `Math.random()` to generate a visual offset for environment elements.
  - Classification: UI-only (non-simulation-critical).
  - Decision: acceptable; no change required for simulation determinism.

- `src/components/DiagnosticsOverlay.tsx`
  - Uses `Date.now()` to drive diagnostics display timestamps.
  - Classification: UI-only (non-simulation-critical).
  - Decision: acceptable; leave as-is.

- `tests/unit/runtimeEventLogPerf.test.ts`
  - Uses `performance.now()` and falls back to `Date.now()` for measuring serialization
    performance.
  - Classification: test/perf-specific.
  - Decision: acceptable for perf measurement tests.

- `tests/unit/golden.test.ts` (was)
  - Used `Date.now()` to generate file names in tests; this was changed to a deterministic
    name to avoid non-deterministic artifacts in test runs.

Notes

- All simulation-critical systems under `src/systems/*` have been audited and updated to
  require `StepContext` and deterministic `rng`/`idFactory` where appropriate (T016B). No
  `Date.now()` or `Math.random()` calls were found in simulation systems.

- Remaining uses of `Math.random()`/`Date.now()` are confined to UI code and perf tests. If you
  prefer to fully eliminate these as a policy, we can:
  - Replace the `Math.random()` call with a seeded RNG supplied by an optional UI provider.
  - Replace diagnostics timestamps with a pluggable time provider that can be mocked in tests.
  - Make perf tests accept an environment flag to disable strict Date.now-based assertions in
    low-precision environments.

Action taken

- Updated `tests/unit/golden.test.ts` to use a deterministic filename (`golden-test-fixed`) instead
  of `Date.now()`.
- Documented findings and decisions in this report.
