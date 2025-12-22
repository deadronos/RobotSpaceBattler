import type { ObstacleEntity } from '../../../ecs/world';
import { vec3 } from '../../../lib/math/vec3';
import { nextId } from './formUtils';
import type { FormState } from './types';

export function buildObstacle(form: FormState, existingIds: Set<string>): ObstacleEntity {
  const id = nextId(form.id, existingIds, form.counter);

  const base: ObstacleEntity = {
    id,
    kind: 'obstacle',
    obstacleType: form.type,
    position: vec3(form.posX, 0, form.posZ),
    blocksVision: form.type === 'hazard' ? false : form.blocksVision,
    blocksMovement: form.type === 'hazard' ? false : form.blocksMovement,
    active: form.type === 'hazard' ? false : form.active,
  };

  if (form.type === 'hazard') {
    base.shape = { kind: 'circle', radius: Math.max(0.1, form.radius) };
    base.hazardSchedule = {
      periodMs: Math.max(1, form.hazardPeriod),
      activeMs: Math.max(0, form.hazardActive),
      offsetMs: form.hazardOffset,
    };
    base.hazardEffects = [
      {
        kind: 'damage',
        amount: Math.max(0, form.hazardDamage),
        perSecond: true,
      },
    ];
    return base;
  }

  base.shape = {
    kind: 'box',
    halfWidth: Math.max(0.1, form.halfWidth),
    halfDepth: Math.max(0.1, form.halfDepth),
  };

  if (form.type === 'destructible') {
    base.durability = Math.max(1, form.durability);
    base.maxDurability = Math.max(1, form.durability);
  }

  if (form.movementEnabled && form.movementKind !== 'none') {
    base.movementPattern =
      form.movementKind === 'rotation'
        ? {
            patternType: 'rotation',
            pivot: vec3(form.pivotX, 0, form.pivotZ),
            speed: form.movementSpeed,
            loop: true,
          }
        : {
            patternType: form.movementKind === 'oscillate' ? 'oscillate' : 'linear',
            points: [
              vec3(form.startX, 0, form.startZ),
              vec3(form.endX, 0, form.endZ),
            ],
            speed: form.movementSpeed,
            loop: true,
            pingPong: form.movementKind === 'oscillate',
          };
  }

  return base;
}
