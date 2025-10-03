/**
 * ID & Team canonicalization tests.
 */

import { describe, it, expect } from "vitest";
import { normalizeTeam, ensureGameplayId } from "../../src/ecs/id";

describe("ID and Team normalization", () => {
  it("should normalize team values to 'red'|'blue'", () => {
    expect(normalizeTeam("RED")).toBe("red");
    expect(normalizeTeam("blue")).toBe("blue");
    expect(() => normalizeTeam("green" as any)).toThrow();
  });

  it("should ensure gameplay ids are strings", () => {
    expect(ensureGameplayId(123)).toBe("123");
    expect(ensureGameplayId("robot-1")).toBe("robot-1");
  });
});
