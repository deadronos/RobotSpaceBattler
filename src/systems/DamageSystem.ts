import type { World } from 'miniplex';

import type { Entity } from '../ecs/miniplexStore';
import type { DamageEvent } from '../ecs/weapons';

export interface DeathEvent {
  entityId: number;
  position: [number, number, number];
  team: string;
}

/**
 * Damage system - processes damage events and updates health components.
 */
export function damageSystem(
  world: World<Entity>,
  damageEvents: DamageEvent[],
  events: { death: DeathEvent[] }
) {
  for (const damageEvent of damageEvents) {
    if (!damageEvent.targetId) continue;

    // Find the target entity
    const targetEntity = Array.from(world.entities).find(e => 
      (e.id as unknown as number) === damageEvent.targetId
    ) as Entity & { 
      hp?: number;
      maxHp?: number;
      alive?: boolean;
      position?: [number, number, number];
      team?: string;
    };

    if (!targetEntity || !targetEntity.position || !targetEntity.team) continue;

    // Apply damage
    const currentHp = targetEntity.hp || 0;
    const newHp = Math.max(0, currentHp - damageEvent.damage);
    targetEntity.hp = newHp;

    // Check for death
    if (newHp <= 0 && targetEntity.alive !== false) {
      targetEntity.alive = false;
      
      // Emit death event
      events.death.push({
        entityId: damageEvent.targetId,
        position: [targetEntity.position[0], targetEntity.position[1], targetEntity.position[2]],
        team: targetEntity.team,
      });

      // Stop movement if the entity has physics
      const rigidBody = targetEntity.rigid as any;
      if (rigidBody && rigidBody.setLinvel) {
        rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
    }
  }
}