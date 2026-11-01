# Scratch: what to work on next

_Updated 2026-11-01. Covers the open issues under the October 2026 review (#177) plus follow-ups filed after Tier 4._

## Done since the last scratch

Every tier of the 2026-10-31 plan is closed: the live quick fixes (#153–#156), the CI and lint hygiene work (#180–#182), the worker and smoke tests (#157, #158), the test foundation (#160), the lower-priority batch (#164, #167, #169), and Tier 4:

- **#161 (PR #196):** fixed 60 Hz timestep with a 5-substep cap, sim time instead of `Date.now()`, swept projectile-vs-robot hits, and a same-seed determinism test.
- **#162 (PR #197):** React no longer re-renders per frame, robots move via refs with shared materials, and the ECS is the sole owner of robot positions (robot Rapier bodies dropped).
- **#171 (PR #198):** spatial grid for AI targeting, 72–93% less AI allocation, and `npm run bench`.
- **#202 + #203 (PR #206):** real-GPU measurement on an M4. React commits went from 120/s to 4/s and scripting dropped 28%. HUD panels no longer re-render on every telemetry event, and the smoke liveness check is now based on `frameIndex`.

## Tier 1: quick wins (S, any order, all parallel-safe)

1. **#194: match-status pill hidden under the canvas.** This is a visible live bug and a one-line `z-index` fix. Check the ≤768px layout against the team-strength bar.
2. **#204: rapier alias breaks builds in git worktrees.** Use `createRequire` + `require.resolve` in `vite.config.ts`. Do it **first** if more agent or worktree work is coming. Until then, worktree agents must symlink `node_modules` to the main checkout's.
3. **#207: telemetry store copies the whole events array per event.** Append in place. This is O(n²) per match today, and nothing subscribes to `events` any more.
4. **#205: 19 lint warnings in tests.** Fix them and make CI fail on warnings. This is mechanical.
5. **#200: swept projectile-vs-obstacle hits and the exact rocket impact point.** It finishes the #161 sim-fidelity work and is small with good tests.

## Tier 2: sim correctness (M)

6. **#192: possible blue-team win bias (61/39 over 100 seeds).** The game is now deterministic per seed (#161), so this is cheap to bisect. Mirror the spawns, swap the team order in the update loops, and look for iteration-order advantages (for example, red always acting first or second in `aiSystem` and `combatSystem`). Fix it before any balance or feature work.
7. **#199: apply pathfinding worker results at deterministic ticks.** This makes live matches replayable and lets the headless harness exercise navmesh paths. It pairs well with #192, because path timing may be a bias source.

## Tier 3: performance and size (M)

8. **#201: AI perf phase 2.** Make movement planning allocation-free and line-of-sight checks cheaper. Do it before anything that raises robot counts. Benchmark baseline: 3.0 ms/tick at 200 robots (`tests/bench/RESULTS.md`).
9. **#159 + #184: bundle diet and the Rapier 0.21 decision, together.** Robots no longer have Rapier bodies (#162), and Rapier is only used for static-geometry raycasts. Re-evaluate whether Rapier is needed at all: plain ray-vs-AABB/cylinder tests against the arena obstacles might replace it and save about 836 kB gzip. That's a bigger and better question than lazy-loading.

## Tier 4: features (L, now unblocked)

10. **#168: robot visuals.** Instanced meshes, health bars, hit flashes. It was blocked on #162, which is now done. Also fix the shadow-map and `THREE.Clock` deprecation warnings (see #185). Ask for real-GPU before/after numbers using the #206 method: headed Chrome, `--use-angle=metal`, and dropping Playwright's `--enable-unsafe-swiftshader`.
11. **#170: match-end summary, series score and speed control.** The draw outcome (#155) and fixed timestep (#161) are in. Note that 4× speed needs 4 steps per frame, so the 5-substep cap leaves no headroom below about 75 fps. Decide how speed control interacts with the cap (scale the cap with the speed, or accept slow-motion).
12. **#166: accessibility pass.** UX polish that can go anytime, alongside #170.
13. **#163: team builder (XL).** Last. It needs #192 fixed so that balance is meaningful.

## Housekeeping / blocked

- **#165: root clutter.** S-sized, for any quiet window. This file (`scratch.md`) is itself root clutter, so consider moving planning notes to `docs/` or an issue as part of it.
- **#183 (three 0.187) and #185 (`THREE.Clock`):** blocked upstream. Check the releases now and then.
- **Not filed yet (decide first):** on slow devices the sim runs slower than real time, because each frame does at most 5 fixed steps. CI's software GL showed robots not engaging within 40 s. Consider an adaptive cap, or show a "running slow" indicator. File it if it matters for mobile.

## Suggested order, in short

`#204 → (#194, #207, #205, #200 in parallel)` → `#192 → #199` → `#201` → `#159 + #184` → `#168 → #170 (+ #166)` → `#163`

Parallel-safe:
- All of Tier 1 touches different files.
- #192 and #201 both touch `aiSystem.ts` and `combatSystem.ts`, so run them in sequence.
- #168 touches only rendering and can run alongside Tier 2 and Tier 3.
