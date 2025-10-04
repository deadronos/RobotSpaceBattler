/**
 * Integration test to ensure Simulation (via RespawnSystem) uses StepContext.simNowMs
 * when processing respawn queues.
 */

import { describe, it, expect } from "vitest";
import { FixedStepDriver } from "../../src/utils/fixedStepDriver";
import { respawnSystem as respawnSystemModule } from "../../src/systems/RespawnSystem";

const respawnSystem = respawnSystemModule as unknown as (params: {
  queue: Array<{
    entityId: string;
    team: string;
    respawnAtMs: number;
    retries?: number;
  }>;
  stepContext: {
    frameCount: number;
    simNowMs: number;
    step: number;
    rng: () => number;
  };
  spawnConfig?: {
    maxSpawnsPerStep?: number;
  };
}) => {
  respawned: Array<{ id: string; invulnerableUntil: number }>;
  remainingQueue: Array<{ entityId: string; respawnAtMs: number }>;
};

describe("respawn queue determinism", () => {
  it("should only respawn once simNowMs reaches respawnAtMs", () => {
    const driver = new FixedStepDriver(42, 1 / 60);
    const queue = [
      { entityId: "r1", team: "red", respawnAtMs: 3000 },
      { entityId: "r2", team: "blue", respawnAtMs: 4000 },
    ];

    const step1 = driver.stepOnce();
    const resultBefore = respawnSystem({ queue: [...queue], stepContext: step1 });
    expect(resultBefore.respawned).toHaveLength(0);
    expect(resultBefore.remainingQueue).toHaveLength(2);

    let ctx = step1;
    while (ctx.simNowMs < 4000) {
      ctx = driver.stepOnce();
    }

    const resultAfter = respawnSystem({ queue: [...queue], stepContext: ctx });
    expect(resultAfter.respawned.length).toBeGreaterThan(0);
    expect(resultAfter.remainingQueue.length).toBeLessThan(2);
    expect(resultAfter.respawned[0].id).toBe("r1");
  });

  it("should enforce per-step spawn limits deterministically", () => {
    const driver = new FixedStepDriver(99, 1 / 60);
    const queue = new Array(5).fill(null).map((_, i) => ({
      entityId: `robot-${i}`,
      team: "red",
      respawnAtMs: 1000,
    }));

    let ctx = driver.stepOnce();
    while (ctx.simNowMs < 1000) {
      ctx = driver.stepOnce();
    }

    const result = respawnSystem({
      queue,
      stepContext: ctx,
      spawnConfig: { maxSpawnsPerStep: 2 },
    });

    expect(result.respawned.length).toBeLessThanOrEqual(2);
    expect(result.remainingQueue.length).toBeGreaterThan(0);
  });
});
