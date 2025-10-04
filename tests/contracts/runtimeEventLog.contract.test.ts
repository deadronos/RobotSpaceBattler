/**
 * Contract tests for the runtime event log ring buffer.
 *
 * Validates:
 * - Bounded capacity behavior (oldest entries dropped on overflow)
 * - Ordering guarantees (oldest-first vs newest-first)
 * - Deterministic readback of appended entries
 */

import { describe, it, expect } from "vitest";
import { createTestStepContext, createIdFactory } from "../helpers/fixedStepHarness";
import { createRuntimeEventLog as createRuntimeEventLogModule } from "../../src/utils/runtimeEventLog";

const createRuntimeEventLog = createRuntimeEventLogModule as unknown as (config?: {
  capacity?: number;
}) => {
  append: (entry: DeathAuditEntry) => void;
  read: (options?: { order?: "oldest-first" | "newest-first" }) => DeathAuditEntry[];
  size: () => number;
  capacity: () => number;
  clear: () => void;
};

type StepContext = ReturnType<typeof createTestStepContext>;

type DeathAuditEntry = {
  id: string;
  simNowMs: number;
  frameCount: number;
  victimId: string;
  killerId?: string;
  victimTeam: string | number;
  killerTeam?: string | number;
  classification: "opponent" | "friendly-fire" | "suicide";
  scoreDelta: number;
};

function makeEntry(ctx: StepContext, seq: number): DeathAuditEntry {
  const idFactory = createIdFactory(ctx);
  // Advance factory seq times
  for (let i = 0; i < seq; i++) {
    idFactory();
  }
  return {
    id: idFactory(),
    simNowMs: ctx.simNowMs,
    frameCount: ctx.frameCount,
    victimId: `robot-${seq}`,
    killerId: `killer-${seq}`,
    victimTeam: "red",
    killerTeam: "blue",
    classification: "opponent",
    scoreDelta: 1,
  };
}

describe("runtimeEventLog contract", () => {
  it("should respect capacity by dropping oldest entries", () => {
    const ctx = createTestStepContext({ frameCount: 1, simNowMs: 1000 });
    const log = createRuntimeEventLog({ capacity: 3 });

    log.append(makeEntry(ctx, 0));
    log.append(makeEntry(ctx, 1));
    log.append(makeEntry(ctx, 2));
    log.append(makeEntry(ctx, 3));

    expect(log.size()).toBe(3);
    const entries = log.read({ order: "oldest-first" });
    expect(entries[0].victimId).toBe("robot-1");
    expect(entries[2].victimId).toBe("robot-3");
  });

  it("should return newest-first ordering when requested", () => {
    const ctx = createTestStepContext({ frameCount: 2, simNowMs: 2000 });
    const log = createRuntimeEventLog({ capacity: 5 });

    for (let i = 0; i < 4; i++) {
      log.append(makeEntry(ctx, i));
    }

    const entries = log.read({ order: "newest-first" });
    expect(entries[0].victimId).toBe("robot-3");
    expect(entries[entries.length - 1].victimId).toBe("robot-0");
  });

  it("should clear entries deterministically", () => {
    const ctx = createTestStepContext({ frameCount: 3, simNowMs: 3000 });
    const log = createRuntimeEventLog({ capacity: 4 });

    log.append(makeEntry(ctx, 0));
    log.append(makeEntry(ctx, 1));
    expect(log.size()).toBe(2);

    log.clear();
    expect(log.size()).toBe(0);
    expect(log.read()).toHaveLength(0);

    log.append(makeEntry(ctx, 2));
    expect(log.size()).toBe(1);
  });
});
