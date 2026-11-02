import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { createBattleWorld } from "@/ecs/world";
import type { RobotEntity } from "@/ecs/worldTypes";
import type { MatchStateSnapshot } from "@/runtime/state/matchStateMachine";
import { useMatchSummaryTracker } from "@/runtime/state/useMatchSummary";
import { useTelemetryStore } from "@/state/telemetryStore";

function snapshot(
  overrides: Partial<MatchStateSnapshot> = {},
): MatchStateSnapshot {
  return {
    phase: "victory",
    elapsedMs: 90_000,
    restartTimerMs: 5000,
    winner: "red",
    isDraw: false,
    autoRestartEnabled: true,
    ...overrides,
  };
}

function addRobot(
  world: ReturnType<typeof createBattleWorld>,
  id: string,
  team: "red" | "blue",
  role: RobotEntity["role"],
) {
  world.robots.entities.push({
    id,
    team,
    role,
    health: 100,
  } as unknown as RobotEntity);
}

function recordKill() {
  const store = useTelemetryStore.getState();
  store.recordEvent({
    type: "spawn",
    timestampMs: 0,
    sequenceId: 1,
    entityId: "red-1",
    teamId: "red",
  });
  store.recordEvent({
    type: "spawn",
    timestampMs: 0,
    sequenceId: 2,
    entityId: "blue-1",
    teamId: "blue",
  });
  store.recordEvent({
    type: "damage",
    timestampMs: 1000,
    sequenceId: 3,
    attackerId: "red-1",
    targetId: "blue-1",
    teamId: "red",
    amount: 80,
  });
  store.recordEvent({
    type: "death",
    timestampMs: 2000,
    sequenceId: 4,
    entityId: "blue-1",
    teamId: "blue",
    attackerId: "red-1",
  });
}

function setup() {
  const world = createBattleWorld();
  addRobot(world, "red-1", "red", "assault");
  addRobot(world, "blue-1", "blue", "medic");
  recordKill();
  return renderHook(() => useMatchSummaryTracker(world));
}

describe("useMatchSummaryTracker (#170)", () => {
  beforeEach(() => {
    useTelemetryStore.getState().reset("test-match");
  });

  it("captures the summary and series once the match ends", () => {
    const { result } = setup();

    act(() => result.current.trackSnapshot(snapshot()));

    expect(result.current.summary?.winner).toBe("red");
    expect(result.current.summary?.durationMs).toBe(90_000);
    expect(result.current.summary?.mvp?.id).toBe("red-1");
    expect(result.current.summary?.teams.blue.deaths).toBe(1);
    expect(result.current.series).toEqual({
      red: 1,
      blue: 0,
      draws: 0,
      rounds: 1,
    });
  });

  it("does not count re-emitted victory snapshots twice", () => {
    const { result } = setup();

    let firstRecord = false;
    let secondRecord = true;
    act(() => {
      firstRecord = result.current.trackSnapshot(snapshot());
    });
    act(() => {
      secondRecord = result.current.trackSnapshot(
        snapshot({ restartTimerMs: 4000 }),
      );
    });
    act(() => result.current.trackSnapshot(snapshot({ restartTimerMs: null })));

    // Only the first victory snapshot counts, so callers open the summary once.
    expect(firstRecord).toBe(true);
    expect(secondRecord).toBe(false);
    expect(result.current.series.rounds).toBe(1);
    expect(result.current.series.red).toBe(1);
  });

  it("ignores running snapshots but counts the next round", () => {
    const { result } = setup();

    act(() => result.current.trackSnapshot(snapshot({ phase: "running" })));
    expect(result.current.summary).toBeNull();
    expect(result.current.series.rounds).toBe(0);

    act(() => result.current.trackSnapshot(snapshot()));
    // The next round restarts, then ends with the other team winning.
    act(() => result.current.trackSnapshot(snapshot({ phase: "running" })));
    act(() =>
      result.current.trackSnapshot(snapshot({ winner: "blue", isDraw: false })),
    );

    expect(result.current.series).toEqual({
      red: 1,
      blue: 1,
      draws: 0,
      rounds: 2,
    });
    expect(result.current.summary?.winner).toBe("blue");
  });

  it("counts a draw as a round without a winner", () => {
    const { result } = setup();

    act(() =>
      result.current.trackSnapshot(snapshot({ winner: null, isDraw: true })),
    );

    expect(result.current.series).toEqual({
      red: 0,
      blue: 0,
      draws: 1,
      rounds: 1,
    });
    expect(result.current.summary?.isDraw).toBe(true);
    expect(result.current.summary?.mvp?.id).toBe("red-1");
  });

  it("clears the series without dropping the last summary", () => {
    const { result } = setup();

    act(() => result.current.trackSnapshot(snapshot()));
    act(() => result.current.resetSeries());

    expect(result.current.series.rounds).toBe(0);
    expect(result.current.summary?.winner).toBe("red");
  });
});
