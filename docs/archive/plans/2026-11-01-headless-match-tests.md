# Headless Full-Match Tests and Coverage Floor Implementation Plan (#160)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove whole matches work headlessly with assertions that would catch real regressions, give `combatSystem` direct tests, run pure-sim tests in the node environment, and enforce a coverage floor in CI.

**Architecture:** A test helper drives `createBattleRunner` with a fixed `dt` and a recording telemetry port (no renderer, no Rapier; the pathfinding worker falls back to the main thread in node). Vitest is split into a `node` project and a `jsdom` project. Coverage thresholds live in `vitest.config.ts`, and CI runs `test:coverage`.

**Tech Stack:** Vitest 5 (`test.projects`, `@vitest/coverage-v8`), TypeScript, GitHub Actions.

**Spec:** GitHub issue #160 (`gh issue view 160`).

## Global Constraints

- No source file over 300 LOC (`npm run check:source-size`). This applies to tests too: keep each file focused.
- `npm run lint`, `npm run format:check` and `npm run typecheck` must stay clean. `vi.fn` needs type parameters (`vi.fn<TelemetryPort["recordFire"]>()`), and conditional `expect` is banned.
- Do not change production behavior in `src/`. If a test exposes a real bug, stop and report it instead of fixing it.
- Do not duplicate `tests/runtime/battleRunnerOutcome.spec.ts`, which already covers synthetic draws, timeouts, auto-restart and single AI calls.
- Commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Facts established before planning (Opus probe on main @ 4ef59d3)

- With `seed` set and `step(1/60)`, a match reaches `phase === "victory"` in roughly 1200–2600 steps, about 100–150 ms per match in node.
- The same seed run twice gives an identical winner, step count and per-robot health and position.
- Across 30 seeds, blue won 20 and red won 10. Do **not** assert balance. A fixed seed list where each team wins at least once is fine. Seed 99 and seed 7 → red, seed 1 and seed 42 → blue.
- Current coverage (v8, all `src`): statements 82.87%, branches 70.34%, functions 83.3%, lines 83.86%. `combatSystem.ts` reaches 96.8% lines **only incidentally**, because no test imports `updateCombatSystem`.

## Review Focus

1. **Coverage without assertions:** a line that executes but isn't asserted is worthless here. Each new test must fail when the behavior it names is broken (see the Task 4 mutation check).
2. **Determinism flake on slow CI:** `PathfindingSystem` has a wall-clock time budget (`performance.now`). If the same-seed test flakes in CI, report it and don't loosen it silently.
3. **Telemetry consistency:** death count = robots with health ≤ 0 at the end. Spawns = initial robot count.
4. **A node-environment test that touches `window` or `document`** must stay in the jsdom project, not be shimmed.
5. **A threshold set above the actual numbers** fails CI on main. Set the thresholds from a measured run.

---

### Task 1: Headless match harness + full-match tests

**Files:**
- Create: `tests/helpers/headlessMatch.ts`
- Create: `tests/runtime/headlessMatch.spec.ts`

**Interfaces:**
- Produces: `runHeadlessMatch(options: { seed: number; dt?: number /* default 1/60 */; maxSteps?: number /* default 60*200 */; maxMatchDurationMs?: number | null }): HeadlessMatchResult`, where
  `HeadlessMatchResult = { phase; winner: TeamId | null; isDraw: boolean; steps: number; elapsedMs: number; survivors: Record<TeamId, number>; robots: Array<{ id: string; team: TeamId; health: number; x: number; z: number }>; counts: { spawns: number; fires: number; damage: number; deaths: number } }`.
  It steps until the phase leaves `"running"` or `maxSteps` is hit, then calls `runner.dispose()`. Counts come from a recording `TelemetryPort`. Use the real field names from `matchStateMachine.ts` (`winner`, and the draw flag it exposes).

- [ ] **Step 1:** Write `tests/runtime/headlessMatch.spec.ts` with `// @vitest-environment node` at the top (Task 3 makes it redundant, but keep it explicit until then). Tests:
  - `a seeded match runs to a decisive end` (seed 1): `phase === "victory"`, `steps < maxSteps`, `isDraw === false`, `survivors[winner] > 0`, `survivors[loser] === 0`, `elapsedMs < MATCH_TIME_LIMIT_MS`.
  - `telemetry agrees with the final world` (seed 1): `counts.spawns === robots.length`, `counts.deaths === robots.filter(r => r.health <= 0).length`, `counts.fires > 0`, `counts.damage > 0`, `counts.damage >= counts.deaths`.
  - `the same seed replays identically`: `expect(runHeadlessMatch({seed: 42})).toEqual(runHeadlessMatch({seed: 42}))`.
  - `different seeds produce different matches`: the results for seeds 1 and 99 are not equal.
  - `either team can win`: over `[1, 42, 7, 99]` the set of winners equals `{"red","blue"}`.
  - `a natural match hits the time limit and resolves by tally`: with `maxMatchDurationMs: 5000`, the phase is `"victory"`, `elapsedMs` is ≥ 5000 and below 5000 + 2×dt×1000. Then the winner/draw is consistent with `survivors`: more survivors wins. With equal survivors, assert only that the result is a winner or a draw. Don't re-implement the HP tiebreak.
- [ ] **Step 2:** Run `npx vitest run tests/runtime/headlessMatch.spec.ts`. Expected: FAIL (the helper is missing).
- [ ] **Step 3:** Implement `tests/helpers/headlessMatch.ts`.
- [ ] **Step 4:** Run it again. Expected: PASS, total time < 5 s. If any assertion fails because of real sim behavior (for example the death count mismatches), stop and report it. Don't adjust the assertion to fit.
- [ ] **Step 5:** Commit `test: headless seeded full-match harness`.

### Task 2: Direct `combatSystem` unit tests

**Files:**
- Create: `tests/ecs/combatSystem.spec.ts`

**Interfaces:**
- Consumes: `updateCombatSystem(world, telemetry, deltaSeconds)` from `src/ecs/systems/combatSystem.ts`, `createBattleWorld`, `createTestRobot` (`tests/helpers/robotFactory.ts`) and `getWeaponProfile`. Add robots with whatever `world` API the existing tests use (check `tests/ecs/*.spec.ts`).

- [ ] **Step 1:** Write the tests. Two robots, A (red, laser, at the origin) targeting B (blue, at `(5,0,0)`), with `fireCooldown 0`, in a mode other than retreat, healthy:
  - `fires one projectile at an in-range target`: there's exactly 1 projectile. `damage === profile.damage`, `shooterId === A.id`, `targetId === B.id`, and `team === "red"`. `position` equals A's position + (0, 0.8, 0). `velocity` is normalized toward B with a magnitude of `profile.projectileSpeed` (`toBeCloseTo`). `A.fireCooldown === 1/profile.fireRate`. `recordFire` was called once with `{entityId, teamId, weapon, timestampMs: world.state.elapsedMs}`.
  - `decrements cooldown by dt and clamps at zero`: cooldown 0.5 with dt 0.2 → 0.3 and no projectile. Then cooldown 0.1 with dt 0.2 → 0 (not negative).
  - `does not fire while retreating`.
  - `does not fire beyond weapon range`: B at `profile.range + 0.01`, while `profile.range - 0.01` does fire.
  - `does not fire at a dead or unknown target`: two cases, `B.health = 0` and `targetId = "nope"`.
  - `dead shooters do not fire but their cooldown still ticks`.
  - `does not fire when shooter and target overlap`: same position → 0 projectiles, and the cooldown stays 0.
  - `assigns sequential projectile ids`: two shooters → ids differ and `world.state.nextProjectileId` goes up by 2.
- [ ] **Step 2:** Run it. Expected: PASS (this characterizes existing behavior). If any case fails, read the code: report a real bug, or fix a wrong test assumption.
- [ ] **Step 3:** Commit `test: direct combatSystem unit tests`.

### Task 3: Node environment for pure-sim tests

**Files:**
- Modify: `vitest.config.ts`
- Possibly create: `tests/setup.node.ts`, only if node tests need any setup.

- [ ] **Step 1:** Record the baseline: run `npx vitest run` and note the Duration line, including its `environment` share.
- [ ] **Step 2:** Convert the config to `test.projects` with two inline projects that share the alias. `node`: `environment: "node"`, include `tests/**/*.{test,spec}.ts` (not `.tsx`), excluding the DOM-dependent dirs/files. `jsdom`: the current settings, including `setupFiles: "./tests/setup.ts"` and the complementary include. Every current test file must land in exactly one project. Check this by comparing the per-project file counts with the current 84 files plus the 2 new ones.
- [ ] **Step 3:** Run `npx vitest run`. For each node-project failure caused by `window`/`document`/`HTMLElement`/`matchMedia`/`@testing-library`, move that file to the jsdom project. Don't add shims.
- [ ] **Step 4:** Record the new Duration and put the before/after in the PR body.
- [ ] **Step 5:** Commit `test: run pure-sim tests in the node environment`.

### Task 4: Coverage floor + CI, with a mutation check

**Files:**
- Modify: `vitest.config.ts` (the `test.coverage` block at the root config)
- Modify: `.github/workflows/ci.yml` (the Test step)

- [ ] **Step 1:** Run `npm run test:coverage` and record the global numbers plus the lines and branches for `combatSystem.ts` and `battleRunner.ts`.
- [ ] **Step 2:** Add `coverage: { provider: "v8", include: ["src/**/*.{ts,tsx}"], reporter: ["text-summary", "text"], thresholds: {...} }`. Set the global thresholds to each measured value **floored to the integer, minus 1**. Add per-file globs for `src/ecs/systems/combatSystem.ts` and `src/runtime/simulation/battleRunner.ts` at the measured value floored, minus 2. If `include` changes the global numbers, use the numbers measured with it.
- [ ] **Step 3:** In `ci.yml`, change the Test step to `npm run test:coverage`.
- [ ] **Step 4:** Run `npm run test:coverage`. Expected: PASS and the thresholds print. Then lower one global threshold's headroom temporarily to prove it bites (set lines to 99 → FAIL), and revert.
- [ ] **Step 5 (mutation check, report the results in the PR body):** Apply each of these to `src/` one at a time, run `npx vitest run tests/ecs/combatSystem.spec.ts tests/runtime/headlessMatch.spec.ts`, confirm at least one test FAILS, then `git checkout src/`:
  1. In combatSystem, remove `|| robot.ai.mode === "retreat"`.
  2. In combatSystem, change `robot.fireCooldown = 1 / profile.fireRate` to `= 0`.
  3. In combatSystem, change `distance > profile.range` to `distance > profile.range * 2`.
  4. In battleRunner, comment out `updateCombatSystem(...)`. The headless match must then fail to end decisively.
  5. In battleRunner, comment out `telemetry.recordSpawn(...)` in `onRobotSpawn`.
  Every mutation that survives means a test is missing: add it.
- [ ] **Step 6:** Run the full gate: `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build && npm run check:source-size`. All of it must pass.
- [ ] **Step 7:** Commit `ci: enforce coverage floor`.
