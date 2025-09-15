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

      // Calculate firing direction towards the target
      const direction: [number, number, number] = calculateTargetDirection(e, world);

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

function calculateTargetDirection(entity: Entity, world: World<Entity>): [number, number, number] {
  const e = entity as Entity & { 
    weapon?: WeaponComponent;
    weaponState?: WeaponStateComponent;
    position?: [number, number, number];
    team?: 'red' | 'blue';
    rigid?: any;
  };
  
  if (!e.position || !e.team || !e.rigid) return [1, 0, 0];
  
  // Find nearest enemy using same logic as the AI system
  const enemies = Array.from(world.entities).filter(other => {
    const otherEntity = other as Entity & { team?: string; rigid?: any; alive?: boolean };
    return otherEntity.team && 
           otherEntity.team !== e.team && 
           otherEntity.rigid &&
           otherEntity.alive !== false;
  });
  
  if (enemies.length === 0) return [1, 0, 0];
  
  // Get current position using rigid body (authoritative)
  const pos = e.rigid.translation();
  let bestTarget = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  
  for (const enemy of enemies) {
    const enemyRigid = (enemy as any).rigid;
    if (!enemyRigid) continue;
    
    const enemyPos = enemyRigid.translation();
    const dx = enemyPos.x - pos.x;
    const dy = enemyPos.y - pos.y;
    const dz = enemyPos.z - pos.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (distance < bestDistance) {
      bestDistance = distance;
      bestTarget = { x: enemyPos.x, y: enemyPos.y, z: enemyPos.z };
    }
  }
  
  if (!bestTarget) return [1, 0, 0];
  
  // Calculate normalized direction vector
  const dx = bestTarget.x - pos.x;
  const dy = bestTarget.y - pos.y;
  const dz = bestTarget.z - pos.z;
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
  
  if (length === 0) return [1, 0, 0];
  
  return [dx / length, dy / length, dz / length];
}
