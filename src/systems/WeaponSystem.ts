import type { World } from 'miniplex';

import type { Entity } from '../ecs/miniplexStore';
import type {
  AmmoComponent,
  CooldownComponent,
  WeaponComponent,
  WeaponStateComponent,
} from '../ecs/weapons';

/**
 * Base weapon system handling cooldowns and ammo consumption.
 * Actual firing logic is delegated to specialised systems.
 */
export function weaponSystem(world: World<Entity>, dt: number) {
  for (const entity of world.entities) {
    const e = entity as Entity & {
      weapon?: WeaponComponent;
      weaponState?: WeaponStateComponent;
      weaponCooldown?: CooldownComponent;
      weaponAmmo?: AmmoComponent;
    };
    const {
      weapon,
      weaponState: state,
      weaponCooldown: cooldown,
      weaponAmmo: ammo,
    } = e;

    if (weapon && state?.isFiring && cooldown && cooldown.remainingMs <= 0) {
      cooldown.remainingMs = weapon.cooldownMs;
      if (ammo) {
        ammo.clip = Math.max(0, ammo.clip - (ammo.perShot ?? 1));
      }
    }

    if (cooldown) {
      cooldown.remainingMs = Math.max(0, cooldown.remainingMs - dt * 1000);
    }
  }
}
