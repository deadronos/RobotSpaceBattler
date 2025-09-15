import type { World } from 'miniplex';
import type { Rng } from '../utils/seededRng';

import type { Entity } from '../ecs/miniplexStore';
import type {
  WeaponComponent,
  WeaponStateComponent,
  DamageEvent,
} from '../ecs/weapons';

export interface WeaponFiredEvent {
  weaponId: string;
  ownerId: number;
  type: 'gun' | 'laser' | 'rocket';
  origin: [number, number, number];
  direction: [number, number, number];
  timestamp: number;
}

/**
 * Weapon system coordinator - manages cooldowns, ammo, and firing decisions.
 * Emits WeaponFired events rather than directly resolving hits.
 */
export function weaponSystem(
  world: World<Entity>, 
  dt: number, 
  rng: Rng,
  events: { weaponFired: WeaponFiredEvent[]; damage: DamageEvent[] }
) {
  for (const entity of world.entities) {
    const e = entity as Entity & {
      weapon?: WeaponComponent;
      weaponState?: WeaponStateComponent;
      position?: [number, number, number];
      team?: 'red' | 'blue';
    };
    
    const { weapon, weaponState: state, position, team } = e;
    if (!weapon || !state || !position || !team) continue;

    // Update cooldown
    if (state.cooldownRemaining && state.cooldownRemaining > 0) {
      state.cooldownRemaining = Math.max(0, state.cooldownRemaining - dt);
    }

    // Handle reloading
    if (state.reloading && weapon.ammo) {
      // Simple reload logic - could be enhanced with reload time
      weapon.ammo.clip = weapon.ammo.clipSize;
      state.reloading = false;
    }

    // Handle charging (for chargeable weapons like lasers)
    if (state.chargeStart && weapon.flags?.chargeable) {
      const chargeTime = Date.now() - state.chargeStart;
      // Charging logic would go here
    }

    // Check if we can fire
    const canFire = state.firing && 
                   (!state.cooldownRemaining || state.cooldownRemaining <= 0) &&
                   (!weapon.ammo || weapon.ammo.clip > 0) &&
                   !state.reloading;

    if (canFire) {
      // Set cooldown
      state.cooldownRemaining = weapon.cooldown;
      weapon.lastFiredAt = Date.now();

      // Calculate firing direction (simplified - towards target)
      // In a real implementation, this would use the AI's target selection
      const direction: [number, number, number] = [1, 0, 0]; // placeholder

      // Emit weapon fired event
      events.weaponFired.push({
        weaponId: weapon.id,
        ownerId: weapon.ownerId,
        type: weapon.type,
        origin: [position[0], position[1], position[2]],
        direction,
        timestamp: Date.now(),
      });

      // Consume ammo AFTER firing
      if (weapon.ammo) {
        weapon.ammo.clip = Math.max(0, weapon.ammo.clip - 1);
        if (weapon.ammo.clip === 0 && weapon.ammo.reserve > 0) {
          state.reloading = true;
        }
      }

      // Stop firing after single shot (unless continuous)
      if (!weapon.flags?.continuous) {
        state.firing = false;
      }
    }
  }
}
