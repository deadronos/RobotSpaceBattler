import type { World } from 'miniplex';

import type { Entity } from '../ecs/miniplexStore';
import type { BeamComponent } from '../ecs/weapons';

/**
 * Placeholder system for beam weapon updates.
 */
export function beamSystem(world: World<Entity>, dt: number) {
  for (const entity of world.entities) {
    const e = entity as Entity & { beam?: BeamComponent };
    const { beam } = e;
    if (!beam) continue;
    beam.durationMs -= dt * 1000;
    if (beam.durationMs <= 0) {
      world.remove(entity);
    }
  }
}
