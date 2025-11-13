/**
 * ProjectileSystem Tests
 * Task: T016
 * Spec: specs/005-weapon-diversity/spec.md
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ProjectileSystem,
  createProjectile,
  ProjectileType,
} from "../../src/simulation/projectiles/ProjectileSystem";
import type { ProjectileInstance } from "../../src/lib/weapons/types";

describe("ProjectileSystem", () => {
  let system: ProjectileSystem;

  beforeEach(() => {
    system = new ProjectileSystem();
  });

  describe("createProjectile", () => {
    it("should create a ballistic projectile", () => {
      const projectile = createProjectile({
        type: "ballistic",
        weaponProfileId: "gun",
        ownerId: "robot-1",
        position: [0, 0, 0],
        velocity: [10, 0, 0],
        timestampMs: 1000,
      });

      expect(projectile.id).toBeDefined();
      expect(projectile.weaponProfileId).toBe("gun");
      expect(projectile.ownerId).toBe("robot-1");
      expect(projectile.position).toEqual([0, 0, 0]);
      expect(projectile.velocity).toEqual([10, 0, 0]);
      expect(projectile.timestampMs).toBe(1000);
    });

    it("should create a beam projectile", () => {
      const projectile = createProjectile({
        type: "beam",
        weaponProfileId: "laser",
        ownerId: "robot-2",
        position: [1, 2, 3],
        velocity: [0, 0, 15],
        timestampMs: 2000,
      });

      expect(projectile.weaponProfileId).toBe("laser");
      expect(projectile.position).toEqual([1, 2, 3]);
    });

    it("should create an AoE projectile", () => {
      const projectile = createProjectile({
        type: "aoe",
        weaponProfileId: "rocket",
        ownerId: "robot-3",
        position: [5, 5, 5],
        velocity: [0, 10, 0],
        timestampMs: 3000,
      });

      expect(projectile.weaponProfileId).toBe("rocket");
    });
  });

  describe("ProjectileSystem.spawn", () => {
    it("should add projectile to active projectiles", () => {
      const projectile: ProjectileInstance = {
        id: "proj-1",
        weaponProfileId: "gun",
        ownerId: "robot-1",
        position: [0, 0, 0],
        velocity: [10, 0, 0],
        timestampMs: 1000,
      };

      system.spawn(projectile);
      const active = system.getActiveProjectiles();

      expect(active).toHaveLength(1);
      expect(active[0]).toEqual(projectile);
    });

    it("should handle multiple projectiles", () => {
      const projectiles = [
        createProjectile({
          type: "ballistic",
          weaponProfileId: "gun",
          ownerId: "robot-1",
          position: [0, 0, 0],
          velocity: [10, 0, 0],
          timestampMs: 1000,
        }),
        createProjectile({
          type: "aoe",
          weaponProfileId: "rocket",
          ownerId: "robot-2",
          position: [5, 5, 5],
          velocity: [0, 10, 0],
          timestampMs: 1000,
        }),
      ];

      projectiles.forEach((p) => system.spawn(p));
      expect(system.getActiveProjectiles()).toHaveLength(2);
    });
  });

  describe("ProjectileSystem.update", () => {
    it("should update projectile positions", () => {
      const projectile = createProjectile({
        type: "ballistic",
        weaponProfileId: "gun",
        ownerId: "robot-1",
        position: [0, 0, 0],
        velocity: [10, 0, 0],
        timestampMs: 1000,
      });

      system.spawn(projectile);
      system.update(0.1); // 100ms delta

      const active = system.getActiveProjectiles();
      expect(active[0].position[0]).toBeCloseTo(1.0, 1); // 10 * 0.1
    });

    it("should remove projectiles beyond max lifetime", () => {
      const projectile = createProjectile({
        type: "ballistic",
        weaponProfileId: "gun",
        ownerId: "robot-1",
        position: [0, 0, 0],
        velocity: [10, 0, 0],
        timestampMs: 1000,
      });

      system.spawn(projectile);

      // Update with large time step to exceed lifetime
      system.update(10.0, 11000); // 10s later, currentMs = 11000

      const active = system.getActiveProjectiles();
      expect(active).toHaveLength(0);
    });
  });

  describe("ProjectileSystem.getProjectilesByType", () => {
    it("should filter projectiles by weapon profile", () => {
      const gunProj = createProjectile({
        type: "ballistic",
        weaponProfileId: "gun",
        ownerId: "robot-1",
        position: [0, 0, 0],
        velocity: [10, 0, 0],
        timestampMs: 1000,
      });

      const rocketProj = createProjectile({
        type: "aoe",
        weaponProfileId: "rocket",
        ownerId: "robot-2",
        position: [5, 5, 5],
        velocity: [0, 10, 0],
        timestampMs: 1000,
      });

      system.spawn(gunProj);
      system.spawn(rocketProj);

      const guns = system.getProjectilesByType("gun");
      const rockets = system.getProjectilesByType("rocket");

      expect(guns).toHaveLength(1);
      expect(rockets).toHaveLength(1);
      expect(guns[0].weaponProfileId).toBe("gun");
      expect(rockets[0].weaponProfileId).toBe("rocket");
    });
  });

  describe("ProjectileSystem.remove", () => {
    it("should remove projectile by ID", () => {
      const projectile = createProjectile({
        type: "ballistic",
        weaponProfileId: "gun",
        ownerId: "robot-1",
        position: [0, 0, 0],
        velocity: [10, 0, 0],
        timestampMs: 1000,
      });

      system.spawn(projectile);
      expect(system.getActiveProjectiles()).toHaveLength(1);

      system.remove(projectile.id);
      expect(system.getActiveProjectiles()).toHaveLength(0);
    });

    it("should handle removing non-existent projectile", () => {
      expect(() => system.remove("non-existent")).not.toThrow();
      expect(system.getActiveProjectiles()).toHaveLength(0);
    });
  });
});
