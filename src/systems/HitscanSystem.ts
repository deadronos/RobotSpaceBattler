import type { World } from 'miniplex';
import type { Rng } from '../utils/seededRng';

import type { Entity } from '../ecs/miniplexStore';
import type { WeaponComponent, DamageEvent } from '../ecs/weapons';
import type { WeaponFiredEvent } from './WeaponSystem';

interface ImpactEvent {
  position: [number, number, number];
  normal: [number, number, number];
  targetId?: number;
}

/**
 * Hitscan system for guns and instant lasers.
 * Performs raycasts with spread/accuracy using seeded RNG.
 */
export function hitscanSystem(
  world: World<Entity>,
  rng: Rng,
  weaponFiredEvents: WeaponFiredEvent[],
  events: { damage: DamageEvent[]; impact: ImpactEvent[] }
) {
  for (const fireEvent of weaponFiredEvents) {
    if (fireEvent.type !== 'gun') continue;

    // Find the weapon that fired
    const weaponEntity = Array.from(world.entities).find(e => {
      const entity = e as Entity & { weapon?: WeaponComponent };
      return entity.weapon?.id === fireEvent.weaponId;
    });

    if (!weaponEntity) continue;
    const weapon = (weaponEntity as Entity & { weapon: WeaponComponent }).weapon;

    // Apply spread/accuracy using seeded RNG
    const spreadAngle = weapon.spread || 0;
    const accuracy = weapon.accuracy || 1.0;
    
    const spread = spreadAngle * (1 - accuracy) * (rng() - 0.5) * 2;
    const direction = applySpread(fireEvent.direction, spread, rng);

    // Perform raycast (simplified - in real implementation would use Rapier or Three.js raycaster)
    const hit = performRaycast(fireEvent.origin, direction, weapon.range || 100, world, fireEvent.ownerId, weapon.team);

    if (hit) {
      // Apply damage
      events.damage.push({
        sourceId: fireEvent.ownerId,
        weaponId: fireEvent.weaponId,
        targetId: hit.targetId,
        position: hit.position,
        damage: weapon.power,
      });

      // Create impact event for FX
      events.impact.push({
        position: hit.position,
        normal: hit.normal,
        targetId: hit.targetId,
      });
    }
  }
}

function applySpread(
  direction: [number, number, number], 
  spread: number, 
  rng: Rng
): [number, number, number] {
  // Simple spread application - rotate direction by spread amount
  const [x, y, z] = direction;
  const yaw = Math.atan2(z, x) + spread;
  const len = Math.sqrt(x * x + y * y + z * z);
  return [
    Math.cos(yaw) * len,
    y, // Keep vertical component unchanged for simplicity
    Math.sin(yaw) * len,
  ];
}

function performRaycast(
  origin: [number, number, number],
  direction: [number, number, number],
  maxDistance: number,
  world: World<Entity>
): { position: [number, number, number]; normal: [number, number, number]; targetId?: number } | null {
  // Simplified raycast - in real implementation would use Rapier's raycast
  // For now, just check against entity positions within range
  
  const [ox, oy, oz] = origin;
  const [dx, dy, dz] = direction;
  
  for (const entity of world.entities) {
    const e = entity as Entity & { 
      position?: [number, number, number]; 
      team?: string;
      weapon?: WeaponComponent;
      alive?: boolean;
    };
    // Skip dead entities or entities without position/team
    if (!e.position || !e.team || e.alive === false) continue;
    
    const [ex, ey, ez] = e.position;
    const toTarget = [ex - ox, ey - oy, ez - oz];
    const distance = Math.sqrt(toTarget[0] * toTarget[0] + toTarget[1] * toTarget[1] + toTarget[2] * toTarget[2]);
    
    if (distance > maxDistance) continue;
    
    // Improved angle check with tighter hit detection for spread testing
    const dot = (toTarget[0] * dx + toTarget[1] * dy + toTarget[2] * dz) / distance;
    if (dot > 0.99) { // Much tighter hit cone to test spread properly
      return {
        position: e.position,
        normal: [-dx, -dy, -dz], // Simple normal
        targetId: e.id as unknown as number,
      };
    }
  }
  
  return null;
}
