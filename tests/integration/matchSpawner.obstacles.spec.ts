import { describe, expect, it, vi } from "vitest";

import { createBattleWorld } from "../../src/ecs/world";
import { createBattleRunner } from "../../src/runtime/simulation/battleRunner";
import { TelemetryPort } from "../../src/runtime/simulation/ports";
import { createMatchStateMachine } from "../../src/runtime/state/matchStateMachine";
import { loadFixture } from "../helpers/obstacleFixtures";

function createStubTelemetry(): TelemetryPort {
  return {
    reset: vi.fn<TelemetryPort["reset"]>(),
    recordSpawn: vi.fn<TelemetryPort["recordSpawn"]>(),
    recordFire: vi.fn<TelemetryPort["recordFire"]>(),
    recordDamage: vi.fn<TelemetryPort["recordDamage"]>(),
    recordDeath: vi.fn<TelemetryPort["recordDeath"]>(),
  };
}

describe("Match start flow with obstacle fixtures", () => {
  const fixturePath = "src/simulation/match/fixtures/dynamic-arena-sample.json";

  it("seeds obstacles from fixture on start and reset", () => {
    const world = createBattleWorld();
    const matchMachine = createMatchStateMachine();
    const telemetry = createStubTelemetry();
    const fixture = loadFixture(fixturePath);

    const runner = createBattleRunner(world, {
      seed: 424242,
      telemetry,
      matchMachine,
      obstacleFixture: fixture,
    });

    const expectObstacleSet = () => {
      const obstacles = world.obstacles.entities;
      expect(obstacles.length).toBe(fixture.obstacles.length);
      expect(new Set(obstacles.map((o) => o.id)).size).toBe(
        fixture.obstacles.length,
      );
    };

    expect(world.robots.entities.length).toBeGreaterThan(0);
    expectObstacleSet();

    runner.reset();
    expectObstacleSet();
    expect(world.state.elapsedMs).toBe(0);
    expect(world.state.frameIndex).toBe(0);
  });
});
