# Performance Contract (As Implemented)

This repository does not currently implement a formal, automated performance acceptance harness.
Instead, it provides:

- Renderer frame stats captured into a global snapshot (`window.__rendererStats`).
- Manual quality toggles (instancing enablement and max instance budgets).
- Optional debug UI panels for performance tuning.

## Available Instrumentation

### Renderer Stats

The renderer frame loop records per-frame draw/memory metrics:

- `window.__rendererStats.drawCalls`
- `window.__rendererStats.triangles`
- `window.__rendererStats.geometries`
- `window.__rendererStats.textures`
- `window.__rendererStats.frameTimeMs`

See `src/visuals/rendererStats.ts`.

### Quality Settings

Quality settings can be read/modified via the global quality manager:

- `window.__qualityManager`

See `src/state/quality/QualityManager.ts`.

## Manual Validation Checklist

1. Start the dev server (`npm run dev`).
2. Run a battle to completion; verify that performance remains interactive.
3. Open Settings and enable Debug UI.
4. Toggle instancing on/off; observe impact on draw calls and visual fidelity.
5. Adjust max instances to observe projectile/effect throttling behavior.

## Not Implemented

These items were mentioned in earlier draft requirements but are not implemented:

- Automatic quality scaling based on FPS thresholds.
- Time dilation / simulation time-scale reduction.
- In-game performance warning overlays.
# Performance Contract

This contract defines the exact test environment, device profiles, measurement method, and acceptance criteria for the performance-related functional requirements in this feature (FR-010, FR-016, FR-017, FR-021, FR-022, FR-023).

Purpose
- Remove ambiguity from performance acceptance tests by specifying the platform, harness, warm-up behavior, sampling frequency, aggregation method, and pass/fail thresholds.

Scope
- Applies to automated CI runs (headless Chromium) and documented manual test profiles for local/dev testing (headed browsers / dev machines).

Test Environment

- CI Harness (authoritative for automated acceptance):
  - Browser: Headless Chromium (matching Playwright's chromium) running in CI with GPU acceleration flags enabled when available.
  - Node: Use the project's Node.js version defined in package.json engines or the CI runner default if not specified.
  - Run command: npx playwright test --project=chromium --headed=false --retries=0
  - Recommended CI flags: --disable-dev-shm-usage, --disable-software-rasterizer, --enable-logging=stderr to collect GPU renderer diagnostics if needed.

- Local / Manual (informational):
  - Browser: Chrome 120+ or Edge 120+ (desktop), Playwright headed Chromium for reproducible runs.
  - Device Profiles: Desktop (1920x1080, high-end GPU), Laptop (1366x768, integrated GPU), Low-end (800x600, CPU throttling to simulate weaker devices). Document which profile is used for each run.

Measurement Method

- Warm-up: Each test must include a 10-second warm-up period where no measurement is recorded. This lets the browser compile shaders, allocate GPU resources, and JIT hot paths.
- Sampling frequency: Collect frame times at each animation frame (using requestAnimationFrame) and record timestamps to compute instantaneous FPS. Sample for a minimum of 30 seconds after warm-up.
- Aggregation: Compute FPS as the rolling average over a 1-second window sampled at the frame rate (i.e., average FPS across all frames whose timestamps fall within the 1-second window). Then compute the median of these 1-second rolling averages across the 30-second measurement window as the primary metric.
- Variance: Also compute the 5th percentile (p5) of the 1-second rolling averages to capture low-end performance.
- Reporting: Test harness must output: median FPS, p5 FPS, total frames, measurement duration, and any dropped frame counts.

Acceptance Criteria

- Baseline (CI authoritative):
  - Median FPS ≥ 60 for the Desktop profile (1920x1080) with shadows enabled and 20 robots present (10 vs 10), unless explicit quality-scaling is active. If median FPS < 60 but quality scaling activates, the test may still pass if the p5 FPS ≥ 30 after scaling and time-scale reduction behavior is validated.
  - The test MUST validate that quality scaling activates automatically when 1-second rolling average FPS drops below 30, and that shadows/particle draw distances are reduced accordingly.
  - If auto-quality-scaling is active, the harness must verify that the in-game warning overlay is displayed.

- Manual / Local (informational thresholds):
  - Laptop profile: median FPS ≥ 45 for 1366x768 with shadows enabled.
  - Low-end profile: median FPS ≥ 30 for 800x600 after CPU throttling.

Test Implementation Notes

- Use Playwright to drive the browser and run the harness. The application should expose a testing API on window (e.g., `window.__perf.startMeasurement()` and `window.__perf.stopMeasurement()`) that the test harness can call to start/stop collection. The harness must ensure the scene is in a deterministic state before measurement (e.g., robots spawned, battle started).
- The harness must capture console logs and GPU renderer info for failure diagnostics.
- Tests should be repeatable: seed the simulation RNG to a fixed value and run the same AI seed across runs to reduce variance.
- If hardware GPU is unavailable in CI, run Playwright with software rendering flags but mark the run as 'non-authoritative' and require a manual verification step.

Example Playwright Snippet

```ts
// Pseudocode: Start measurement after warm-up
await page.goto('http://localhost:5173');
await page.evaluate(() => window.__perf.reset());
// Start battle and wait warm-up
await page.evaluate(() => window.__simulation.start());
await page.waitForTimeout(10000); // warm-up
await page.evaluate(() => window.__perf.startMeasurement());
await page.waitForTimeout(30000); // measurement window
const report = await page.evaluate(() => window.__perf.stopMeasurement());
console.log(report);
```

Maintenance

- Update device profiles and thresholds in this contract if the project's target baseline changes. Any changes to thresholds MUST be recorded in a contract change PR and follow the scoring contract workflow (edit contract, update tests, update constants/code).

Appendix: Metrics Definitions

- Instantaneous FPS: 1 / frameDeltaSeconds for each frame.
- 1-second rolling average: average instantaneous FPS for frames in a 1-second sliding window.
- Median FPS: median of the 1-second rolling averages over the measurement window.
- p5 FPS: 5th percentile of the 1-second rolling averages.
