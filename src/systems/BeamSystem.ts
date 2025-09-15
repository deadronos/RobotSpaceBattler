import type { World } from 'miniplex';
import type { Rng } from '../utils/seededRng';

import type { Entity } from '../ecs/miniplexStore';
import type { BeamComponent, WeaponComponent, DamageEvent } from '../ecs/weapons';
import type { WeaponFiredEvent } from './WeaponSystem';

/**
 * Beam system for laser weapons.
 * Creates beam entities for continuous lasers and handles tick damage.
 */
export function beamSystem(
  world: World<Entity>,
  dt: number,
  rng: Rng,
  weaponFiredEvents: WeaponFiredEvent[],
  events: { damage: DamageEvent[] }
) {
  // Create new beams from weapon fired events
  for (const fireEvent of weaponFiredEvents) {
    if (fireEvent.type !== 'laser') continue;

    // Find the weapon that fired to get beam parameters
    const weaponEntity = Array.from(world.entities).find(e => {
      const entity = e as Entity & { weapon?: WeaponComponent };
      return entity.weapon?.id === fireEvent.weaponId;
    });

    if (!weaponEntity) continue;
    const weapon = (weaponEntity as Entity & { weapon: WeaponComponent }).weapon;

    // Create beam entity
    const beamEntity: Entity & { beam: BeamComponent } = {
      id: `beam_${fireEvent.weaponId}_${Date.now()}`,
      position: [fireEvent.origin[0], fireEvent.origin[1], fireEvent.origin[2]],
      team: weapon.team,
      beam: {
        sourceWeaponId: fireEvent.weaponId,
        origin: [fireEvent.origin[0], fireEvent.origin[1], fireEvent.origin[2]],
        direction: [fireEvent.direction[0], fireEvent.direction[1], fireEvent.direction[2]],
        length: weapon.range || 50,
        width: weapon.beamParams?.width || 0.1,
        activeUntil: Date.now() + (weapon.beamParams?.duration || 2000), // 2s default
        tickDamage: weapon.power / 10, // Damage per tick
        tickInterval: weapon.beamParams?.tickInterval || 100, // 100ms default
        lastTickAt: Date.now(),
      },
    };

    world.add(beamEntity);
  }

  // Update existing beams
  for (const entity of world.entities) {
    const e = entity as Entity & { beam?: BeamComponent };
    const { beam } = e;
    if (!beam) continue;

    const now = Date.now();

    // Check if beam is still active
    if (now >= beam.activeUntil) {
      world.remove(entity);
      continue;
    }

    // Apply tick damage
    if (now >= beam.lastTickAt + beam.tickInterval) {
      beam.lastTickAt = now;
      
      // Perform raycast along beam direction
      const hits = performBeamRaycast(beam.origin, beam.direction, beam.length, world);
      
      for (const hit of hits) {
        events.damage.push({
          sourceId: parseInt(beam.sourceWeaponId),
          weaponId: beam.sourceWeaponId,
          targetId: hit.targetId,
          position: hit.position,
          damage: beam.tickDamage,
        });
      }
    }

    // Update beam origin if weapon moved (for continuous beams)
    // This would require tracking the weapon owner's position
    updateBeamOrigin(beam, world);
  }
}

function performBeamRaycast(
  origin: [number, number, number],
  direction: [number, number, number],
  length: number,
  world: World<Entity>
): Array<{ position: [number, number, number]; targetId: number }> {
  const hits: Array<{ position: [number, number, number]; targetId: number }> = [];
  
  // Simplified beam raycast - in real implementation would use Rapier
  const [ox, oy, oz] = origin;
  const [dx, dy, dz] = direction;
  
  // Normalize direction
  const dirLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const ndx = dx / dirLength;
  const ndy = dy / dirLength;
  const ndz = dz / dirLength;
  
  for (const entity of world.entities) {
    const e = entity as Entity & { 
      position?: [number, number, number]; 
      team?: string;
      beam?: BeamComponent;
      weapon?: WeaponComponent;
    };
    
    // Skip beams and weapon owners
    if (!e.position || !e.team || e.beam || e.weapon) continue;
    
    const [ex, ey, ez] = e.position;
    
    // Check if entity is along the beam path
    const toEntity = [ex - ox, ey - oy, ez - oz];
    const projectionLength = toEntity[0] * ndx + toEntity[1] * ndy + toEntity[2] * ndz;
    
    // Check if projection is within beam length
    if (projectionLength < 0 || projectionLength > length) continue;
    
    // Calculate closest point on beam to entity
    const closestPoint = [
      ox + ndx * projectionLength,
      oy + ndy * projectionLength,
      oz + ndz * projectionLength,
    ];
    
    // Check distance from entity to beam
    const distanceToBeam = Math.sqrt(
      (ex - closestPoint[0]) ** 2 + 
      (ey - closestPoint[1]) ** 2 + 
      (ez - closestPoint[2]) ** 2
    );
    
    const beamRadius = 0.5; // Beam radius for hit detection
    if (distanceToBeam <= beamRadius) {
      hits.push({
        position: closestPoint as [number, number, number],
        targetId: e.id as unknown as number,
      });
    }
  }
  
  return hits;
}

function updateBeamOrigin(beam: BeamComponent, world: World<Entity>) {
  // Find the weapon owner to update beam origin position
  // This would be more sophisticated in a real implementation
  for (const entity of world.entities) {
    const e = entity as Entity & { 
      weapon?: WeaponComponent;
      position?: [number, number, number];
    };
    
    if (e.weapon?.id === beam.sourceWeaponId && e.position) {
      beam.origin = [e.position[0], e.position[1], e.position[2]];
      break;
    }
  }
}
