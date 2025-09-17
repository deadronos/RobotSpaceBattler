import type { World } from 'miniplex';

import type { Entity } from '../ecs/miniplexStore';
import { getEntityById } from '../ecs/miniplexStore';
import type { DamageEvent } from '../ecs/weapons';

type RigidBodyLike = {
  setLinvel?: (velocity: { x: number; y: number; z: number }, wake: boolean) => void;
};

export interface DeathEvent {
  entityId: number;
  position: [number, number, number];
  team: string;
  killerId?: number;
  killerTeam?: string;
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

    const targetEntity = Array.from(world.entities).find(
      (candidate) => (candidate.id as unknown as number) === damageEvent.targetId
    ) as Entity & {
      hp?: number;
      maxHp?: number;
      alive?: boolean;
      position?: [number, number, number];
      team?: string;
      rigid?: RigidBodyLike;
    };

    if (!targetEntity || !targetEntity.position || !targetEntity.team) continue;

    const currentHp = targetEntity.hp || 0;
    const newHp = Math.max(0, currentHp - damageEvent.damage);
    targetEntity.hp = newHp;

    if (newHp <= 0 && targetEntity.alive !== false) {
      targetEntity.alive = false;
      targetEntity.hp = 0;

      let killerTeam: string | undefined;
      if (typeof damageEvent.sourceId === 'number') {
        const killerEntity = getEntityById(damageEvent.sourceId) as Entity | undefined;
        killerTeam = killerEntity?.team as string | undefined;
      }

      events.death.push({
        entityId: damageEvent.targetId,
        position: [targetEntity.position[0], targetEntity.position[1], targetEntity.position[2]],
        team: targetEntity.team,
        killerId: damageEvent.sourceId,
        killerTeam,
      });

      targetEntity.rigid?.setLinvel?.({ x: 0, y: 0, z: 0 }, true);
    }
  }
}
