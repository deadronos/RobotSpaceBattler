# Quickstart: 3D simulation fight graphics (developer guide)

This quickstart explains how to run the feature locally, execute unit and E2E
tests, and run the QA perf harness used by CI.

Prerequisites:

- Node.js 18+ (matching repository toolchain)  
- `npm install` to populate dependencies.  
- Playwright browsers (`npm run playwright:install`) for E2E and visual checks.

Run the app locally:

1. Start dev server: `npm run dev` (Vite will serve the app on http://localhost:5173).  
2. Open the app and navigate to a scene that can start a round (see `Arena`/`Simulation`).

Run unit tests (TDD workflow):

1. Author a failing unit test in `tests/unit/` or `src/components/battle/*.test.tsx`.  
2. Run `npm run test:watch` to iterate fast.  

Run Playwright E2E tests (accessibility + visual diffs):

1. Ensure Playwright browsers are installed: `npm run playwright:install`.  
2. Run subset: `npx playwright test playwright/tests/battle-ui.spec.ts`  
3. For visual-diff runs, CI will compare screenshots using SSIM (threshold: >= 0.97).

Run perf harness locally:

1. Use the Playwright perf fixture: `npx playwright test --project=chromium playwright/tests/perf.spec.ts` (example harness provided under `playwright/fixtures`).  
2. The perf fixture returns frame-time distributions; use those to tune the performance manager.  

CI notes:

- CI should not gate on raw 60 fps on a generic runner. Instead:  
  - CI validates that the performance manager adapts to keep the frame-rate >= 30 fps when stressed.  
  - CI runs the visual-diff stage with SSIM tolerances and emits artifact bundles (video + failing frames + ARIA snapshots) for triage.  

Where to start (developer recommendation):

1. Add failing tests for round start/end UI visibility (`tests/unit/battle-ui.test.tsx`)  
2. Add Playwright accessibility snapshot test for a representative round.  
3. Implement minimal `BattleUI` component that reads from `battleSelectors` and satisfies fast unit tests.  
