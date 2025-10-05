# Changelog

## 2025-09-22 — Fix: first-render visuals (ECS ↔ React subscription race)

- Fix: Ensure the ECS world is pre-populated before React mounts. Calling the
  spawn/reset helper prior to creating the React root prevents a race where
  entities exist in the ECS but React subscriptions miss them during initial
  mount. This resolves the issue where the environment rendered but robots and
  FX were not visible on first load.

- Fix: Make `useEcsQuery` reliably notify the React subscription with an
  initial snapshot when a component subscribes. The hook now establishes its
  query connection and calls the subscription callback immediately so
  components receive the current entity list on mount.

  Verification: Unit tests and headless rendering checks were run. The full
  test-suite passed and headless screenshots show robots mounting on first load.

## 2025-10-05 — Chore: upgrade React and react-three packages

- Upgraded `react` and `react-dom` to `19.2.0`.
- Upgraded `@react-three/fiber` to `^9.3.0` and pinned `@react-three/drei` to `10.7.6`.
- Updated `@react-three/test-renderer` to `^9.1.0` and switched unit tests to import `act` from `react-dom/test-utils`.

  Notes: After pinning the packages, `npm install` completed (with a few
  ESLint peer-dependency warnings). Targeted unit tests that were modified pass.
  Please run the full test-suite and CI to validate across all environments and
  platforms.
