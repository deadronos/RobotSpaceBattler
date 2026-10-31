import { beforeEach, describe, expect, it, vi } from "vitest";

import * as aiSystem from "../../src/ecs/systems/aiSystem";
import { createBattleWorld } from "../../src/ecs/world";
import { createBattleRunner } from "../../src/runtime/simulation/battleRunner";
import { TelemetryPort } from "../../src/runtime/simulation/ports";
import { createMatchStateMachine } from "../../src/runtime/state/matchStateMachine";

function createNoopTelemetry(): TelemetryPort {
  return {
    reset: vi.fn(),
    recordSpawn: vi.fn(),
    recordFire: vi.fn(),
    recordDamage: vi.fn(),
    recordDeath: vi.fn(),
  };
}

function setup(maxMatchDurationMs?: number) {
  const world = createBattleWorld();
  const matchMachine = createMatchStateMachine({ autoRestartDelayMs: 1000 });
  const runner = createBattleRunner(world, {
    seed: 4242,
    telemetry: createNoopTelemetry(),
    matchMachine,
    maxMatchDurationMs,
  });
  return { world, matchMachine, runner };
}

describe("BattleRunner AI scheduling", () => {
  it("runs the AI system exactly once per step", () => {
    const spy = vi.spyOn(aiSystem, "updateAISystem");
    const { runner } = setup();
    spy.mockClear();

    runner.step(1 / 60);
    expect(spy).toHaveBeenCalledTimes(1);
    runner.step(1 / 60);
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});

describe("BattleRunner match outcomes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("ends in a draw when both teams are wiped on the same tick", () => {
    const { world, matchMachine, runner } = setup();
    world.robots.entities.forEach((robot) => {
      robot.health = 0;
    });

    runner.step(1 / 60);

    expect(matchMachine.getSnapshot()).toMatchObject({
      phase: "victory",
      winner: null,
      isDraw: true,
    });
  });

  it("auto-restarts after a draw", () => {
    const { world, matchMachine, runner } = setup();
    world.robots.entities.forEach((robot) => {
      robot.health = 0;
    });
    runner.step(1 / 60);
    expect(matchMachine.getSnapshot().phase).toBe("victory");

    runner.step(6);

    expect(matchMachine.getSnapshot()).toMatchObject({
      phase: "running",
      isDraw: false,
    });
    expect(world.robots.entities.some((robot) => robot.health > 0)).toBe(true);
  });

  it("still declares a winner when only one team is wiped", () => {
    const { world, matchMachine, runner } = setup();
    world.robots.entities.forEach((robot) => {
      if (robot.team === "red") robot.health = 0;
    });
    runner.step(1 / 60);
    expect(matchMachine.getSnapshot()).toMatchObject({
      phase: "victory",
      winner: "blue",
      isDraw: false,
    });
  });

  it("does not time out when no limit is configured", () => {
    const { matchMachine, runner } = setup();
    runner.step(600);
    expect(matchMachine.getSnapshot().phase).toBe("running");
  });

  it("resolves a timeout by remaining robots", () => {
    const { world, matchMachine, runner } = setup(1000);
    const blue = world.robots.entities.filter((r) => r.team === "blue");
    blue[0].health = 0;

    runner.step(0.5);
    expect(matchMachine.getSnapshot().phase).toBe("running");
    runner.step(0.6);
    runner.step(1 / 60);

    expect(matchMachine.getSnapshot()).toMatchObject({
      phase: "victory",
      winner: "red",
      isDraw: false,
    });
  });

  it("resolves a robot-count tie by total remaining HP", () => {
    const { world, matchMachine, runner } = setup(1000);
    const blue = world.robots.entities.find((r) => r.team === "blue");
    blue!.health = blue!.health - 1;

    runner.step(1.1);
    runner.step(1 / 60);

    expect(matchMachine.getSnapshot()).toMatchObject({
      phase: "victory",
      winner: "red",
    });
  });

  it("declares a draw on a timeout with equal robots and HP", () => {
    const { matchMachine, runner } = setup(1000);
    runner.step(1.1);
    runner.step(1 / 60);
    expect(matchMachine.getSnapshot()).toMatchObject({
      phase: "victory",
      winner: null,
      isDraw: true,
    });
  });
});
