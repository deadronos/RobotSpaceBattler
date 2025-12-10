import { describe, it, expect, vi } from 'vitest';
import { createBattleWorld } from '../../src/ecs/world';
import * as destructible from '../../src/simulation/obstacles/destructibleSystem';
import { vec3 } from '../../src/lib/math/vec3';
import { updateProjectileSystem } from '../../src/ecs/systems/projectileSystem';

function createNoopTelemetry() {
  return {
    reset: vi.fn(),
    recordSpawn: vi.fn(),
    recordFire: vi.fn(),
    recordDamage: vi.fn(),
    recordDeath: vi.fn(),
  } as any;
}

describe('Projectile interactions with destructible cover', () => {
  it('applies direct projectile damage to destructible cover and removes projectile', () => {
    const world = createBattleWorld();

    const cover = {
      id: 'cover-ttl',
      kind: 'obstacle' as const,
      obstacleType: 'destructible' as const,
      position: vec3(1, 0, 0),
      shape: { kind: 'box', halfWidth: 1, halfDepth: 1 },
      blocksVision: true,
      blocksMovement: false,
      durability: 10,
      maxDurability: 10,
      active: true,
    };

    world.world.add(cover as any);

    const projectile = {
      id: 'p1',
      kind: 'projectile' as const,
      team: 'red' as const,
      shooterId: 'robot-0',
      weapon: 'gun' as const,
      position: vec3(1, 0, 0),
      velocity: vec3(0, 0, 0),
      damage: 3,
      maxLifetime: 10000,
      maxDistance: 1000,
      spawnTime: world.state.elapsedMs,
      distanceTraveled: 0,
    } as any;

    world.world.add(projectile);

    const spy = vi.spyOn(destructible, 'applyDamageToObstacle');
    updateProjectileSystem(world, 0.016, createNoopTelemetry());

    const stored = world.obstacles.entities.find((o) => o.id === cover.id) as any;
    expect(stored).toBeDefined();
    expect(stored.durability).toBe(7); // 10 - 3
    // projectile removed
    expect(world.projectiles.entities.find((p) => p.id === projectile.id)).toBeUndefined();
    spy.mockRestore();
  });

  it('rocket explosion damages obstacles within AoE', () => {
    const world = createBattleWorld();

    const cover = {
      id: 'cover-rocket',
      kind: 'obstacle' as const,
      obstacleType: 'destructible' as const,
      position: vec3(5, 0, 0),
      shape: { kind: 'circle', radius: 2 },
      blocksVision: true,
      blocksMovement: false,
      durability: 20,
      maxDurability: 20,
      active: true,
    };

    world.world.add(cover as any);

    const projectile = {
      id: 'r1',
      kind: 'projectile' as const,
      team: 'blue' as const,
      shooterId: 'robot-1',
      weapon: 'rocket' as const,
      position: vec3(2.9, 0, 0),
      velocity: vec3(0, 0, 0),
      damage: 10,
      aoeRadius: 3,
      projectileSize: 0.5,
      maxLifetime: 10000,
      maxDistance: 1000,
      spawnTime: world.state.elapsedMs,
      distanceTraveled: 0,
      projectileColor: '#fff',
      trailColor: '#fff',
    } as any;

    // Add a direct target so explosion path executes
    const robotTarget = {
      id: 'target-1',
      kind: 'robot' as const,
      team: 'red' as const,
      position: vec3(4, 0, 0),
      velocity: vec3(0, 0, 0),
      orientation: 0,
      weapon: 'laser' as const,
      fireCooldown: 0,
      fireRate: 1,
      speed: 0,
      health: 100,
      maxHealth: 100,
      ai: { mode: 'seek' },
      kills: 0,
      isCaptain: false,
      spawnIndex: 0,
      lastDamageTimestamp: 0,
    } as any;

    world.world.add(projectile);
    world.world.add(robotTarget);

    updateProjectileSystem(world, 0.016, createNoopTelemetry());

    const stored = world.obstacles.entities.find((o) => o.id === cover.id) as any;
    expect(stored).toBeDefined();
    // distance from projectile position (2.9) to cover (5) = 2.1 within radius 3
    // falloff = 1 - dist / radius = 1 - 2.1 / 3 = 0.3 -> baseDamage = projectile.damage * 0.3 = 3

    expect(stored.durability).toBeCloseTo(17, 0);
    // projectile removed
    expect(world.projectiles.entities.find((p) => p.id === projectile.id)).toBeUndefined();
  });
});
