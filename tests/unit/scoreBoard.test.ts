/**
 * ScoreBoard canonicalization tests.
 */

import { describe, it, expect } from "vitest";
import { createScoreBoard, applyScoreDelta } from "../../src/ecs/scoreBoard";

describe("ScoreBoard", () => {
  it("should produce deterministic deltas", () => {
    const board = createScoreBoard();
    applyScoreDelta(board, { team: "red", delta: 1, simNowMs: 1000 });
    expect(board.scores.red).toBe(1);
    expect(board.lastUpdatedMs).toBe(1000);
  });
});
