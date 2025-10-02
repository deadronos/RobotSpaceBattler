import { describe, expect, it } from "vitest";
import {
  calculateBackOffVelocity,
  calculateFleeVelocity,
  calculateWanderVelocity,
  decideEngageAction,
  decideFleeAction,
  decideIdleAction,
  decidePatrolAction,
  isTooClose,
  shouldFlee,
  shouldStopFleeing,
  type AIContext,
} from "../src/systems/ai/decisions";
import { createSeededRng } from "../src/utils/seededRng";

describe("AI Decision Helpers", () => {
  const baseContext: AIContext = {
    now: 1000,
    hp: 100,
    maxHp: 100,
    weaponRange: 10,
    speed: 3,
  };

  describe("shouldFlee", () => {
    it("returns true when HP is below 25%", () => {
      expect(shouldFlee(24, 100)).toBe(true);
      expect(shouldFlee(20, 100)).toBe(true);
      expect(shouldFlee(0, 100)).toBe(true);
    });

    it("returns false when HP is at or above 25%", () => {
      expect(shouldFlee(25, 100)).toBe(false);
      expect(shouldFlee(50, 100)).toBe(false);
      expect(shouldFlee(100, 100)).toBe(false);
    });
  });

  describe("shouldStopFleeing", () => {
    it("returns true when HP is above 50%", () => {
      expect(shouldStopFleeing(51, 100)).toBe(true);
      expect(shouldStopFleeing(75, 100)).toBe(true);
      expect(shouldStopFleeing(100, 100)).toBe(true);
    });

    it("returns false when HP is at or below 50%", () => {
      expect(shouldStopFleeing(50, 100)).toBe(false);
      expect(shouldStopFleeing(25, 100)).toBe(false);
      expect(shouldStopFleeing(0, 100)).toBe(false);
    });
  });

  describe("isTooClose", () => {
    it("returns true when within half weapon range", () => {
      const selfPos: [number, number, number] = [0, 0, 0];
      const targetPos: [number, number, number] = [4, 0, 0];
      expect(isTooClose(selfPos, targetPos, 10)).toBe(true); // 4 < 5
    });

    it("returns false when beyond half weapon range", () => {
      const selfPos: [number, number, number] = [0, 0, 0];
      const targetPos: [number, number, number] = [6, 0, 0];
      expect(isTooClose(selfPos, targetPos, 10)).toBe(false); // 6 > 5
    });

    it("calculates distance correctly in 3D space", () => {
      const selfPos: [number, number, number] = [0, 0, 0];
      const targetPos: [number, number, number] = [3, 0, 4]; // dist = 5
      expect(isTooClose(selfPos, targetPos, 12)).toBe(true); // 5 < 6
    });
  });

  describe("calculateBackOffVelocity", () => {
    it("calculates velocity away from target", () => {
      const selfPos: [number, number, number] = [0, 0, 0];
      const targetPos: [number, number, number] = [5, 0, 0];
      const vel = calculateBackOffVelocity(selfPos, targetPos, 3);

      expect(vel.x).toBeCloseTo(-3);
      expect(vel.y).toBe(0);
      expect(vel.z).toBeCloseTo(0);
    });

    it("handles normalized direction correctly", () => {
      const selfPos: [number, number, number] = [0, 0, 0];
      const targetPos: [number, number, number] = [3, 0, 4]; // dist = 5
      const vel = calculateBackOffVelocity(selfPos, targetPos, 5);

      expect(vel.x).toBeCloseTo(-3); // -3/5 * 5
      expect(vel.y).toBe(0);
      expect(vel.z).toBeCloseTo(-4); // -4/5 * 5
    });
  });

  describe("calculateFleeVelocity", () => {
    it("flees away from target when target is provided", () => {
      const selfPos: [number, number, number] = [0, 0, 0];
      const targetPos: [number, number, number] = [5, 0, 0];
      const rng = createSeededRng(1);

      const vel = calculateFleeVelocity(selfPos, targetPos, 3, rng);

      expect(vel.x).toBeCloseTo(-3);
      expect(vel.y).toBe(0);
      expect(vel.z).toBeCloseTo(0);
    });

    it("flees in random direction when no target", () => {
      const selfPos: [number, number, number] = [0, 0, 0];
      const rng = createSeededRng(42);

      const vel = calculateFleeVelocity(selfPos, undefined, 3, rng);

      // Should produce some velocity (not zero)
      const magnitude = Math.hypot(vel.x, vel.z);
      expect(magnitude).toBeCloseTo(3);
      expect(vel.y).toBe(0);
    });

    it("produces deterministic random velocity with seeded RNG", () => {
      const selfPos: [number, number, number] = [0, 0, 0];
      const rng1 = createSeededRng(123);
      const rng2 = createSeededRng(123);

      const vel1 = calculateFleeVelocity(selfPos, undefined, 3, rng1);
      const vel2 = calculateFleeVelocity(selfPos, undefined, 3, rng2);

      expect(vel1.x).toBeCloseTo(vel2.x);
      expect(vel1.z).toBeCloseTo(vel2.z);
    });
  });

  describe("calculateWanderVelocity", () => {
    it("produces velocity with correct magnitude", () => {
      const rng = createSeededRng(1);
      const vel = calculateWanderVelocity(3, rng, 0.5);

      const magnitude = Math.hypot(vel.x, vel.z);
      expect(magnitude).toBeCloseTo(1.5); // 3 * 0.5
      expect(vel.y).toBe(0);
    });

    it("produces deterministic results with seeded RNG", () => {
      const rng1 = createSeededRng(456);
      const rng2 = createSeededRng(456);

      const vel1 = calculateWanderVelocity(3, rng1);
      const vel2 = calculateWanderVelocity(3, rng2);

      expect(vel1.x).toBeCloseTo(vel2.x);
      expect(vel1.z).toBeCloseTo(vel2.z);
    });
  });

  describe("decideIdleAction", () => {
    it("transitions to engage when target is visible", () => {
      const rng = createSeededRng(1);
      const target = { id: 42, position: [5, 0, 0] as [number, number, number] };

      const decision = decideIdleAction(
        baseContext,
        true,
        true,
        target,
        1000,
        rng,
      );

      expect(decision.nextState).toBe("engage");
      expect(decision.stateSince).toBe(baseContext.now);
      expect(decision.targetId).toBe(42);
    });

    it("does not engage if target is not visible", () => {
      const rng = createSeededRng(1);
      const target = { id: 42, position: [5, 0, 0] as [number, number, number] };

      const decision = decideIdleAction(
        baseContext,
        true,
        false, // no LOS
        target,
        1000,
        rng,
      );

      expect(decision.nextState).toBeUndefined();
    });

    it("randomly transitions to patrol", () => {
      const rng = createSeededRng(1);
      let patrolCount = 0;

      // Run multiple times to check probability
      for (let i = 0; i < 1000; i++) {
        const testRng = createSeededRng(i);
        const decision = decideIdleAction(
          baseContext,
          false,
          false,
          undefined,
          1000,
          testRng,
        );
        if (decision.nextState === "patrol") patrolCount++;
      }

      // Should be roughly 2% (20 out of 1000)
      expect(patrolCount).toBeGreaterThan(5);
      expect(patrolCount).toBeLessThan(40);
    });
  });

  describe("decidePatrolAction", () => {
    it("transitions to engage when target is visible", () => {
      const rng = createSeededRng(1);
      const target = { id: 42, position: [5, 0, 0] as [number, number, number] };

      const decision = decidePatrolAction(
        baseContext,
        true,
        true,
        target,
        1000,
        rng,
      );

      expect(decision.nextState).toBe("engage");
      expect(decision.targetId).toBe(42);
    });

    it("transitions to idle after timeout", () => {
      const rng = createSeededRng(1);
      const context = { ...baseContext, now: 5000 };

      const decision = decidePatrolAction(
        context,
        false,
        false,
        undefined,
        1000, // started at 1000, now is 5000 (> 3s)
        rng,
      );

      expect(decision.nextState).toBe("idle");
      expect(decision.stateSince).toBe(5000);
    });

    it("continues patrolling with wander velocity", () => {
      const rng = createSeededRng(1);

      const decision = decidePatrolAction(
        baseContext,
        false,
        false,
        undefined,
        900, // started recently
        rng,
      );

      expect(decision.nextState).toBeUndefined();
      expect(decision.velocity).toBeDefined();
      expect(decision.velocity?.y).toBe(0);
    });
  });

  describe("decideEngageAction", () => {
    const selfPos: [number, number, number] = [0, 0, 0];

    it("transitions to idle when no target", () => {
      const rng = createSeededRng(1);

      const decision = decideEngageAction(
        baseContext,
        false,
        false,
        undefined,
        selfPos,
        rng,
      );

      expect(decision.nextState).toBe("idle");
      expect(decision.shouldFire).toBe(false);
      expect(decision.targetId).toBeUndefined();
    });

    it("stops firing when LOS is lost", () => {
      const rng = createSeededRng(1);
      const target = { id: 42, position: [5, 0, 0] as [number, number, number] };

      const decision = decideEngageAction(
        baseContext,
        true,
        false, // no LOS
        target,
        selfPos,
        rng,
      );

      expect(decision.shouldFire).toBe(false);
      expect(decision.targetId).toBeUndefined();
      expect(decision.velocity).toBeDefined();
    });

    it("fires at target when visible", () => {
      const rng = createSeededRng(1);
      const target = { id: 42, position: [8, 0, 0] as [number, number, number] };

      const decision = decideEngageAction(
        baseContext,
        true,
        true,
        target,
        selfPos,
        rng,
      );

      expect(decision.shouldFire).toBe(true);
      expect(decision.targetId).toBe(42);
    });

    it("backs off when too close to target", () => {
      const rng = createSeededRng(1);
      const target = { id: 42, position: [3, 0, 0] as [number, number, number] }; // within half range

      const decision = decideEngageAction(
        baseContext,
        true,
        true,
        target,
        selfPos,
        rng,
      );

      expect(decision.shouldFire).toBe(true);
      expect(decision.velocity).toBeDefined();
      expect(decision.velocity!.x).toBeLessThan(0); // backing off (negative x)
    });
  });

  describe("decideFleeAction", () => {
    const selfPos: [number, number, number] = [0, 0, 0];

    it("transitions to idle when health recovered", () => {
      const rng = createSeededRng(1);
      const context = { ...baseContext, hp: 60 }; // > 50%

      const decision = decideFleeAction(context, undefined, selfPos, rng);

      expect(decision.nextState).toBe("idle");
      expect(decision.stateSince).toBe(context.now);
    });

    it("continues fleeing with low health", () => {
      const rng = createSeededRng(1);
      const context = { ...baseContext, hp: 20 }; // < 50%
      const target = { id: 42, position: [5, 0, 0] as [number, number, number] };

      const decision = decideFleeAction(context, target, selfPos, rng);

      expect(decision.shouldFire).toBe(false);
      expect(decision.velocity).toBeDefined();
      expect(decision.velocity!.x).toBeLessThan(0); // fleeing away
    });

    it("flees in random direction when no target", () => {
      const rng = createSeededRng(1);
      const context = { ...baseContext, hp: 20 };

      const decision = decideFleeAction(context, undefined, selfPos, rng);

      expect(decision.shouldFire).toBe(false);
      expect(decision.velocity).toBeDefined();
      expect(decision.nextState).toBeUndefined();
    });
  });
});
