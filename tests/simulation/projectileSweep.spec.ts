import { describe, expect, it, vi } from "vitest";

import { updateProjectileSystem } from "../../src/ecs/systems/projectileSystem";
import { createBattleWorld, toVec3 } from "../../src/ecs/world";
import type { TelemetryPort } from "../../src/runtime/simulation/ports";
import { createTestRobot } from "../helpers/robotFactory";

function telemetry(): TelemetryPort {
  return {
    reset: vi.fn<TelemetryPort["reset"]>(),
    recordSpawn: vi.fn<TelemetryPort["recordSpawn"]>(),
    recordFire: vi.fn<TelemetryPort["recordFire"]>(),
    recordDamage: vi.fn<TelemetryPort["recordDamage"]>(),
    recordDeath: vi.fn<TelemetryPort["recordDeath"]>(),
  };
}

function setup(speed: number, targetX: number) {
  const world = createBattleWorld();
  const shooter = createTestRobot({ id: "s", team: "red" });
  const target = createTestRobot({
    id: "t",
    team: "blue",
    position: toVec3(targetX, 0, 0),
  });
  world.world.add(shooter);
  world.world.add(target);
  const projectile = {
    id: "p1",
    kind: "projectile" as const,
    team: "red" as const,
    shooterId: "s",
    targetId: "t",
    weapon: "gun" as const,
    position: toVec3(0, 0, 0),
    velocity: toVec3(speed, 0, 0),
    speed,
    damage: 10,
    maxLifetime: 100000,
    maxDistance: 100000,
    spawnTime: world.state.elapsedMs,
    distanceTraveled: 0,
  };
  world.world.add(projectile as never);
  return { world, target };
}

describe("projectile swept hit test", () => {
  it("hits a target the projectile would tunnel through in one big step", () => {
    // 100 u/s * 1s = 100 units: lands far behind the target at x=50.
    const { world, target } = setup(100, 50);
    updateProjectileSystem(world, 1, telemetry());
    expect(target.health).toBeLessThan(target.maxHealth);
    expect(world.projectiles.entities).toHaveLength(0);
  });

  it("still misses a target off the flight line", () => {
    const { world, target } = setup(100, 50);
    target.position.z = 5;
    updateProjectileSystem(world, 1, telemetry());
    expect(target.health).toBe(target.maxHealth);
  });

  it("small steps still hit as before", () => {
    const { world, target } = setup(100, 50);
    for (let i = 0; i < 60 && target.health === target.maxHealth; i += 1) {
      updateProjectileSystem(world, 1 / 60, telemetry());
    }
    expect(target.health).toBeLessThan(target.maxHealth);
  });
});
