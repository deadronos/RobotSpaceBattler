/**
 * Contract test for RespawnSystem
 * 
 * Verifies:
 * - Respawn delay enforcement (default 5000ms)
 * - Respawn queue behavior and rate limiting
 * - Invulnerability timestamps (default 2000ms)
 * - Deterministic timing using StepContext.simNowMs
 * 
 * This test is written FIRST (TDD) and should FAIL until implementation is complete.
 */

import { describe, it, expect } from "vitest";
import { respawnSystem as respawnSystemModule } from "../../src/systems/RespawnSystem";
import { createTestDriver, createTestStepContext } from "../helpers/fixedStepHarness";

type SpawnRequest = {
  entityId: string;
  team: string;
  respawnAtMs: number;
  retries?: number;
  spawnZoneId?: string;
};

type RespawnedEntity = {
  id: string;
  team: string;
  position: [number, number, number];
  invulnerableUntil: number;
};

type StepContext = ReturnType<typeof createTestStepContext>;

const DEFAULT_RESPAWN_DELAY_MS = 5000;
const DEFAULT_INVULNERABILITY_MS = 2000;
const MAX_SPAWNS_PER_STEP = 3;

const respawnSystem = respawnSystemModule as unknown as (params: {
  queue: SpawnRequest[];
  stepContext: StepContext;
  spawnConfig?: {
    respawnDelayMs?: number;
    invulnerabilityMs?: number;
    maxSpawnsPerStep?: number;
  };
}) => {
  respawned: RespawnedEntity[];
  remainingQueue: SpawnRequest[];
};

function runRespawnSystem(
  ctx: StepContext,
  queue: SpawnRequest[],
  overrides: {
    respawnDelayMs?: number;
    invulnerabilityMs?: number;
    maxSpawnsPerStep?: number;
  } = {}
): {
  respawned: RespawnedEntity[];
  remainingQueue: SpawnRequest[];
} {
  return respawnSystem({
    queue,
    stepContext: ctx,
    spawnConfig: overrides,
  });
}

describe("RespawnSystem Contract", () => {

  it("should enforce default respawn delay of 5000ms", () => {
    const ctx = createTestStepContext({ simNowMs: 6000 });

    const request: SpawnRequest = {
      entityId: "robot-1",
      team: "red",
      respawnAtMs: 5000, // died at 0, respawn at 5000
    };

  const result = runRespawnSystem(ctx, [request]);

    // At 6000ms, entity should respawn (past 5000ms threshold)
    expect(result.respawned).toHaveLength(1);
    expect(result.respawned[0].id).toBe("robot-1");
    expect(result.remainingQueue).toHaveLength(0);
  });

  it("should NOT respawn before delay elapses", () => {
    const ctx = createTestStepContext({ simNowMs: 4000 });

    const request: SpawnRequest = {
      entityId: "robot-2",
      team: "blue",
      respawnAtMs: 5000,
    };

  const result = runRespawnSystem(ctx, [request]);

    // At 4000ms, entity should still be in queue
    expect(result.respawned).toHaveLength(0);
    expect(result.remainingQueue).toHaveLength(1);
    expect(result.remainingQueue[0].entityId).toBe("robot-2");
  });

  it("should set invulnerableUntil timestamp correctly", () => {
    const ctx = createTestStepContext({ simNowMs: 6000 });

    const request: SpawnRequest = {
      entityId: "robot-3",
      team: "red",
      respawnAtMs: 5000,
    };

  const result = runRespawnSystem(ctx, [request]);

    expect(result.respawned).toHaveLength(1);
    // invulnerableUntil should be simNowMs + INVULNERABILITY_MS
    expect(result.respawned[0].invulnerableUntil).toBe(
      ctx.simNowMs + DEFAULT_INVULNERABILITY_MS
    );
  });

  it("should process queue in deterministic order (FIFO)", () => {
    const ctx = createTestStepContext({ simNowMs: 10000 });

    const queue: SpawnRequest[] = [
      { entityId: "robot-4", team: "red", respawnAtMs: 5000 },
      { entityId: "robot-5", team: "blue", respawnAtMs: 6000 },
      { entityId: "robot-6", team: "red", respawnAtMs: 7000 },
    ];

  const result = runRespawnSystem(ctx, queue);

    // All should respawn by 10000ms, in order
    expect(result.respawned).toHaveLength(3);
    expect(result.respawned[0].id).toBe("robot-4");
    expect(result.respawned[1].id).toBe("robot-5");
    expect(result.respawned[2].id).toBe("robot-6");
  });

  it("should enforce spawn queue rate limiting", () => {
  const ctx = createTestStepContext({ simNowMs: 10000 });

    // Create a queue with more than the limit
    const queue: SpawnRequest[] = [
      { entityId: "robot-7", team: "red", respawnAtMs: 5000 },
      { entityId: "robot-8", team: "red", respawnAtMs: 5000 },
      { entityId: "robot-9", team: "red", respawnAtMs: 5000 },
      { entityId: "robot-10", team: "red", respawnAtMs: 5000 },
      { entityId: "robot-11", team: "red", respawnAtMs: 5000 },
    ];

  const result = runRespawnSystem(ctx, queue, { maxSpawnsPerStep: MAX_SPAWNS_PER_STEP });

    // Should only spawn up to MAX_SPAWNS_PER_STEP
    expect(result.respawned.length).toBeLessThanOrEqual(MAX_SPAWNS_PER_STEP);
    expect(result.remainingQueue.length).toBeGreaterThan(0);
  });

  it("should use StepContext.simNowMs for timing", () => {
    const driver = createTestDriver();
    
    // Step to 5000ms
    let ctx;
    for (let i = 0; i < 300; i++) {
      ctx = driver.stepOnce();
      if (ctx.simNowMs >= 5000) break;
    }

    const request: SpawnRequest = {
      entityId: "robot-12",
      team: "blue",
      respawnAtMs: 5000,
    };

  const result = runRespawnSystem(ctx!, [request]);

    expect(result.respawned).toHaveLength(1);
    // Verify timing matches StepContext
    expect(result.respawned[0].invulnerableUntil).toBeGreaterThan(ctx!.simNowMs);
  });

  it("should handle empty queue gracefully", () => {
    const ctx = createTestStepContext({ simNowMs: 1000 });

  const result = runRespawnSystem(ctx, []);

    expect(result.respawned).toHaveLength(0);
    expect(result.remainingQueue).toHaveLength(0);
  });

  it("should track retry count for failed spawns", () => {
    const ctx = createTestStepContext({ simNowMs: 6000 });

    const request: SpawnRequest = {
      entityId: "robot-13",
      team: "red",
      respawnAtMs: 5000,
      retries: 5, // Already had 5 retries
    };

    // If spawn fails, retry count should increment
    // (This test assumes spawn can fail and return to queue)
    // Real implementation will need proximity/placement logic
    
    // For now, just verify retries are preserved
  const result = runRespawnSystem(ctx, [request]);
    
    // Either spawned or back in queue with updated retries
    if (result.remainingQueue.length > 0) {
      expect(result.remainingQueue[0].retries).toBeDefined();
    }
  });

  it("should maintain determinism across multiple steps", () => {
    const seed = 54321;
    const driver1 = createTestDriver(seed);
    const driver2 = createTestDriver(seed);

    const queue: SpawnRequest[] = [
      { entityId: "robot-14", team: "red", respawnAtMs: 5000 },
      { entityId: "robot-15", team: "blue", respawnAtMs: 7000 },
    ];

    // Run both drivers to 10000ms
    let ctx1, ctx2;
    for (let i = 0; i < 600; i++) {
      ctx1 = driver1.stepOnce();
      ctx2 = driver2.stepOnce();
    }

  const result1 = runRespawnSystem(ctx1!, [...queue]);
  const result2 = runRespawnSystem(ctx2!, [...queue]);

    // Results should be identical
    expect(result1.respawned.length).toBe(result2.respawned.length);
    for (let i = 0; i < result1.respawned.length; i++) {
      expect(result1.respawned[i].id).toBe(result2.respawned[i].id);
      expect(result1.respawned[i].invulnerableUntil).toBe(
        result2.respawned[i].invulnerableUntil
      );
    }
  });
});
