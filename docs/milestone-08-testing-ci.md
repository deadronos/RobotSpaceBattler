# Milestone 08 — Testing & CI Improvements

1. Goal
   - Strengthen automated testing and CI to catch regressions early for AI, weapons, and physics changes.

2. Deliverables
   - Additional Vitest unit tests for deterministic systems
   - Playwright smoke test updates for demo boot
   - CI job matrix including tests and build checks

3. Tasks
   - Identify gaps in tests and add deterministic simulation tests.
   - Ensure Playwright smoke uses the correct port and selectors.
   - Update `.github/workflows/` to include new checks (if present).

4. Timeline
   - 1-2 sprints to expand tests and update CI config.

5. Risks
   - Flaky tests due to non-deterministic physics or timing in headless browsers.

6. Acceptance Criteria
   - Tests pass locally and within CI on PRs.
   - Reduced number of regressions landing on main/dev.
