import type { World } from 'miniplex';

import { type Entity,getEntityById } from '../ecs/miniplexStore';
import type { BeamComponent, DamageEvent, WeaponComponent } from '../ecs/weapons';
import type { Rng } from '../utils/seededRng';
import type { WeaponFiredEvent } from './WeaponSystem';

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

/**
 * Beam system for laser weapons.
 * Creates beam entities for continuous lasers and handles tick damage.
 */
export function beamSystem(
  world: World<Entity>,
  dt: number,
  _rng: Rng,
  weaponFiredEvents: WeaponFiredEvent[],
  events: { damage: DamageEvent[] }
) {
  for (const fireEvent of weaponFiredEvents) {
    if (fireEvent.type !== 'laser') continue;

    const owner = resolveOwner(world, fireEvent) as (Entity & {
      weapon?: WeaponComponent;
      position?: [number, number, number];
      team?: string;
    }) | undefined;

    const weapon = owner?.weapon;
    if (!owner || !weapon) continue;

    const duration = weapon.beamParams?.duration || 2000;
    const now = Date.now();
    // Try to find an existing beam for this weapon/owner and update it instead of spawning duplicates
    const existing = Array.from(world.entities).find((e) => {
      const b = (e as Entity & { beam?: BeamComponent }).beam;
      return b && b.sourceWeaponId === fireEvent.weaponId && b.ownerId === fireEvent.ownerId;
    }) as (Entity & { beam: BeamComponent }) | undefined;

    if (existing) {
      existing.beam.origin = [fireEvent.origin[0], fireEvent.origin[1], fireEvent.origin[2]];
      existing.beam.direction = [fireEvent.direction[0], fireEvent.direction[1], fireEvent.direction[2]];
      existing.beam.length = weapon.range || 50;
      existing.beam.width = weapon.beamParams?.width || 0.1;
      // extend active window based on latest shot
      existing.beam.activeUntil = now + duration;
    } else {
      const beamEntity: Entity & { beam: BeamComponent } = {
        id: 'beam_' + fireEvent.weaponId + '_' + now,
        position: [fireEvent.origin[0], fireEvent.origin[1], fireEvent.origin[2]],
        team: weapon.team,
        beam: {
          sourceWeaponId: fireEvent.weaponId,
          ownerId: fireEvent.ownerId,
          origin: [fireEvent.origin[0], fireEvent.origin[1], fireEvent.origin[2]],
          direction: [fireEvent.direction[0], fireEvent.direction[1], fireEvent.direction[2]],
          length: weapon.range || 50,
          width: weapon.beamParams?.width || 0.1,
          activeUntil: now + duration,
          tickDamage: weapon.power / 10,
          tickInterval: weapon.beamParams?.tickInterval || 100,
          lastTickAt: now,
          firedAt: now,
        },
      };
      world.add(beamEntity);
    }
  }

  for (const entity of world.entities) {
    const e = entity as Entity & { beam?: BeamComponent };
    const { beam } = e;
    if (!beam) continue;

    const owner =
      resolveEntity(world, beam.ownerId) ??
      Array.from(world.entities).find((candidate) => {
        const ownerCandidate = candidate as Entity & { weapon?: WeaponComponent };
        return ownerCandidate.weapon?.id === beam.sourceWeaponId;
      });

    const now = Date.now();

    // Remove beam if expired, time anomaly, or owner no longer exists
    if (!owner || now >= beam.activeUntil || now < beam.firedAt) {
      world.remove(entity);
      continue;
    }

    if (now >= beam.lastTickAt + beam.tickInterval) {
      beam.lastTickAt = now;

      const hits = performBeamRaycast(
        beam.origin,
        beam.direction,
        beam.length,
        world,
        (owner as { team?: string })?.team
      );

      for (const hit of hits) {
        events.damage.push({
          sourceId: beam.ownerId,
          weaponId: beam.sourceWeaponId,
          targetId: hit.targetId,
          position: hit.position,
          damage: beam.tickDamage,
        });
      }
    }

    updateBeamOrigin(world, beam);
  }
}

function performBeamRaycast(
  origin: [number, number, number],
  direction: [number, number, number],
  length: number,
  world: World<Entity>,
  ownerTeam?: string
): Array<{ position: [number, number, number]; targetId: number }> {
  const hits: Array<{ position: [number, number, number]; targetId: number }> = [];

  const [ox, oy, oz] = origin;
  const [dx, dy, dz] = direction;

  const dirLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const ndx = dx / dirLength;
  const ndy = dy / dirLength;
  const ndz = dz / dirLength;

  for (const entity of world.entities) {
    const candidate = entity as Entity & {
      position?: [number, number, number];
      team?: string;
      beam?: BeamComponent;
      weapon?: WeaponComponent;
    };

    if (!candidate.position || !candidate.team || candidate.beam) continue;
    if (ownerTeam && candidate.team === ownerTeam) continue;

    const [ex, ey, ez] = candidate.position;
    const toEntity = [ex - ox, ey - oy, ez - oz];
    const projectionLength = toEntity[0] * ndx + toEntity[1] * ndy + toEntity[2] * ndz;

    if (projectionLength < 0 || projectionLength > length) continue;

    const closestPoint = [
      ox + ndx * projectionLength,
      oy + ndy * projectionLength,
      oz + ndz * projectionLength,
    ];

    const distanceToBeam = Math.sqrt(
      (ex - closestPoint[0]) ** 2 +
        (ey - closestPoint[1]) ** 2 +
        (ez - closestPoint[2]) ** 2
    );

    const beamRadius = 0.5;
    if (distanceToBeam <= beamRadius) {
      hits.push({
        position: closestPoint as [number, number, number],
        targetId: candidate.id as unknown as number,
      });
    }
  }

  return hits;
}

function updateBeamOrigin(world: World<Entity>, beam: BeamComponent) {
  const owner =
    resolveEntity(world, beam.ownerId) ??
    Array.from(world.entities).find((candidate) => {
      const ownerCandidate = candidate as Entity & { weapon?: WeaponComponent };
      return ownerCandidate.weapon?.id === beam.sourceWeaponId;
    });

  if (!owner) {
    return;
  }

  const rigid = (owner as { rigid?: { translation: () => { x: number; y: number; z: number } } }).rigid;
  if (rigid) {
    const translation = rigid.translation();
    beam.origin = [translation.x, translation.y, translation.z];
    return;
  }

  const position = (owner as { position?: [number, number, number] }).position;
  if (position) {
    beam.origin = [position[0], position[1], position[2]];
  }
}



