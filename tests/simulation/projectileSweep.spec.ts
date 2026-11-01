import { describe, expect, it, vi } from "vitest";

import { updateProjectileSystem } from "../../src/ecs/systems/projectileSystem";
import { BattleWorld, createBattleWorld, toVec3 } from "../../src/ecs/world";
import type { TelemetryPort } from "../../src/runtime/simulation/ports";
import { createTestRobot } from "../helpers/robotFactory";

/** Robot hit sphere radius used by the projectile system. */
const ROBOT_HIT_RADIUS = 1.2;

function telemetry(): TelemetryPort {
  return {
    reset: vi.fn<TelemetryPort["reset"]>(),
    recordSpawn: vi.fn<TelemetryPort["recordSpawn"]>(),
    recordFire: vi.fn<TelemetryPort["recordFire"]>(),
    recordDamage: vi.fn<TelemetryPort["recordDamage"]>(),
    recordDeath: vi.fn<TelemetryPort["recordDeath"]>(),
  };
}

interface SetupOptions {
  weapon?: "gun" | "rocket";
  aoeRadius?: number;
}

function setup(speed: number, targetX: number, options: SetupOptions = {}) {
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
    weapon: options.weapon ?? ("gun" as const),
    position: toVec3(0, 0, 0),
    velocity: toVec3(speed, 0, 0),
    speed,
    damage: 10,
    aoeRadius: options.aoeRadius,
    projectileSize: options.weapon === "rocket" ? 0.5 : undefined,
    maxLifetime: 100000,
    maxDistance: 100000,
    spawnTime: world.state.elapsedMs,
    distanceTraveled: 0,
  };
  world.world.add(projectile as never);
  return { world, target };
}

interface CoverOptions {
  id?: string;
  x: number;
  halfWidth?: number;
  halfDepth?: number;
  durability?: number;
}

/** Adds a destructible box of cover and returns the live entity. */
function addCover(world: BattleWorld, options: CoverOptions) {
  const cover = {
    id: options.id ?? "cover-1",
    kind: "obstacle" as const,
    obstacleType: "destructible" as const,
    position: toVec3(options.x, 0, 0),
    shape: {
      kind: "box" as const,
      halfWidth: options.halfWidth ?? 0.2,
      halfDepth: options.halfDepth ?? 5,
    },
    blocksVision: true,
    blocksMovement: false,
    durability: options.durability ?? 50,
    maxDurability: options.durability ?? 50,
    active: true,
  };
  world.world.add(cover as never);
  return cover;
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

describe("projectile swept obstacle test", () => {
  it("cannot pass through a thin wall in one step", () => {
    // The segment runs from x=0 to x=100, straight through a 0.4-unit-wide
    // wall at x=50, and would otherwise reach the robot at x=80.
    const { world, target } = setup(100, 80);
    const cover = addCover(world, { x: 50, halfWidth: 0.2 });

    updateProjectileSystem(world, 1, telemetry());

    expect(cover.durability).toBe(40); // 50 - 10 projectile damage
    expect(target.health).toBe(target.maxHealth);
    expect(world.projectiles.entities).toHaveLength(0);
  });

  it("hits the robot when the robot is nearer than the wall", () => {
    const { world, target } = setup(100, 40);
    const cover = addCover(world, { x: 60 });

    updateProjectileSystem(world, 1, telemetry());

    // Robot entry point (x=38.8) comes before the wall (x=59.8).
    expect(target.health).toBeLessThan(target.maxHealth);
    expect(cover.durability).toBe(50);
  });

  it("hits the wall when the wall is nearer than the robot", () => {
    const { world, target } = setup(100, 60);
    const cover = addCover(world, { x: 40 });

    updateProjectileSystem(world, 1, telemetry());

    // Wall entry point (x=39.8) comes before the robot (x=58.8).
    expect(cover.durability).toBe(40);
    expect(target.health).toBe(target.maxHealth);
  });
});

describe("rocket impact point", () => {
  it("detonates at the impact point instead of the end-of-step position", () => {
    const { world, target } = setup(100, 50, {
      weapon: "rocket",
      aoeRadius: 3,
    });

    updateProjectileSystem(world, 1, telemetry());

    const explosion = world.effects.entities.find(
      (effect) => effect.effectType === "explosion",
    );
    expect(explosion).toBeDefined();
    // Entry into the 1.2-radius robot hit sphere at x=50 is x=48.8, not x=100.
    expect(explosion?.position.x).toBeCloseTo(50 - ROBOT_HIT_RADIUS, 5);
    expect(explosion?.position.z).toBeCloseTo(0, 5);
    expect(target.health).toBeLessThan(target.maxHealth);
  });
});
