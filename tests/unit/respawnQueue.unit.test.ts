import { describe, it, expect } from "vitest";
import { respawnSystem as respawnSystemModule } from "../../src/systems/RespawnSystem";
import { createTestStepContext } from "../helpers/fixedStepHarness";

type StepContext = ReturnType<typeof createTestStepContext>;

type SpawnRequest = {
  entityId: string;
  team: string;
  respawnAtMs: number;
  retries?: number;
};

type RespawnedEntity = {
  id: string;
  team: string;
  position: [number, number, number];
  invulnerableUntil: number;
};

const respawnSystem = respawnSystemModule as unknown as (params: {
  queue: SpawnRequest[];
  stepContext: StepContext;
  spawnConfig?: { respawnDelayMs?: number; invulnerabilityMs?: number; maxSpawnsPerStep?: number };
}) => { respawned: RespawnedEntity[]; remainingQueue: SpawnRequest[] };

describe("Respawn queue unit tests (T020)", () => {
  it("should not respawn before respawnAtMs when using StepContext.simNowMs", () => {
    const ctx = createTestStepContext({ simNowMs: 4000 });
    const queue: SpawnRequest[] = [{ entityId: "u1", team: "red", respawnAtMs: 5000 }];

    const res = respawnSystem({ queue, stepContext: ctx });

    expect(res.respawned).toHaveLength(0);
    expect(res.remainingQueue).toHaveLength(1);
  });

  it("should respawn when simNowMs >= respawnAtMs and set invulnerability", () => {
    const ctx = createTestStepContext({ simNowMs: 6000 });
    const queue: SpawnRequest[] = [{ entityId: "u2", team: "blue", respawnAtMs: 5000 }];

    const res = respawnSystem({ queue, stepContext: ctx });

    expect(res.respawned).toHaveLength(1);
    expect(res.respawned[0].id).toBe("u2");
    expect(res.respawned[0].invulnerableUntil).toBe(ctx.simNowMs + 2000);
  });

  it("should enforce maxSpawnsPerStep default when many entries are ready", () => {
    const ctx = createTestStepContext({ simNowMs: 10000 });
    const queue: SpawnRequest[] = [];
    for (let i = 0; i < 10; i++) {
      queue.push({ entityId: `batch-${i}`, team: "red", respawnAtMs: 5000 });
    }

    const res = respawnSystem({ queue, stepContext: ctx, spawnConfig: { maxSpawnsPerStep: 3 } });

    expect(res.respawned.length).toBeLessThanOrEqual(3);
    expect(res.remainingQueue.length).toBeGreaterThan(0);
  });

  it("should maintain FIFO ordering when respawning", () => {
    const ctx = createTestStepContext({ simNowMs: 10000 });
    const queue: SpawnRequest[] = [
      { entityId: "first", team: "red", respawnAtMs: 5000 },
      { entityId: "second", team: "red", respawnAtMs: 5000 },
    ];

    const res = respawnSystem({ queue, stepContext: ctx });

    expect(res.respawned[0].id).toBe("first");
    expect(res.respawned[1].id).toBe("second");
  });
});
