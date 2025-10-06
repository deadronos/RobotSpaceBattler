import { describe, expect, it } from 'vitest';

import { createProjectile, shouldDespawn } from '../../../src/ecs/entities/Projectile';

const baseProjectile = {
  id: 'proj-1',
  ownerId: 'robot-1',
  weaponType: 'laser' as const,
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 1 },
  damage: 10,
  distanceTraveled: 0,
  maxDistance: 50,
  spawnTime: 0,
  maxLifetime: 2,
};

describe('Projectile entity model', () => {
  it('creates projectile with normalized values', () => {
    const projectile = createProjectile({
      ...baseProjectile,
      damage: -5,
      distanceTraveled: -10,
    });

    expect(projectile.damage).toBeGreaterThan(0);
    expect(projectile.distanceTraveled).toBeGreaterThanOrEqual(0);
  });

  it('determines despawn by lifetime and distance', () => {
    const projectile = createProjectile(baseProjectile);

    expect(shouldDespawn(projectile, 1)).toBe(false);
    expect(
      shouldDespawn(
        {
          ...projectile,
          distanceTraveled: 60,
        },
        1
      )
    ).toBe(true);
    expect(
      shouldDespawn(
        projectile,
        projectile.spawnTime + projectile.maxLifetime + 0.1
      )
    ).toBe(true);
  });
});
