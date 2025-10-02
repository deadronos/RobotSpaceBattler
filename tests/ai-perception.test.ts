import { beforeEach, describe, expect, it } from "vitest";
import { createRobotEntity, resetWorld, world } from "../src/ecs/miniplexStore";
import {
  canSeeTarget,
  getDistanceSquared,
  isInRange,
  type PerceptionContext,
} from "../src/systems/ai/perception";

describe("AI Perception Helpers", () => {
  beforeEach(() => {
    resetWorld();
  });

  const perceptionContext: PerceptionContext = {
    world,
    rapierWorld: undefined,
  };

  describe("isInRange", () => {
    it("returns true when target is within range", () => {
      const self = createRobotEntity({ position: [0, 0, 0] });
      const target = createRobotEntity({ position: [5, 0, 0] });

      expect(isInRange(self, target, 10)).toBe(true);
    });

    it("returns false when target is beyond range", () => {
      const self = createRobotEntity({ position: [0, 0, 0] });
      const target = createRobotEntity({ position: [15, 0, 0] });

      expect(isInRange(self, target, 10)).toBe(false);
    });

    it("returns true when target is exactly at range", () => {
      const self = createRobotEntity({ position: [0, 0, 0] });
      const target = createRobotEntity({ position: [10, 0, 0] });

      expect(isInRange(self, target, 10)).toBe(true);
    });

    it("calculates 3D distance correctly", () => {
      const self = createRobotEntity({ position: [0, 0, 0] });
      const target = createRobotEntity({ position: [3, 0, 4] }); // dist = 5

      expect(isInRange(self, target, 5)).toBe(true);
      expect(isInRange(self, target, 4.9)).toBe(false);
    });

    it("returns false if self has no position", () => {
      const self = createRobotEntity({});
      self.position = undefined;
      const target = createRobotEntity({ position: [5, 0, 0] });

      expect(isInRange(self, target, 10)).toBe(false);
    });

    it("returns false if target has no position", () => {
      const self = createRobotEntity({ position: [0, 0, 0] });
      const target = createRobotEntity({});
      target.position = undefined;

      expect(isInRange(self, target, 10)).toBe(false);
    });

    it("returns false if target is undefined", () => {
      const self = createRobotEntity({ position: [0, 0, 0] });

      expect(isInRange(self, undefined, 10)).toBe(false);
    });
  });

  describe("getDistanceSquared", () => {
    it("calculates distance squared correctly", () => {
      const self = createRobotEntity({ position: [0, 0, 0] });
      const target = createRobotEntity({ position: [3, 0, 4] });

      expect(getDistanceSquared(self, target)).toBe(25); // 3^2 + 4^2
    });

    it("returns 0 for same position", () => {
      const self = createRobotEntity({ position: [5, 1, 3] });
      const target = createRobotEntity({ position: [5, 1, 3] });

      expect(getDistanceSquared(self, target)).toBe(0);
    });

    it("returns Infinity if self has no position", () => {
      const self = createRobotEntity({});
      self.position = undefined;
      const target = createRobotEntity({ position: [5, 0, 0] });

      expect(getDistanceSquared(self, target)).toBe(Infinity);
    });

    it("returns Infinity if target has no position", () => {
      const self = createRobotEntity({ position: [0, 0, 0] });
      const target = createRobotEntity({});
      target.position = undefined;

      expect(getDistanceSquared(self, target)).toBe(Infinity);
    });

    it("returns Infinity if target is undefined", () => {
      const self = createRobotEntity({ position: [0, 0, 0] });

      expect(getDistanceSquared(self, undefined)).toBe(Infinity);
    });
  });

  describe("canSeeTarget", () => {
    it("returns false if self has no position", () => {
      const self = createRobotEntity({});
      self.position = undefined;
      const target = createRobotEntity({ position: [5, 0, 0] });

      expect(canSeeTarget(self, target, 10, perceptionContext)).toBe(false);
    });

    it("returns false if target is undefined", () => {
      const self = createRobotEntity({ position: [0, 0, 0] });

      expect(canSeeTarget(self, undefined, 10, perceptionContext)).toBe(false);
    });

    it("returns false if target is beyond range", () => {
      const self = createRobotEntity({ position: [0, 0, 0] });
      const target = createRobotEntity({ position: [15, 0, 0] });

      expect(canSeeTarget(self, target, 10, perceptionContext)).toBe(false);
    });

    it("returns true if target is within range and not occluded", () => {
      const self = createRobotEntity({ position: [0, 0, 0] });
      const target = createRobotEntity({ position: [5, 0, 0] });

      expect(canSeeTarget(self, target, 10, perceptionContext)).toBe(true);
    });

    it("returns false if target is occluded by another entity", () => {
      const self = createRobotEntity({ position: [0, 0, 0] });
      const target = createRobotEntity({ position: [10, 0, 0] });
      // Occluder between self and target
      createRobotEntity({ position: [5, 0, 0] });

      expect(canSeeTarget(self, target, 15, perceptionContext)).toBe(false);
    });

    it("returns true if no entities occlude the line of sight", () => {
      const self = createRobotEntity({ position: [0, 0, 0] });
      const target = createRobotEntity({ position: [10, 0, 0] });
      // Other entities not in the way
      createRobotEntity({ position: [5, 5, 0] });
      createRobotEntity({ position: [5, -5, 0] });

      expect(canSeeTarget(self, target, 15, perceptionContext)).toBe(true);
    });
  });
});
