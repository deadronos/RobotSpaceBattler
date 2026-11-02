// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  EMPTY_SERIES,
  isSeriesEmpty,
  recordRound,
  seriesLeader,
} from "../../src/runtime/state/seriesScore";

describe("series score (#170)", () => {
  it("starts empty", () => {
    expect(EMPTY_SERIES).toEqual({ red: 0, blue: 0, draws: 0, rounds: 0 });
    expect(isSeriesEmpty(EMPTY_SERIES)).toBe(true);
  });

  it("counts wins and draws without mutating the input", () => {
    let series = recordRound(EMPTY_SERIES, "red", false);
    series = recordRound(series, "blue", false);
    series = recordRound(series, null, true);

    expect(series).toEqual({ red: 1, blue: 1, draws: 1, rounds: 3 });
    expect(EMPTY_SERIES).toEqual({ red: 0, blue: 0, draws: 0, rounds: 0 });
    expect(isSeriesEmpty(series)).toBe(false);
  });

  it("ignores a round without a result", () => {
    expect(recordRound(EMPTY_SERIES, null, false)).toBe(EMPTY_SERIES);
  });

  it("reports the leader only when the series is not level", () => {
    expect(seriesLeader(EMPTY_SERIES)).toBeNull();
    expect(seriesLeader({ red: 2, blue: 2, draws: 1, rounds: 5 })).toBeNull();
    expect(seriesLeader({ red: 3, blue: 2, draws: 0, rounds: 5 })).toBe("red");
    expect(seriesLeader({ red: 1, blue: 4, draws: 0, rounds: 5 })).toBe("blue");
  });
});
