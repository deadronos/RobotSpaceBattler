import { createBattleWorld } from "../../src/ecs/world";
import type { TeamId } from "../../src/lib/teamConfig";
import {
  createBattleRunner,
  type BattleRunner,
} from "../../src/runtime/simulation/battleRunner";
import type { TelemetryPort } from "../../src/runtime/simulation/ports";
import {
  createMatchStateMachine,
  type MatchRuntimePhase,
} from "../../src/runtime/state/matchStateMachine";
import { hashBattleWorld } from "./headlessMatch";

export interface SpeedMatchOptions {
  seed: number;
  /** Speed multiplier handed to the runner (snapped to a supported speed). */
  speed: number;
  /**
   * Wall-clock frame length fed to `runner.advance`. A function receives the
   * frame index, which lets a test simulate a jittery frame rate.
   */
  frameDeltaSeconds?: number | ((frame: number) => number);
  /** Safety valve so a runaway match cannot hang the test. */
  maxFrames?: number;
  /** Same meaning as in `runHeadlessMatch`; keep it low for fast tests. */
  maxMatchDurationMs?: number | null;
}

export interface SpeedMatchResult {
  phase: MatchRuntimePhase;
  winner: TeamId | null;
  isDraw: boolean;
  /** Wall-clock frames fed to `advance`. */
  frames: number;
  /** Fixed 1/60 s simulation steps actually taken. */
  simSteps: number;
  elapsedMs: number;
  stateHash: string;
}

function noopTelemetry(): TelemetryPort {
  return {
    reset: () => {},
    recordSpawn: () => {},
    recordFire: () => {},
    recordDamage: () => {},
    recordDeath: () => {},
  };
}

/**
 * Runs a seeded match through the *frame* path (`runner.advance`) at a given
 * speed, so the accumulator and substep cap are exercised exactly like the
 * render loop does (#170). Returns the final world digest: because every step
 * is still 1/60 s, the digest must not depend on the speed or on the frame
 * chunking.
 */
export function runHeadlessMatchAtSpeed(
  options: SpeedMatchOptions,
): SpeedMatchResult {
  const frameDelta = options.frameDeltaSeconds ?? 1 / 60;
  const maxFrames = options.maxFrames ?? 200_000;

  const world = createBattleWorld();
  const matchMachine = createMatchStateMachine({ autoRestartDelayMs: 1000 });
  const runner: BattleRunner = createBattleRunner(world, {
    seed: options.seed,
    telemetry: noopTelemetry(),
    matchMachine,
    maxMatchDurationMs: options.maxMatchDurationMs,
    speed: options.speed,
  });

  let frames = 0;
  try {
    while (matchMachine.getSnapshot().phase === "running") {
      if (frames >= maxFrames) {
        break;
      }
      const delta =
        typeof frameDelta === "function" ? frameDelta(frames) : frameDelta;
      runner.advance(delta);
      frames += 1;
    }
  } finally {
    runner.dispose();
  }

  const snapshot = matchMachine.getSnapshot();
  return {
    phase: snapshot.phase,
    winner: snapshot.winner,
    isDraw: snapshot.isDraw,
    frames,
    simSteps: world.state.frameIndex,
    elapsedMs: world.state.elapsedMs,
    stateHash: hashBattleWorld(world, options.seed),
  };
}
