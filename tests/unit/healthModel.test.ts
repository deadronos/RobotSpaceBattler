/**
 * Health model canonicalization tests.
 */

import { describe, it, expect } from "vitest";
import { createHealth, applyDamage } from "../../src/ecs/health";

describe("Health model", () => {
  it("should create canonical health objects", () => {
    const health = createHealth({ current: 50, max: 100 });
    expect(health).toEqual({ current: 50, max: 100, alive: true });
  });

  it("should update alive flag deterministically", () => {
    const health = createHealth({ current: 10, max: 10 });
    const updated = applyDamage(health, 15);
    expect(updated.alive).toBe(false);
    expect(updated.current).toBe(0);
  });
});
