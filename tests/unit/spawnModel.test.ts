/**
 * Spawn model canonicalization tests.
 */

import { describe, it, expect } from "vitest";
import { createSpawnQueue } from "../../src/ecs/spawnModel";

describe("Spawn model", () => {
  it("should enforce queue capacity defaults", () => {
    const queue = createSpawnQueue({ zoneId: "zone-1" });
    expect(queue.maxPerZone).toBe(3);
    expect(queue.requests).toEqual([]);
  });
});
