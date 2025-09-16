import type { World } from 'miniplex';

import { type Entity,getEntityById } from '../ecs/miniplexStore';
import type { DamageEvent, WeaponComponent } from '../ecs/weapons';
import type { Rng } from '../utils/seededRng';
import { extractEntityIdFromRapierHit } from './rapierHelpers';
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
  events: { damage: DamageEvent[]; impact: ImpactEvent[] },
  rapierWorld?: unknown
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
      owner.team,
      rapierWorld
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
  ,
  rapierWorld?: unknown
): { position: [number, number, number]; normal: [number, number, number]; targetId?: number } | null {
  const [ox, oy, oz] = origin;
  const [dx, dy, dz] = direction;

  // If a Rapier world is available, attempt to perform a physics raycast and
  // map the hit point back to a nearby entity. This gives more accurate
  // physics-based hits when possible; otherwise fallback to the heuristic.
  if (rapierWorld) {
    try {
      const rw = rapierWorld as unknown as Record<string, unknown>;
      let hit: unknown = undefined;

      if (typeof (rw as { castRay?: unknown }).castRay === 'function') {
        const fn = (rw as { castRay?: (...args: unknown[]) => unknown }).castRay!;
        hit = fn({ origin: { x: ox, y: oy, z: oz }, dir: { x: dx, y: dy, z: dz } }, maxDistance);
      }

      if (!hit && rw.queryPipeline && typeof (rw.queryPipeline as { castRay?: unknown }).castRay === 'function') {
        try {
          const qp = rw.queryPipeline as { castRay?: (...args: unknown[]) => unknown };
          const bodies = (rw as Record<string, unknown>)['bodies'];
          const colliders = (rw as Record<string, unknown>)['colliders'];
          if (qp.castRay) {
            hit = qp.castRay(bodies, colliders, { origin: { x: ox, y: oy, z: oz }, dir: { x: dx, y: dy, z: dz } }, maxDistance);
          }
        } catch {
          /* swallow errors and fall back to heuristic */
        }
      }

      if (!hit && rw.raw && typeof (rw.raw as { castRay?: unknown }).castRay === 'function') {
        try {
          const raw = rw.raw as { castRay?: (...args: unknown[]) => unknown };
          if (raw.castRay) hit = raw.castRay({ origin: { x: ox, y: oy, z: oz }, dir: { x: dx, y: dy, z: dz } }, maxDistance);
        } catch {
          /* ignore and fall back */
        }
      }

      // Try to extract a point from the hit result
      let px: number | undefined;
      let py: number | undefined;
      let pz: number | undefined;

      if (hit && typeof hit === 'object') {
        const h = hit as Record<string, unknown>;
        const point = h['point'] ?? h['hitPoint'] ?? h['position'];
        if (point && typeof point === 'object') {
          // common shapes: { x,y,z } or array-like [x,y,z]
          const po = point as Record<string, unknown>;
          const arr = point as unknown as unknown[];
          const vx = typeof po['x'] === 'number' ? (po['x'] as number) : undefined;
          const vy = typeof po['y'] === 'number' ? (po['y'] as number) : undefined;
          const vz = typeof po['z'] === 'number' ? (po['z'] as number) : undefined;
          px = vx ?? (Array.isArray(arr) && typeof arr[0] === 'number' ? (arr[0] as number) : undefined);
          py = vy ?? (Array.isArray(arr) && typeof arr[1] === 'number' ? (arr[1] as number) : undefined);
          pz = vz ?? (Array.isArray(arr) && typeof arr[2] === 'number' ? (arr[2] as number) : undefined);
        }
      }

      if (px !== undefined && py !== undefined && pz !== undefined) {
        // Find nearest entity to hit point
        // First try to map rapier hit to entity id directly
        const hitEntityId = extractEntityIdFromRapierHit(hit);
        if (typeof hitEntityId === 'number') {
          return {
            position: [px, py, pz],
            normal: [-dx, -dy, -dz],
            targetId: hitEntityId,
          };
        }

        let best: { e: Entity; d2: number } | undefined;
        for (const candidate of world.entities) {
          const c = candidate as Entity & { position?: [number, number, number]; rigid?: unknown; team?: string; weapon?: WeaponComponent };
          if (!c.position) continue;
          if (typeof c.id === 'number' && c.id === ownerId) continue;
          if (c.weapon) continue;
          if (ownerTeam && c.team === ownerTeam) continue;

          // prefer rigid translation when available
          let cx = c.position[0];
          let cy = c.position[1];
          let cz = c.position[2];
          if (c.rigid && typeof (c.rigid as Record<string, unknown>)['translation'] === 'function') {
            try {
              // translation may be exposed on the rapier rigid ref
              const t = (c.rigid as unknown as Record<string, unknown>)['translation'] as (() => { x: number; y: number; z: number }) | undefined;
              if (t) {
                const tv = t();
                cx = tv.x; cy = tv.y; cz = tv.z;
              }
            } catch {
              // ignore and use position
            }
          }

          const dxp = cx - px;
          const dyp = cy - py;
          const dzp = cz - pz;
          const d2 = dxp * dxp + dyp * dyp + dzp * dzp;
          if (!best || d2 < best.d2) best = { e: c, d2 };
        }

        if (best && best.d2 < 1.5 * 1.5) {
          return {
            position: [px, py, pz],
            normal: [-dx, -dy, -dz],
            targetId: best.e.id as unknown as number,
          };
        }
      }
    } catch {
      // fall through to heuristic
    }
  }

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

