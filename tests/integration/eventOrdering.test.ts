/**
 * Event ordering integration test.
 */

import { describe, it, expect } from "vitest";
import { simulateCombatSequence } from "../../src/tests/simulationHarness";

describe("event ordering", () => {
  it("should emit events in deterministic order", () => {
    const result = simulateCombatSequence({ seed: 777 });
    expect(result.eventOrder).toEqual([
      "weapon-fired",
      "hitscan-impact",
      "damage-applied",
      "death",
      "scoring",
    ]);
  });
});
