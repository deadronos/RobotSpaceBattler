import type { World } from 'miniplex';

import { type Entity,getEntityById } from '../ecs/miniplexStore';
import type { DamageEvent, WeaponComponent } from '../ecs/weapons';
import type { Rng } from '../utils/seededRng';
import type { WeaponFiredEvent } from './WeaponSystem';

export interface ImpactEvent {
  position: [number, number, number];
  normal: [number, number, number];
  targetId?: number;
}

function resolveEntity(world: World<Entity>, id?: number) {
  if (typeof id !== 'number') {
    return undefined;
  }

  const lookup = getEntityById(id) as Entity | undefined;
  if (lookup) {
    return lookup;
  }

  return Array.from(world.entities).find(
    (candidate) => (candidate.id as unknown as number) === id
  ) as Entity | undefined;
}

function resolveOwner(world: World<Entity>, fireEvent: WeaponFiredEvent) {
  const direct = resolveEntity(world, fireEvent.ownerId);
  if (direct) {
    return direct;
  }

  return Array.from(world.entities).find((candidate) => {
    const entity = candidate as Entity & { weapon?: WeaponComponent };
    return entity.weapon?.id === fireEvent.weaponId;
  });
}

export function hitscanSystem(
  world: World<Entity>,
  rng: Rng,
  weaponFiredEvents: WeaponFiredEvent[],
  events: { damage: DamageEvent[]; impact: ImpactEvent[] }
) {
  for (const fireEvent of weaponFiredEvents) {
    if (fireEvent.type !== 'gun') continue;

    const owner = resolveOwner(world, fireEvent) as (Entity & {
      weapon?: WeaponComponent;
      team?: string;
      position?: [number, number, number];
    }) | undefined;

    const weapon = owner?.weapon;
    if (!owner || !weapon) continue;

    const spreadAngle = weapon.spread || 0;
    const accuracy = weapon.accuracy || 1.0;

    const spread = spreadAngle * (1 - accuracy) * (rng() - 0.5) * 2;
    const direction = applySpread(fireEvent.direction, spread);

    const targetEntity = resolveEntity(world, fireEvent.targetId);

    const hit = performRaycast(
      fireEvent.origin,
      direction,
      weapon.range || 100,
      world,
      targetEntity,
      fireEvent.ownerId,
      owner.team
    );

    if (hit) {
      events.damage.push({
        sourceId: fireEvent.ownerId,
        weaponId: fireEvent.weaponId,
        targetId: hit.targetId,
        position: hit.position,
        damage: weapon.power,
      });

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
  spread: number
): [number, number, number] {
  const [x, y, z] = direction;
  const yaw = Math.atan2(z, x) + spread;
  const len = Math.sqrt(x * x + y * y + z * z);
  return [
    Math.cos(yaw) * len,
    y,
    Math.sin(yaw) * len,
  ];
}

function performRaycast(
  origin: [number, number, number],
  direction: [number, number, number],
  maxDistance: number,
  world: World<Entity>,
  preferredTarget: Entity | undefined,
  ownerId: number,
  ownerTeam?: string
): { position: [number, number, number]; normal: [number, number, number]; targetId?: number } | null {
  const [ox, oy, oz] = origin;
  const [dx, dy, dz] = direction;

  const attemptHit = (candidate: Entity & {
    position?: [number, number, number];
    team?: string;
    weapon?: WeaponComponent;
  }) => {
    if (!candidate.position) return null;
    if (typeof candidate.id === 'number' && candidate.id === ownerId) return null;
    if (candidate.weapon) return null;
    if (ownerTeam && candidate.team === ownerTeam) return null;

    const [ex, ey, ez] = candidate.position;
    const toTarget = [ex - ox, ey - oy, ez - oz];
    const distance = Math.sqrt(toTarget[0] ** 2 + toTarget[1] ** 2 + toTarget[2] ** 2);

    if (distance > maxDistance) return null;

    const dot = (toTarget[0] * dx + toTarget[1] * dy + toTarget[2] * dz) / distance;
    if (dot > 0.99) {
      return {
        position: candidate.position as [number, number, number],
        normal: [-dx, -dy, -dz] as [number, number, number],
        targetId: candidate.id as unknown as number,
      };
    }

    return null;
  };

  if (preferredTarget) {
    const preferredHit = attemptHit(preferredTarget as Entity & {
      position?: [number, number, number];
      team?: string;
      weapon?: WeaponComponent;
    });
    if (preferredHit) {
      return preferredHit;
    }
  }

  for (const entity of world.entities) {
    const candidate = entity as Entity & {
      position?: [number, number, number];
      team?: string;
      weapon?: WeaponComponent;
    };

    const hit = attemptHit(candidate);
    if (hit) {
      return hit;
    }
  }

  return null;
}

