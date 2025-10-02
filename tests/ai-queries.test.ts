import { beforeEach, describe, expect, it } from "vitest";
import { createRobotEntity, resetWorld, world } from "../src/ecs/miniplexStore";
import { findNearestEnemy, queryEnemies } from "../src/systems/ai/queries";

describe("AI Query Helpers", () => {
  beforeEach(() => {
    resetWorld();
  });

  describe("queryEnemies", () => {
    it("returns empty array if self has no position", () => {
      const self = createRobotEntity({ team: "red" });
      self.position = undefined;

      const enemies = queryEnemies(world, self);
      expect(enemies).toEqual([]);
    });

    it("returns empty array if self has no team", () => {
      const self = createRobotEntity({ position: [0, 0, 0] });
      self.team = undefined;

      const enemies = queryEnemies(world, self);
      expect(enemies).toEqual([]);
    });

    it("excludes entities on the same team", () => {
      const self = createRobotEntity({ team: "red", position: [0, 0, 0] });
      createRobotEntity({ team: "red", position: [5, 0, 0] });
      createRobotEntity({ team: "red", position: [10, 0, 0] });

      const enemies = queryEnemies(world, self);
      expect(enemies).toHaveLength(0);
    });

    it("excludes dead entities", () => {
      const self = createRobotEntity({ team: "red", position: [0, 0, 0] });
      createRobotEntity({ team: "blue", position: [5, 0, 0], alive: false });

      const enemies = queryEnemies(world, self);
      expect(enemies).toHaveLength(0);
    });

    it("finds living enemies on different teams", () => {
      const self = createRobotEntity({ team: "red", position: [0, 0, 0] });
      const enemy1 = createRobotEntity({ team: "blue", position: [5, 0, 0] });
      const enemy2 = createRobotEntity({ team: "blue", position: [10, 0, 0] });

      const enemies = queryEnemies(world, self);
      expect(enemies).toHaveLength(2);
      expect(enemies.map((e) => e.entity.id)).toContain(enemy1.id);
      expect(enemies.map((e) => e.entity.id)).toContain(enemy2.id);
    });

    it("sorts enemies by distance (nearest first)", () => {
      const self = createRobotEntity({ team: "red", position: [0, 0, 0] });
      const far = createRobotEntity({ team: "blue", position: [10, 0, 0] });
      const near = createRobotEntity({ team: "blue", position: [2, 0, 0] });
      const mid = createRobotEntity({ team: "blue", position: [5, 0, 0] });

      const enemies = queryEnemies(world, self);
      expect(enemies).toHaveLength(3);
      expect(enemies[0].entity.id).toBe(near.id);
      expect(enemies[1].entity.id).toBe(mid.id);
      expect(enemies[2].entity.id).toBe(far.id);
    });

    it("calculates distance correctly using distanceSquared", () => {
      const self = createRobotEntity({ team: "red", position: [0, 0, 0] });
      createRobotEntity({ team: "blue", position: [3, 0, 4] }); // distance = 5

      const enemies = queryEnemies(world, self);
      expect(enemies).toHaveLength(1);
      expect(enemies[0].distanceSquared).toBe(25); // 3^2 + 4^2
    });

    it("excludes entities without positions", () => {
      const self = createRobotEntity({ team: "red", position: [0, 0, 0] });
      const noPos = createRobotEntity({ team: "blue" });
      noPos.position = undefined;

      const enemies = queryEnemies(world, self);
      expect(enemies).toHaveLength(0);
    });

    it("excludes self from results", () => {
      const self = createRobotEntity({ team: "red", position: [0, 0, 0] });

      const enemies = queryEnemies(world, self);
      expect(enemies.map((e) => e.entity.id)).not.toContain(self.id);
    });
  });

  describe("findNearestEnemy", () => {
    it("returns undefined if no enemies exist", () => {
      const self = createRobotEntity({ team: "red", position: [0, 0, 0] });

      const enemy = findNearestEnemy(world, self);
      expect(enemy).toBeUndefined();
    });

    it("returns the nearest enemy", () => {
      const self = createRobotEntity({ team: "red", position: [0, 0, 0] });
      createRobotEntity({ team: "blue", position: [10, 0, 0] });
      const nearest = createRobotEntity({ team: "blue", position: [2, 0, 0] });
      createRobotEntity({ team: "blue", position: [5, 0, 0] });

      const enemy = findNearestEnemy(world, self);
      expect(enemy?.id).toBe(nearest.id);
    });

    it("returns undefined if self has no position", () => {
      const self = createRobotEntity({ team: "red" });
      self.position = undefined;
      createRobotEntity({ team: "blue", position: [5, 0, 0] });

      const enemy = findNearestEnemy(world, self);
      expect(enemy).toBeUndefined();
    });

    it("returns undefined if self has no team", () => {
      const self = createRobotEntity({ position: [0, 0, 0] });
      self.team = undefined;
      createRobotEntity({ team: "blue", position: [5, 0, 0] });

      const enemy = findNearestEnemy(world, self);
      expect(enemy).toBeUndefined();
    });
  });
});
