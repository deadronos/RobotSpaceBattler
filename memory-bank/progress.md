# Progress

**Created:** 2025-10-17

What works

- 10v10 match loop implemented via `BattleRunner` (match spawn, running, victory, auto-restart).
- AI behaviors implemented (`seek`/`engage`/`retreat`) with sensors, target selection, and roaming.
- Projectile-based weapon simulation (laser/gun/rocket) including rocket AoE + RPS multipliers.
- Dynamic arena obstacles (barriers/hazards/destructibles) including fixture-driven spawning.
- Instanced visuals and performance toggles (`QualityManager`, `window.__rendererStats`).
- Telemetry capture and aggregation via `TelemetryPort` + Zustand store.
- Unit tests across core systems exist under `tests/`.

What's left / known issues

- Determinism across page reloads is not guaranteed due to `TEAM_CONFIGS` spawn jitter
  (`Math.random()` at module init). Tests should continue to pass with explicit seeds.
- Performance tuning for WebGL / VFX on lower-end devices (instancing budgets help, but needs
  profiling-driven adjustment).
- Documentation upkeep: keep `specs/` and `memory-bank/` aligned to what is implemented.
- LOC refactor progress: Obstacle Spawner and Inspector refactors completed and documented.
- Remaining file above threshold: `src/simulation/ai/pathfinding/integration/PathfindingSystem.ts` (333 LOC).
- See `memory-bank/designs/loc-refactor-plan.md` and
  `.specify/memory/constitution.md` for details.

Milestones

- Deterministic simulation + test harness — complete
- Specs alignment sweep (remove appended legacy/template doc tails) — complete
- Playwright E2E coverage of boot/core flows — partial

How to run (quick)

- Dev: `npm run dev` — start Vite local server and open the arena
- Tests: `npm run test` — run Vitest unit tests
- E2E: `npm run playwright:test` — run Playwright suites (install playwright first)
