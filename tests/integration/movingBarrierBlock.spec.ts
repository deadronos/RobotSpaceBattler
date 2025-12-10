import { describe, expect, it, vi } from 'vitest';
import { createBattleWorld } from '../../src/ecs/world';
import { vec3 } from '../../src/lib/math/vec3';
import { updateProjectileSystem } from '../../src/ecs/systems/projectileSystem';
import { distanceSquaredPointToAABB } from '../../src/lib/math/geometry';
import { updateObstacleMovement } from '../../src/simulation/obstacles/movementSystem';
import { isLineOfSightBlockedRuntime } from '../../src/simulation/environment/arenaGeometry';

function createSpyTelemetry() {
  return {
    reset: vi.fn(),
    recordSpawn: vi.fn(),
    recordFire: vi.fn(),
    recordDamage: vi.fn(),
    recordDeath: vi.fn(),
    recordObstacleMove: vi.fn(),
  } as any;
}

describe('Integration: moving barrier blocks LOS and projectiles', () => {
  it('barrier moving into path blocks line-of-sight at runtime', () => {
    const world = createBattleWorld();

    const start = vec3(0, 0, 40);
    const end = vec3(6, 0, 40);

    // Add a moving barrier that starts out of the way (x=100) and will move to x=3
    const barrier = {
      id: 'moving-barrier-1',
      kind: 'obstacle' as const,
      obstacleType: 'barrier' as const,
      position: vec3(100, 0, 40),
      shape: { kind: 'box', halfWidth: 1.5, halfDepth: 1.5 },
      blocksVision: true,
      blocksMovement: true,
      active: true,
      movementPattern: {
        patternType: 'linear' as const,
        points: [vec3(100, 0, 40), vec3(3, 0, 40)],
        speed: 10000, // move quickly in a single update call
      },
    } as any;

    world.world.add(barrier);

    // Initially barrier is not between the two points
    expect(isLineOfSightBlockedRuntime(start, end, { obstacles: world.obstacles.entities })).toBe(false);

    // Move the barrier into the path and ensure telemetry records the move
    const telemetry = createSpyTelemetry();
    updateObstacleMovement(world, 1000, telemetry);

    // LOS should now be blocked by the barrier
    expect(isLineOfSightBlockedRuntime(start, end, { obstacles: world.obstacles.entities })).toBe(true);
    expect(telemetry.recordObstacleMove).toHaveBeenCalled();
  });

  it('projectiles are blocked while barrier intersects shot path and hit when it leaves', () => {
    const world = createBattleWorld();

    // Add shooter and target robots
    const shooter = {
      id: 'shooter-1',
      kind: 'robot' as const,
      team: 'red' as const,
      position: vec3(0, 0, 40),
      velocity: vec3(0, 0, 0),
      orientation: 0,
      weapon: 'gun' as const,
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

    const target = {
      id: 'target-1',
      kind: 'robot' as const,
      team: 'blue' as const,
      position: vec3(6, 0, 40),
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

    world.world.add(shooter);
    world.world.add(target);

    // Place a stationary barrier in the path
    const barrier = {
      id: 'moving-barrier-2',
      kind: 'obstacle' as const,
      obstacleType: 'barrier' as const,
      position: vec3(3, 0, 40),
      shape: { kind: 'box', halfWidth: 1.5, halfDepth: 1.5 },
      blocksVision: true,
      blocksMovement: true,
      active: true,
    } as any;

    world.world.add(barrier);

    const telemetry = createSpyTelemetry();

    // Fire a projectile from the shooter. With barrier at x=3 and projectile speed 3,
    // one update will move the projectile into the barrier and it should be removed.
    const proj1 = {
      id: 'p-blocked',
      kind: 'projectile' as const,
      team: 'red' as const,
      shooterId: shooter.id,
      weapon: 'gun' as const,
      position: vec3(0, 0, 40),
      velocity: vec3(3, 0, 0),
      damage: 10,
      speed: 3,
      maxLifetime: 10000,
      spawnTime: world.state.elapsedMs,
      distanceTraveled: 0,
      maxDistance: 1000,
    } as any;

    world.world.add(proj1);

    const removeSpy = vi.spyOn(world as any, 'removeProjectile');

    updateProjectileSystem(world, 1, telemetry);

    // We don't assert on exact projectile position here because the projectile is removed immediately on collision.
    // Confirm the projectile removal was invoked and target remained unharmed.

    // projectile should be removed and target unchanged
    expect(removeSpy).toHaveBeenCalled();
    expect(world.projectiles.entities.find((p) => p.id === proj1.id)).toBeUndefined();
    expect(target.health).toBe(100);
    expect(telemetry.recordDamage).not.toHaveBeenCalled();

    // Move barrier out of the way (place far away)
    barrier.position = vec3(100, 0, 40);

    // Fire a new projectile that should reach the target after two updates
    const proj2 = {
      id: 'p-hit',
      kind: 'projectile' as const,
      team: 'red' as const,
      shooterId: shooter.id,
      weapon: 'gun' as const,
      position: vec3(0, 0, 40),
      velocity: vec3(3, 0, 0),
      damage: 10,
      speed: 3,
      maxLifetime: 10000,
      spawnTime: world.state.elapsedMs,
      distanceTraveled: 0,
      maxDistance: 1000,
    } as any;

    world.world.add(proj2);

    updateProjectileSystem(world, 1, telemetry); // moves to x=3
    updateProjectileSystem(world, 1, telemetry); // moves to x=6 -> hit

    // projectile removed and target damaged
    expect(world.projectiles.entities.find((p) => p.id === proj2.id)).toBeUndefined();
    expect(target.health).toBeLessThan(100);
    expect(telemetry.recordDamage).toHaveBeenCalled();
  });
});
