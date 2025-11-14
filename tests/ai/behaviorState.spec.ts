import { describe, expect, it } from "vitest";
import {
  nextBehaviorState,
  RobotBehaviorContext,
  RobotBehaviorMode,
  RobotBehaviorSnapshot,
} from "../../src/simulation/ai/behaviorState";

function evaluate(
  snapshot: Partial<RobotBehaviorSnapshot>,
  context: Partial<RobotBehaviorContext>,
): RobotBehaviorMode {
  const fullSnapshot: RobotBehaviorSnapshot = {
    health: 100,
    maxHealth: 100,
    mode: RobotBehaviorMode.Seek,
    ...snapshot,
  };

  const fullContext: RobotBehaviorContext = {
    targetDistance: null,
    anchorDistance: 10,
    rng: () => 0.5,
    ...context,
  };

  return nextBehaviorState(fullSnapshot, fullContext);
}

describe("nextBehaviorState", () => {
  it("returns seek when no target is available", () => {
    const result = evaluate(
      { mode: RobotBehaviorMode.Engage },
      { targetDistance: null },
    );
    expect(result).toBe(RobotBehaviorMode.Seek);
  });

  it("engages when within range", () => {
    const result = evaluate(
      { mode: RobotBehaviorMode.Seek },
      { targetDistance: 8, anchorDistance: 20 },
    );
    expect(result).toBe(RobotBehaviorMode.Engage);
  });

  it("retreats when low health and threatened", () => {
    const result = evaluate(
      { health: 20, maxHealth: 100, mode: RobotBehaviorMode.Engage },
      { targetDistance: 6, anchorDistance: 20 },
    );
    expect(result).toBe(RobotBehaviorMode.Retreat);
  });

  it("switches back to engage once safely anchored", () => {
    const result = evaluate(
      { health: 20, maxHealth: 100, mode: RobotBehaviorMode.Retreat },
      { targetDistance: 6, anchorDistance: 2 },
    );
    expect(result).toBe(RobotBehaviorMode.Engage);
  });

  it("uses rng when exactly on the engage boundary", () => {
    const engage = evaluate(
      {},
      {
        targetDistance: 18,
        rng: () => 0.75,
      },
    );
    const seek = evaluate(
      {},
      {
        targetDistance: 18,
        rng: () => 0.25,
      },
    );

    expect(engage).toBe(RobotBehaviorMode.Engage);
    expect(seek).toBe(RobotBehaviorMode.Seek);
  });
});
