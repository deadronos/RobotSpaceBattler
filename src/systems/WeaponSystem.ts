import type { World } from 'miniplex';

import { getEntityById, type Entity } from '../ecs/miniplexStore';
import type {
  DamageEvent,
  WeaponComponent,
  WeaponStateComponent,
} from '../ecs/weapons';
import type { Rng } from '../utils/seededRng';

export interface WeaponFiredEvent {
  weaponId: string;
  ownerId: number;
  type: 'gun' | 'laser' | 'rocket';
  origin: [number, number, number];
  direction: [number, number, number];
  targetId?: number;
  timestamp: number;
}

 type RigidBodyLike = {
  translation: () => { x: number; y: number; z: number };
};

function getEntityPosition(entity: Entity & { position?: [number, number, number] }): [number, number, number] | undefined {
  const rigid = entity.rigid as unknown as RigidBodyLike | null;
  if (rigid) {
    const { x, y, z } = rigid.translation();
    return [x, y, z];
  }
  if (entity.position) {
    return [entity.position[0], entity.position[1], entity.position[2]];
  }
  return undefined;
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
      rigid?: unknown;
      targetId?: number;
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
      // Charging logic would go here
    }

    // Check if we can fire
    const canFire = state.firing && 
                   (!state.cooldownRemaining || state.cooldownRemaining <= 0) &&
                   (!weapon.ammo || weapon.ammo.clip > 0) &&
                   !state.reloading;

    if (canFire) {
      if (typeof weapon.ownerId !== 'number' && typeof e.id === 'number') {
        weapon.ownerId = e.id;
      }

      const ownerId = typeof weapon.ownerId === 'number' ? weapon.ownerId : undefined;
      if (ownerId === undefined) {
        continue;
      }

      // Set cooldown
      state.cooldownRemaining = weapon.cooldown;
      weapon.lastFiredAt = Date.now();

      const origin = getEntityPosition(e) ?? position;

      let direction: [number, number, number] = [1, 0, 0];
      let targetId: number | undefined = typeof e.targetId === 'number' ? e.targetId : undefined;
      if (targetId !== undefined) {
        const targetEntity = getEntityById(targetId);
        if (targetEntity) {
          const targetPosition = getEntityPosition(targetEntity);
          if (targetPosition) {
            const dx = targetPosition[0] - origin[0];
            const dy = targetPosition[1] - origin[1];
            const dz = targetPosition[2] - origin[2];
            const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (length > 1e-5) {
              direction = [dx / length, dy / length, dz / length];
            }
          }
        } else {
          targetId = undefined;
        }
      }

      // Emit weapon fired event
      events.weaponFired.push({
        weaponId: weapon.id,
        ownerId,
        type: weapon.type,
        origin: [origin[0], origin[1], origin[2]],
        direction,
        targetId,
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

