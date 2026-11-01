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

  it("the headless harness applies navmesh path results", () => {
    // Not just the direct-steer fallback: navmesh paths are computed in-process
    // and applied inside runner.step().
    const result = runHeadlessMatch({ seed: 7, pathfindingMode: "inline" });
    expect(result.paths.calculations).toBeGreaterThan(0);
  }, 30000);

  it("a match with navmesh paths applied replays identically", () => {
    const a = runHeadlessMatch({ seed: 7, pathfindingMode: "inline" });
    const b = runHeadlessMatch({ seed: 7, pathfindingMode: "inline" });
    expect(a.paths.calculations).toBeGreaterThan(0);
    expect(b.paths).toEqual(a.paths);
    expect(b.stateHash).toBe(a.stateHash);
    expect(b.trace).toEqual(a.trace);

    // Path timing and timestamps use sim time, never wall-clock time.
    vi.spyOn(Date, "now").mockReturnValue(9_999_999_999_999);
    vi.spyOn(performance, "now").mockReturnValue(123_456.789);
    const c = runHeadlessMatch({ seed: 7, pathfindingMode: "inline" });
    expect(c.paths).toEqual(a.paths);
    expect(c.stateHash).toBe(a.stateHash);
  }, 30000);

  it("synchronous steps do not wait for worker promises", () => {
    // In worker mode the request promise settles in a microtask, which the
    // synchronous headless loop never drains: no result may be applied.
    const result = runHeadlessMatch({ seed: 7, pathfindingMode: "worker" });
    expect(result.paths.calculations).toBe(0);
  }, 30000);

  it("a settled worker result waits for its scheduled tick", async () => {
    const { world, runner } = setupRunner(7);

    runner.step(FIXED_STEP_SECONDS);
    const dispatched = world.robots.entities.filter(
      (robot) => robot.pathComponent.status === "calculating",
    );
    expect(dispatched.length).toBeGreaterThan(0);

    // Let the worker promises settle between steps (main-thread fallback).
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(
      dispatched.every((r) => r.pathComponent.status === "calculating"),
    ).toBe(true);

    runner.step(FIXED_STEP_SECONDS);
    expect(
      dispatched.every((r) => r.pathComponent.status === "calculating"),
    ).toBe(true);

    // Due at request tick + 3.
    runner.step(FIXED_STEP_SECONDS);
    runner.step(FIXED_STEP_SECONDS);
    expect(
      dispatched.every((r) => r.pathComponent.status !== "calculating"),
    ).toBe(true);
    runner.dispose();
  }, 30000);

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
