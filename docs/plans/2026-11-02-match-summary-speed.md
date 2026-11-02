# Match end: summary screen, series score and speed control (#170)

## Goal

Surface what happened in a match and give the user control over the loop:

- a post-match summary (winner, duration, per-team stats, per-robot stats, MVP),
- a series score that survives rounds,
- an auto-restart switch,
- 0.5×/1×/2×/4× simulation speed that cannot change the outcome of a seed.

## Acceptance criteria

- [x] Summary screen appears at match end with per-team and per-robot stats.
- [x] Series score persists across rounds until reset.
- [x] Auto-restart can be disabled.
- [x] Speed control changes the sim rate without breaking determinism.

## Speed control (decided, not re-litigated)

At speed `k` the runner feeds the fixed stepper `frameDelta * k` and scales the
substep cap by `k` (`MAX_SUBSTEPS * k`, rounded up, minimum 1). Steps stay fixed
at 1/60 s, so a seed produces the same step sequence at any speed and the same
outcome. When the machine cannot keep up the sim runs in slow motion.

## What is runtime state and what is simulation state

| Data             | Owner                         | Feeds the sim?                                 |
| ---------------- | ----------------------------- | ---------------------------------------------- |
| speed            | `BattleRunner` (runtime)      | Only the accumulator input, never a step value |
| summary snapshot | React state in `App`          | No                                             |
| series score     | React state in `App`          | No                                             |
| auto-restart     | `matchStateMachine` (runtime) | No                                             |

The parity goldens (`tests/ai/aiSystem.parity.spec.ts`) and the headless match
digests must stay unchanged: nothing above is written into the ECS.

## Steps and tests

1. **`src/lib/simSpeed.ts`** – speed options, normalisation, scaled substep cap,
   display formatting. Tested in `tests/lib/simSpeed.spec.ts`.
2. **`src/lib/fixedStepper.ts`** – `maxSubSteps` may be a getter so the cap can
   follow the speed without rebuilding the accumulator. Tested in
   `tests/lib/fixedStepper.spec.ts`.
3. **`BattleRunner.setSpeed`/`getSpeed`** – multiplies the frame delta and the
   cap. Tested in `tests/runtime/battleRunnerSpeed.spec.ts`, including the
   headless proof that seed `7` at 0.5×, 1× and 4× produces one digest
   (`tests/helpers/speedMatch.ts`).
4. **`matchStateMachine` auto-restart** – new option and
   `setAutoRestartEnabled`; the victory snapshot reports `autoRestartEnabled`
   and `restartTimerMs: null` when the countdown is off. Tested in
   `tests/runtime/matchStateMachine.spec.ts`.
5. **`src/runtime/state/matchSummary.ts`** – pure summary builder (per team, per
   role, per robot, MVP, duration formatting) from telemetry plus a robot-id →
   role map. Tested in `tests/runtime/matchSummary.spec.ts`.
6. **`src/runtime/state/seriesScore.ts`** – pure series counter. Tested in
   `tests/runtime/seriesScore.spec.ts`.
7. **UI** – new `SimSpeedControl`, `MatchEndOverlay` and `MatchSummaryModal`
   components (the existing `Modal` supplies `role="dialog"`, `aria-modal` and a
   labelled title). `App.tsx` only gains the wiring. Tested in
   `tests/ui/SimSpeedControl.test.tsx`, `tests/ui/MatchEndOverlay.test.tsx`,
   `tests/ui/MatchSummaryModal.test.tsx` and `tests/ui/App.matchEnd.test.tsx`;
   `playwright/tests/smoke.spec.ts` asserts the control is present.
8. **Docs** – `docs/agents/architecture.md`, `docs/agents/gotchas.md`,
   `scratch.md`.

## Out of scope

- Best-of-N match series rules (first to 5 ends the session): the score simply
  counts wins and draws until the user resets it.
- Per-round history beyond the last summary.
