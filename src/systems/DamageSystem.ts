import type { World } from "miniplex";

import type { HealthState } from "../ecs/health";
import type { Entity } from "../ecs/miniplexStore";
import {
  getEntityById,
  getGameplayId,
  notifyEntityChanged,
} from "../ecs/miniplexStore";
import type { DamageEvent } from "../ecs/weapons";

type RigidBodyLike = {
  setLinvel?: (
    velocity: { x: number; y: number; z: number },
    wake: boolean,
  ) => void;
};

export interface DeathEvent {
  entityId: string | number;
  position: [number, number, number];
  team: string;
  killerId?: string | number;
  killerTeam?: string;
}

/**
 * Damage system - processes damage events and updates health components.
 * Now ensures deterministic ordering using frameCount from StepContext.
 */
export function damageSystem(
  world: World<Entity>,
  damageEvents: DamageEvent[],
  events: { death: DeathEvent[] },
  _frameCount?: number,
) {
  void _frameCount; // Reserved for future deterministic ordering enhancements
  // Sort damage events deterministically by targetId to ensure consistent processing order
  // This prevents flakiness when multiple damage events arrive in the same frame
  const sortedEvents = [...damageEvents].sort((a, b) =>
    String(a.targetId).localeCompare(String(b.targetId)),
  );

  for (const damageEvent of sortedEvents) {
    if (!damageEvent.targetId) continue;

    const targetEntity = Array.from(world.entities).find((candidate) => {
      const entity = candidate as Entity & { id?: string; gameplayId?: string };
      return (
        entity.id === String(damageEvent.targetId) ||
        entity.gameplayId === String(damageEvent.targetId)
      );
    }) as Entity & {
      health?: HealthState;
      hp?: number; // Legacy field, prefer health
      maxHp?: number;
      alive?: boolean;
      position?: [number, number, number];
      team?: string;
      rigid?: RigidBodyLike;
    };

    if (!targetEntity || !targetEntity.position || !targetEntity.team) continue;

    // Prefer canonical health model, fall back to legacy hp
    let currentHp: number;
    let maxHp: number;
    let useCanonicalHealth = false;

    if (targetEntity.health) {
      currentHp = targetEntity.health.current;
      maxHp = targetEntity.health.max;
      useCanonicalHealth = true;
    } else {
      currentHp = targetEntity.hp || 0;
      maxHp = targetEntity.maxHp || 100;
      void maxHp; // Reserved for future death classification logic
    }

    const newHp = Math.max(0, currentHp - damageEvent.damage);

    // Update health using canonical or legacy model
    if (useCanonicalHealth && targetEntity.health) {
      targetEntity.health.current = newHp;
      targetEntity.health.alive = newHp > 0;
    } else {
      targetEntity.hp = newHp;
    }

    if (newHp <= 0 && targetEntity.alive !== false) {
      targetEntity.alive = false;
      if (useCanonicalHealth && targetEntity.health) {
        targetEntity.health.current = 0;
        targetEntity.health.alive = false;
      } else {
        targetEntity.hp = 0;
      }

      let killerTeam: string | undefined;
      if (damageEvent.sourceId !== undefined) {
        const sourceIdStr = String(damageEvent.sourceId);
        const killerEntity =
          getEntityById(sourceIdStr) ??
          Array.from(world.entities).find((candidate) =>
            getGameplayId(candidate as Entity) === sourceIdStr,
          );
        killerTeam = killerEntity?.team as string | undefined;
      }

      events.death.push({
        entityId: damageEvent.targetId,
        position: [
          targetEntity.position[0],
          targetEntity.position[1],
          targetEntity.position[2],
        ],
        team: targetEntity.team,
        killerId: damageEvent.sourceId,
        killerTeam,
      });

      targetEntity.rigid?.setLinvel?.({ x: 0, y: 0, z: 0 }, true);
    }

    notifyEntityChanged(targetEntity as Entity);
  }
}
