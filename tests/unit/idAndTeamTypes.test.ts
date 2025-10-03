/**
 * ID & Team canonicalization tests.
 */

import { describe, it, expect } from "vitest";
import { normalizeTeam, ensureGameplayId } from "../../src/ecs/id";
import { createRobotEntity, resetWorld, ensureAllGameplayIds } from "../../src/ecs/miniplexStore";

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

  it('createRobotEntity and ensureAllGameplayIds produce string gameplayId', () => {
    // Reset world state for test isolation
    resetWorld();

    // Create a robot entity; factory should assign gameplayId string
    const e = createRobotEntity({});
    expect(typeof e.gameplayId).toBe('string');

    // Force a scenario where gameplayId is missing and ensureAllGameplayIds migrates
    const raw = createRobotEntity({});
    raw.gameplayId = undefined as any;
    expect(raw.gameplayId).toBeUndefined();
    ensureAllGameplayIds();
    expect(typeof raw.gameplayId).toBe('string');
  });
});
