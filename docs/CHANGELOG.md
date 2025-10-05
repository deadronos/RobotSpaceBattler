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
