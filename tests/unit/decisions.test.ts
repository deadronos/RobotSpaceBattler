import { describe, it, expect } from "vitest";
import {
  decideIdleAction,
  decidePatrolAction,
  decideEngageAction,
} from "../../src/systems/ai/decisions";

// Minimal AI context helper
const baseContext = {
  now: 1000,
  hp: 50,
  maxHp: 100,
  weaponRange: 10,
  speed: 3,
};

const rng = () => 0.5;

describe("AI decision functions - missing gameplay id handling", () => {
  it("decideIdleAction should not throw when target has no gameplay id and should not transition to engage", () => {
    const target = { position: [0, 0, 0] } as any; // no id/gameplayId
    const decision = decideIdleAction(baseContext, true, true, target, 0, rng);
    expect(decision.nextState).not.toBe("engage");
    expect(decision.targetId).toBeUndefined();
  });

  it("decidePatrolAction should not throw when target has no gameplay id and should not transition to engage", () => {
    const target = { position: [0, 0, 0] } as any; // no id/gameplayId
    const decision = decidePatrolAction(baseContext, true, true, target, 0, rng);
    expect(decision.nextState).not.toBe("engage");
    expect(decision.targetId).toBeUndefined();
  });

  it("decideEngageAction should fallback to idle/stop firing when target has no gameplay id", () => {
    const target = { position: [0, 0, 0] } as any; // no id/gameplayId
    const decision = decideEngageAction(baseContext, true, true, target, [0, 0, 0], rng);
    expect(decision.nextState).toBe("idle");
    expect(decision.shouldFire).toBe(false);
    expect(decision.targetId).toBeUndefined();
  });

  it("decisions should set targetId when target has a gameplayId property", () => {
    const target = { position: [0, 0, 0], gameplayId: "enemy-1" } as any;
    const idleDecision = decideIdleAction(baseContext, true, true, target, 0, rng);
    expect(idleDecision.nextState).toBe("engage");
    expect(idleDecision.targetId).toBe("enemy-1");

    const engageDecision = decideEngageAction(baseContext, true, true, target, [0, 0, 0], rng);
    expect(engageDecision.shouldFire).toBe(true);
    expect(engageDecision.targetId).toBe("enemy-1");
  });
});
