/**
 * Spawn placement integration tests.
 */

import { describe, it, expect } from "vitest";
import { computeSpawnPlacement } from "../../src/utils/spawnPlacement";
import { createTestStepContext } from "../helpers/fixedStepHarness";

describe("spawn placement heuristics", () => {
  it("should enforce minimum distance from enemies", () => {
    const ctx = createTestStepContext({ simNowMs: 1000 });
    const placement = computeSpawnPlacement({
      enemies: [
        { position: { x: 0, y: 0, z: 0 } },
        { position: { x: 10, y: 0, z: 0 } },
      ],
      spawnZones: [
        {
          id: "zone-1",
          team: "red",
          spawnPoints: [
            { id: "p1", position: { x: 1, y: 0, z: 0 } },
            { id: "p2", position: { x: 5, y: 0, z: 0 } },
          ],
        },
      ],
      minSpawnDistance: 3,
      stepContext: ctx,
    });

    expect(placement.position.x).toBeGreaterThanOrEqual(3);
  });
});
