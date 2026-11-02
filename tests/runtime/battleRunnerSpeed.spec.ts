// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { createBattleWorld } from "../../src/ecs/world";
import {
  createBattleRunner,
  FIXED_STEP_SECONDS,
  MAX_SUBSTEPS,
} from "../../src/runtime/simulation/battleRunner";
import type { TelemetryPort } from "../../src/runtime/simulation/ports";
import { createMatchStateMachine } from "../../src/runtime/state/matchStateMachine";
import { runHeadlessMatchAtSpeed } from "../helpers/speedMatch";

const DT = FIXED_STEP_SECONDS;

function noopTelemetry(): TelemetryPort {
  return {
    reset: vi.fn<TelemetryPort["reset"]>(),
    recordSpawn: vi.fn<TelemetryPort["recordSpawn"]>(),
    recordFire: vi.fn<TelemetryPort["recordFire"]>(),
    recordDamage: vi.fn<TelemetryPort["recordDamage"]>(),
    recordDeath: vi.fn<TelemetryPort["recordDeath"]>(),
  };
}

function setupRunner(speed?: number) {
  const world = createBattleWorld();
  const runner = createBattleRunner(world, {
    seed: 7,
    telemetry: noopTelemetry(),
    matchMachine: createMatchStateMachine({ autoRestartDelayMs: 1000 }),
    speed,
  });
  return { world, runner };
}

describe("BattleRunner speed (#170)", () => {
  it("starts at 1x and normalises unsupported speeds", () => {
    const { runner } = setupRunner();
    expect(runner.getSpeed()).toBe(1);
    runner.setSpeed(3);
    expect(runner.getSpeed()).toBe(2);
    runner.setSpeed(0.4);
    expect(runner.getSpeed()).toBe(0.5);
    runner.dispose();
  });

  it("takes one fixed step per 60 Hz frame at 1x", () => {
    const { world, runner } = setupRunner(1);
    for (let i = 0; i < 10; i += 1) runner.advance(DT);
    expect(world.state.frameIndex).toBe(10);
    runner.dispose();
  });

  it("takes four fixed steps per 60 Hz frame at 4x", () => {
    const { world, runner } = setupRunner(4);
    for (let i = 0; i < 10; i += 1) runner.advance(DT);
    expect(world.state.frameIndex).toBe(40);
    runner.dispose();
  });

  it("carries half a step per frame at 0.5x", () => {
    const { world, runner } = setupRunner(0.5);
    for (let i = 0; i < 10; i += 1) runner.advance(DT);
    expect(world.state.frameIndex).toBe(5);
    runner.dispose();
  });

  it("keeps the step length fixed at every speed", () => {
    for (const speed of [0.5, 1, 2, 4]) {
      const { world, runner } = setupRunner(speed);
      for (let i = 0; i < 30; i += 1) runner.advance(DT);
      expect(world.state.elapsedMs).toBeCloseTo(
        world.state.frameIndex * DT * 1000,
        6,
      );
      expect(world.state.elapsedMs).toBeCloseTo(30 * speed * DT * 1000, 6);
      runner.dispose();
    }
  });

  it("scales the substep cap with the speed", () => {
    const slow = setupRunner(1);
    slow.runner.advance(600);
    expect(slow.world.state.frameIndex).toBe(MAX_SUBSTEPS);
    slow.runner.dispose();

    const fast = setupRunner(4);
    fast.runner.advance(600);
    expect(fast.world.state.frameIndex).toBe(MAX_SUBSTEPS * 4);
    fast.runner.dispose();
  });

  it("applies a speed change without rebuilding the accumulator", () => {
    const { world, runner } = setupRunner(1);
    runner.advance(DT / 2);
    expect(world.state.frameIndex).toBe(0);
    runner.setSpeed(2);
    // Half a step of backlog plus a full frame at 2× leaves 2.5 steps: two now.
    runner.advance(DT);
    expect(world.state.frameIndex).toBe(2);
    runner.dispose();
  });

  it("keeps the reset speed", () => {
    const { runner } = setupRunner(4);
    runner.reset();
    expect(runner.getSpeed()).toBe(4);
    runner.dispose();
  });
});

describe("speed does not change a seed's outcome (#170)", () => {
  const options = {
    seed: 7,
    maxMatchDurationMs: 20_000,
  };

  it("produces the same digest at 0.5x, 1x and 4x", () => {
    const one = runHeadlessMatchAtSpeed({ ...options, speed: 1 });
    const half = runHeadlessMatchAtSpeed({ ...options, speed: 0.5 });
    const four = runHeadlessMatchAtSpeed({ ...options, speed: 4 });

    // The match really ended, and every run took the same 1/60 s steps.
    expect(one.phase).toBe("victory");
    expect(one.simSteps).toBeGreaterThan(0);
    for (const run of [half, four]) {
      expect(run.phase).toBe(one.phase);
      expect(run.winner).toBe(one.winner);
      expect(run.isDraw).toBe(one.isDraw);
      expect(run.simSteps).toBe(one.simSteps);
      expect(run.elapsedMs).toBe(one.elapsedMs);
      expect(run.stateHash).toBe(one.stateHash);
    }
    // ...but the frames needed differ with the speed.
    expect(four.frames).toBeLessThan(one.frames);
    expect(half.frames).toBeGreaterThan(one.frames);
  }, 60_000);

  it("survives a jittery frame rate at 4x", () => {
    const steady = runHeadlessMatchAtSpeed({ ...options, speed: 1 });
    const jittery = runHeadlessMatchAtSpeed({
      ...options,
      speed: 4,
      frameDeltaSeconds: (frame) => (frame % 3 === 0 ? DT / 3 : DT),
    });
    expect(jittery.phase).toBe("victory");
    expect(jittery.simSteps).toBe(steady.simSteps);
    expect(jittery.stateHash).toBe(steady.stateHash);
  }, 60_000);
});
