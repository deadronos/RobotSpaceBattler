// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { createBattleWorld } from "../../src/ecs/world";
import {
  createBattleRunner,
  FIXED_STEP_SECONDS,
  MAX_SUBSTEPS,
} from "../../src/runtime/simulation/battleRunner";
import type { TelemetryPort } from "../../src/runtime/simulation/ports";
import { createMatchStateMachine } from "../../src/runtime/state/matchStateMachine";
import { runHeadlessMatch } from "../helpers/headlessMatch";

function noopTelemetry(): TelemetryPort {
  return {
    reset: vi.fn<TelemetryPort["reset"]>(),
    recordSpawn: vi.fn<TelemetryPort["recordSpawn"]>(),
    recordFire: vi.fn<TelemetryPort["recordFire"]>(),
    recordDamage: vi.fn<TelemetryPort["recordDamage"]>(),
    recordDeath: vi.fn<TelemetryPort["recordDeath"]>(),
  };
}

function setupRunner(seed: number) {
  const world = createBattleWorld();
  const runner = createBattleRunner(world, {
    seed,
    telemetry: noopTelemetry(),
    matchMachine: createMatchStateMachine({ autoRestartDelayMs: 1000 }),
  });
  return { world, runner };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fixed timestep and determinism", () => {
  it("runner.advance caps substeps for a huge frame delta", () => {
    const { world, runner } = setupRunner(1);
    runner.advance(600); // ten minutes in a background tab
    expect(world.state.frameIndex).toBe(MAX_SUBSTEPS);
    expect(world.state.elapsedMs).toBeCloseTo(
      MAX_SUBSTEPS * FIXED_STEP_SECONDS * 1000,
    );
    runner.dispose();
  });

  it("advance with 120 Hz frames steps at a fixed 60 Hz cadence", () => {
    const { world, runner } = setupRunner(1);
    for (let i = 0; i < 120; i += 1) runner.advance(1 / 120);
    expect(world.state.frameIndex).toBe(60);
    runner.dispose();
  });

  it("a full match is identical across runs with a state hash", () => {
    const a = runHeadlessMatch({ seed: 7 });
    const b = runHeadlessMatch({ seed: 7 });
    expect(a.stateHash).toBe(b.stateHash);
    expect(a.trace).toEqual(b.trace);
    expect(a).toEqual(b);
    expect(a.trace.length).toBeGreaterThan(0);
  });

  it("outcome does not depend on wall-clock time", () => {
    const a = runHeadlessMatch({ seed: 7 });
    vi.spyOn(Date, "now").mockReturnValue(9_999_999_999_999);
    vi.spyOn(performance, "now").mockReturnValue(123_456.789);
    const b = runHeadlessMatch({ seed: 7 });
    expect(b.stateHash).toBe(a.stateHash);
    expect(b).toEqual(a);
  });

  it("different seeds yield different hashes", () => {
    expect(runHeadlessMatch({ seed: 7 }).stateHash).not.toBe(
      runHeadlessMatch({ seed: 8 }).stateHash,
    );
  });
});
