import type { World } from 'miniplex';

import type { Entity } from '../ecs/miniplexStore';
import type { WeaponComponent, WeaponStateComponent } from '../ecs/weapons';

/**
 * Placeholder system for hitscan weapon resolution.
 */
export function hitscanSystem(world: World<Entity>) {
  for (const entity of world.entities) {
    const e = entity as Entity & {
      weapon?: WeaponComponent;
      weaponState?: WeaponStateComponent;
    };
    const { weapon, weaponState: state } = e;
    if (!weapon || weapon.type !== 'hitscan' || !state?.isFiring) continue;
    // TODO: Raycast and apply damage
  }
}
