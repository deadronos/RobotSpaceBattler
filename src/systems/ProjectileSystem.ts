import type { World } from 'miniplex';

import type { Entity } from '../ecs/miniplexStore';
import type { ProjectileComponent } from '../ecs/weapons';

/**
 * Placeholder system for projectile updates and lifetime management.
 */
export function projectileSystem(world: World<Entity>, dt: number) {
  for (const entity of world.entities) {
    const e = entity as Entity & { projectile?: ProjectileComponent };
    const { projectile } = e;
    if (!projectile) continue;
    projectile.lifetimeMs -= dt * 1000;
    if (projectile.lifetimeMs <= 0) {
      world.remove(entity);
    }
  }
}
