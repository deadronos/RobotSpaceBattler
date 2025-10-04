/**
 * Contract test for ScoringSystem
 * 
 * Verifies:
 * - Classification of deaths (opponent, friendly-fire, suicide)
 * - Score delta calculations
 * - Runtime event log ordering and determinism
 * 
 * This test is written FIRST (TDD) and should FAIL until implementation is complete.
 */

import { describe, it, expect } from "vitest";
import { scoringSystem as scoringSystemModule } from "../../src/systems/ScoringSystem";
import {
  createIdFactory,
  createTestDriver,
  createTestStepContext,
} from "../helpers/fixedStepHarness";

type StepContext = ReturnType<typeof createTestStepContext>;

type DeathEvent = {
  victimId: string;
  killerId?: string;
  victimTeam: string | number;
  killerTeam?: string | number;
  damageSource: string;
  simNowMs: number;
  frameCount: number;
};

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

type ScoreBoard = {
  scores: Record<string, number>;
  lastUpdatedMs: number;
};

const scoringSystem = scoringSystemModule as unknown as (params: {
  deathEvents: DeathEvent[];
  stepContext: StepContext;
  runtimeEventLog: { append: (entry: DeathAuditEntry) => void };
  scoreBoard: ScoreBoard;
  idFactory: () => string;
}) => void;

function createRuntimeEventLog() {
  const entries: DeathAuditEntry[] = [];
  return {
    append(entry: DeathAuditEntry) {
      entries.push(entry);
    },
    read() {
      return entries;
    },
  };
}

function createScoreBoard(): ScoreBoard {
  return {
    scores: { red: 0, blue: 0 },
    lastUpdatedMs: 0,
  };
}

function runScoringSystem(
  ctx: StepContext,
  events: DeathEvent[]
): {
  auditEntries: DeathAuditEntry[];
  scoreBoard: ScoreBoard;
} {
  const runtimeEventLog = createRuntimeEventLog();
  const scoreBoard = createScoreBoard();
  const idFactory = createIdFactory(ctx);

  scoringSystem({
    deathEvents: events,
    stepContext: ctx,
    runtimeEventLog,
    scoreBoard,
    idFactory,
  });

  return { auditEntries: runtimeEventLog.read(), scoreBoard };
}

describe("ScoringSystem Contract", () => {
  it("should classify opponent kill correctly", () => {
    const ctx = createTestStepContext({ frameCount: 1, simNowMs: 1000 });

    const deathEvent: DeathEvent = {
      victimId: "robot-1",
      killerId: "robot-2",
      victimTeam: "red",
      killerTeam: "blue",
      damageSource: "laser-gun",
      simNowMs: ctx.simNowMs,
      frameCount: ctx.frameCount,
    };

    const result = runScoringSystem(ctx, [deathEvent]);

    expect(result.auditEntries).toHaveLength(1);
    expect(result.auditEntries[0].classification).toBe("opponent");
    expect(result.auditEntries[0].scoreDelta).toBe(1);
    expect(result.scoreBoard.scores.blue).toBe(1);
  });

  it("should classify friendly-fire kill correctly", () => {
    const ctx = createTestStepContext({ frameCount: 2, simNowMs: 2000 });

    const deathEvent: DeathEvent = {
      victimId: "robot-3",
      killerId: "robot-4",
      victimTeam: "red",
      killerTeam: "red",
      damageSource: "rocket",
      simNowMs: ctx.simNowMs,
      frameCount: ctx.frameCount,
    };

    const result = runScoringSystem(ctx, [deathEvent]);

    expect(result.auditEntries).toHaveLength(1);
    expect(result.auditEntries[0].classification).toBe("friendly-fire");
    expect(result.auditEntries[0].scoreDelta).toBe(-1);
    expect(result.scoreBoard.scores.red).toBe(-1);
  });

  it("should classify suicide correctly", () => {
    const ctx = createTestStepContext({ frameCount: 3, simNowMs: 3000 });

    const deathEvent: DeathEvent = {
      victimId: "robot-5",
      killerId: "robot-5",
      victimTeam: "blue",
      killerTeam: "blue",
      damageSource: "self-destruct",
      simNowMs: ctx.simNowMs,
      frameCount: ctx.frameCount,
    };

    const result = runScoringSystem(ctx, [deathEvent]);

    expect(result.auditEntries).toHaveLength(1);
    expect(result.auditEntries[0].classification).toBe("suicide");
    expect(result.auditEntries[0].scoreDelta).toBe(-1);
    expect(result.scoreBoard.scores.blue).toBe(-1);
  });

  it("should process multiple deaths in deterministic order", () => {
    const ctx = createTestStepContext({ frameCount: 4, simNowMs: 4000 });

    const deaths: DeathEvent[] = [
      {
        victimId: "robot-6",
        killerId: "robot-7",
        victimTeam: "red",
        killerTeam: "blue",
        damageSource: "laser",
        simNowMs: ctx.simNowMs,
        frameCount: ctx.frameCount,
      },
      {
        victimId: "robot-8",
        killerId: "robot-9",
        victimTeam: "blue",
        killerTeam: "red",
        damageSource: "gun",
        simNowMs: ctx.simNowMs,
        frameCount: ctx.frameCount,
      },
    ];

    const result = runScoringSystem(ctx, deaths);

    expect(result.auditEntries).toHaveLength(2);
    // Verify deterministic ordering (should match input order or documented sort)
    expect(result.auditEntries[0].victimId).toBe("robot-6");
    expect(result.auditEntries[1].victimId).toBe("robot-8");
  });

  it("should generate deterministic audit entry IDs", () => {
    const driver = createTestDriver();
    const ctx1 = driver.stepOnce();
    const ctx2 = driver.stepOnce();

    const death1: DeathEvent = {
      victimId: "robot-10",
      killerId: "robot-11",
      victimTeam: "red",
      killerTeam: "blue",
      damageSource: "laser",
      simNowMs: ctx1.simNowMs,
      frameCount: ctx1.frameCount,
    };

    const death2: DeathEvent = {
      victimId: "robot-12",
      killerId: "robot-13",
      victimTeam: "blue",
      killerTeam: "red",
      damageSource: "gun",
      simNowMs: ctx2.simNowMs,
      frameCount: ctx2.frameCount,
    };

    const result1 = runScoringSystem(ctx1, [death1]);
    const result2 = runScoringSystem(ctx2, [death2]);

    // IDs should follow deterministic pattern: "{frameCount}-{simNowMs}-{seq}"
    expect(result1.auditEntries[0].id).toMatch(/^\d+-\d+-\d+$/);
    expect(result2.auditEntries[0].id).toMatch(/^\d+-\d+-\d+$/);
    expect(result1.auditEntries[0].id).not.toBe(result2.auditEntries[0].id);
  });

  it("should handle deaths with missing killer (environmental)", () => {
    const ctx = createTestStepContext({ frameCount: 5, simNowMs: 5000 });

    const deathEvent: DeathEvent = {
      victimId: "robot-14",
      victimTeam: "red",
      damageSource: "out-of-bounds",
      simNowMs: ctx.simNowMs,
      frameCount: ctx.frameCount,
    };

    const result = runScoringSystem(ctx, [deathEvent]);

    expect(result.auditEntries).toHaveLength(1);
    expect(result.auditEntries[0].killerId).toBeUndefined();
    // Environmental deaths should not award points
    expect(result.auditEntries[0].scoreDelta).toBe(0);
  });

  it("should use StepContext.simNowMs for all timestamps", () => {
    const ctx = createTestStepContext({ frameCount: 6, simNowMs: 6000 });

    const deathEvent: DeathEvent = {
      victimId: "robot-15",
      killerId: "robot-16",
      victimTeam: "red",
      killerTeam: "blue",
      damageSource: "laser",
      simNowMs: ctx.simNowMs,
      frameCount: ctx.frameCount,
    };

    const result = runScoringSystem(ctx, [deathEvent]);

    expect(result.auditEntries[0].simNowMs).toBe(ctx.simNowMs);
    expect(result.auditEntries[0].frameCount).toBe(ctx.frameCount);
    });
  });
