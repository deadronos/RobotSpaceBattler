import type { Query,World } from "miniplex";

import { resolveEntity, resolveOwner } from "../ecs/ecsResolve";
import { type Entity, notifyEntityChanged } from "../ecs/miniplexStore";
import type { BeamComponent, DamageEvent, WeaponComponent } from "../ecs/weapons";
import { callIntersectionsWithRay, extractPoint, type RapierWorldOrAdapter } from "../utils/physicsAdapter";
import type { Rng } from "../utils/seededRng";
import { extractEntityIdFromRapierHit } from "./rapierHelpers";
import type { WeaponFiredEvent } from "./WeaponSystem";

// Monotonic counter was removed in favor of deterministic idFactory provided via StepContext.

// no-op helper types removed; BeamComponent uses tuple vectors from ecs/weapons

export type BeamEntity = Entity & {
  beam: BeamComponent;
  position?: [number, number, number];
  team?: string;
};

export type BeamOwnerEntity = Entity & {
  weapon?: WeaponComponent;
  team?: string;
  position?: [number, number, number];
  rigid?: { translation?: () => { x: number; y: number; z: number } };
};

interface BeamHitCandidate {
  targetId: string;
  position: [number, number, number];
  distance: number;
}

/**
 * Beam system for laser weapons.
 * Creates beam entities for continuous lasers and handles tick damage.
 */
export function beamSystem(
  world: World<Entity>,
  _dt: number,
  _rng: Rng,
  weaponFiredEvents: WeaponFiredEvent[],
  events: { damage: DamageEvent[] },
  stepContext: { simNowMs?: number; idFactory?: () => string; friendlyFire?: boolean },
  rapierWorld?: unknown,
) {
  void _dt;
  void _rng;
  if (!stepContext) {
    throw new Error('beamSystem requires a StepContext with simNowMs and idFactory for deterministic behavior');
  }
  const { simNowMs, idFactory, friendlyFire } = stepContext;
  if (typeof simNowMs !== 'number') {
    throw new Error('beamSystem requires stepContext.simNowMs');
  }
  if (typeof idFactory !== 'function') {
    throw new Error('beamSystem requires stepContext.idFactory to generate deterministic beam ids');
  }
  const now = simNowMs;

  processBeamFireEvents(world, weaponFiredEvents, now, idFactory);
  processBeamTicks(world, events, now, rapierWorld, { friendlyFire: !!friendlyFire });
}

export function processBeamFireEvents(
  world: World<Entity>,
  weaponFiredEvents: WeaponFiredEvent[],
  now: number,
  idFactory: () => string,
) {
  if (weaponFiredEvents.length === 0) return;

  const beamQuery = world.with("beam") as Query<BeamEntity>;

  for (const fireEvent of weaponFiredEvents) {
    if (fireEvent.type !== "laser") continue;

    const ownerLookupId = String(fireEvent.ownerId);
    const owner = resolveOwner(world, {
      ownerId: ownerLookupId,
      weaponId: fireEvent.weaponId,
    }) as BeamOwnerEntity | undefined;

    const weapon = owner?.weapon;
    if (!owner || !weapon) continue;

  const duration = weapon.beamParams?.durationMs ?? 2000;
  const width = weapon.beamParams?.width ?? 0.1;
    const length = weapon.range || 50;

    const existing = beamQuery.entities.find((candidate) => {
      const beam = candidate.beam;
      return (
        beam &&
        beam.sourceWeaponId === fireEvent.weaponId &&
        beam.ownerId === ownerLookupId
      );
    }) as BeamEntity | undefined;

    if (existing) {
      existing.beam.origin = [
        fireEvent.origin[0],
        fireEvent.origin[1],
        fireEvent.origin[2],
      ];
      existing.beam.direction = [
        fireEvent.direction[0],
        fireEvent.direction[1],
        fireEvent.direction[2],
      ];
      existing.beam.length = length;
      existing.beam.width = width;
      existing.beam.activeUntil = now + duration;
      existing.position = [
        fireEvent.origin[0],
        fireEvent.origin[1],
        fireEvent.origin[2],
      ];
      notifyEntityChanged(existing as Entity);
      continue;
    }

    const beamEntity: BeamEntity = {
      gameplayId: idFactory(),
      position: [fireEvent.origin[0], fireEvent.origin[1], fireEvent.origin[2]],
      team: weapon.team,
      beam: {
        sourceWeaponId: fireEvent.weaponId,
        ownerId: ownerLookupId,
        origin: [
          fireEvent.origin[0],
          fireEvent.origin[1],
          fireEvent.origin[2],
        ],
        direction: [
          fireEvent.direction[0],
          fireEvent.direction[1],
          fireEvent.direction[2],
        ],
        length,
        width,
        activeUntil: now + duration,
        tickDamage: weapon.beamParams?.damagePerTick ?? weapon.power / 10,
        tickInterval: weapon.beamParams?.tickIntervalMs ?? 100,
        lastTickAt: now,
        firedAt: now,
      },
    };
  world.add(beamEntity);
  }
}

export function processBeamTicks(
  world: World<Entity>,
  events: { damage: DamageEvent[] },
  now: number,
  rapierWorld?: unknown,
  flags?: { friendlyFire?: boolean },
) {
  const beamQuery = world.with("beam") as Query<BeamEntity>;
  const beams = [...beamQuery.entities];
  const friendlyFire = !!flags?.friendlyFire;

  for (const entity of beams) {
    const beamEntity = entity as BeamEntity;
    const beam = beamEntity.beam;
    if (!beam) continue;

    const owner = resolveOwner(world, {
      ownerId: beam.ownerId,
      weaponId: beam.sourceWeaponId,
    }) as BeamOwnerEntity | undefined;

    if (!owner || now >= beam.activeUntil || now < beam.firedAt) {
      world.remove(entity as Entity);
      continue;
    }

    const syncResult = syncBeamToOwner(beamEntity, owner);
    if (syncResult.ownerMutated) {
      notifyEntityChanged(owner as Entity);
    }

    if (now >= beam.lastTickAt + beam.tickInterval) {
      beam.lastTickAt = now;

      const hits = performBeamRaycast(
        beam.origin,
        beam.direction,
        beam.length,
        beam.width,
        world,
        owner.team,
        rapierWorld,
        friendlyFire,
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

    if (syncResult.beamMutated) {
      notifyEntityChanged(beamEntity as Entity);
    }
  }
}

function syncBeamToOwner(beamEntity: BeamEntity, owner: BeamOwnerEntity) {
  let ownerMutated = false;
  let beamMutated = false;

  const rigid = owner.rigid;
  if (rigid && typeof rigid.translation === "function") {
    try {
      const translation = rigid.translation();
      const next: [number, number, number] = [
        translation.x,
        translation.y,
        translation.z,
      ];
      if (!owner.position || !vectorsEqual(owner.position, next)) {
        owner.position = next;
        ownerMutated = true;
      }
    } catch {
      /* ignore physics API errors */
    }
  }

  const sourcePosition = owner.position;
  if (!sourcePosition) {
    return { ownerMutated, beamMutated };
  }

  if (!beamEntity.beam.origin || !vectorsEqual(beamEntity.beam.origin, sourcePosition)) {
    beamEntity.beam.origin = [
      sourcePosition[0],
      sourcePosition[1],
      sourcePosition[2],
    ];
    beamMutated = true;
  }

  if (
    !beamEntity.position ||
    !vectorsEqual(beamEntity.position, sourcePosition)
  ) {
    beamEntity.position = [
      sourcePosition[0],
      sourcePosition[1],
      sourcePosition[2],
    ];
    beamMutated = true;
  }

  return { ownerMutated, beamMutated };
}

function performBeamRaycast(
  origin: [number, number, number],
  direction: [number, number, number],
  length: number,
  width: number,
  world: World<Entity>,
  ownerTeam?: string,
  rapierWorld?: unknown,
  friendlyFire: boolean = false,
) {
  const normalized = normalize(direction);
  if (!normalized) {
    return [] as Array<{
      position: [number, number, number];
      targetId: string;
    }>;
  }

  const rapierHits =
    tryRapierBeamRaycast(origin, normalized, length, rapierWorld) ?? [];

  let candidates: BeamHitCandidate[] = rapierHits;

  if (candidates.length === 0) {
    candidates = fallbackBeamRaycast(origin, normalized, length, width, world);
  } else {
    const fallback = fallbackBeamRaycast(
      origin,
      normalized,
      length,
      width,
      world,
    );
    for (const candidate of fallback) {
      if (
        !candidates.some((existing) => existing.targetId === candidate.targetId)
      ) {
        candidates.push(candidate);
      }
    }
  }

  const filtered: BeamHitCandidate[] = [];
  for (const candidate of candidates) {
    const target = resolveEntity(world, candidate.targetId);
    if (!target) continue;

    const team = (target as { team?: string }).team;
    // Respect friendlyFire: only exclude same-team hits when friendlyFire is false
    if (!friendlyFire && ownerTeam && team === ownerTeam) continue;

    filtered.push(candidate);
  }

  filtered.sort((a, b) => a.distance - b.distance);

  return filtered.map((candidate) => ({
    targetId: candidate.targetId,
    position: candidate.position,
  }));
}

function tryRapierBeamRaycast(
  origin: [number, number, number],
  direction: [number, number, number],
  length: number,
  rapierWorld?: unknown,
): BeamHitCandidate[] | null {
  if (!rapierWorld) return null;

  const rawHits = callIntersectionsWithRay(rapierWorld as RapierWorldOrAdapter | undefined, { x: origin[0], y: origin[1], z: origin[2] }, { x: direction[0], y: direction[1], z: direction[2] }, length);
  if (!rawHits) return null;

  const hits: BeamHitCandidate[] = [];
  for (const raw of rawHits) {
    if (!raw) continue;
    if (Array.isArray(raw)) {
      for (const nested of raw) {
        const id = extractEntityIdFromRapierHit(nested);
        if (typeof id !== 'string') continue;
        const point = extractPoint(nested);
        if (!point) continue;
        const distance = distanceAlongRay(origin, point as [number, number, number], direction);
        hits.push({ targetId: id, position: point as [number, number, number], distance });
      }
      continue;
    }
    const id = extractEntityIdFromRapierHit(raw);
    if (typeof id !== 'string') continue;
    const point = extractPoint(raw);
    if (!point) continue;
    const distance = distanceAlongRay(origin, point as [number, number, number], direction);
    hits.push({ targetId: id, position: point as [number, number, number], distance });
  }

  return hits.length > 0 ? hits : null;
}

function fallbackBeamRaycast(
  origin: [number, number, number],
  direction: [number, number, number],
  length: number,
  width: number,
  world: World<Entity>,
) {
  const hits: BeamHitCandidate[] = [];
  const [ox, oy, oz] = origin;
  const [dx, dy, dz] = direction;

  const beamRadius = Math.max(width * 0.5, 0.5);

  const query = world.with("team", "position") as Query<
    Entity & {
      position: [number, number, number];
      team?: string;
      beam?: BeamComponent;
    }
  >;

  for (const candidate of query.entities) {
    if (!candidate.position || !candidate.team || candidate.beam) continue;

    const [ex, ey, ez] = candidate.position;
    // Vector from ray origin to candidate
    const vx = ex - ox;
    const vy = ey - oy;
    const vz = ez - oz;

    // Projection length along the ray direction (direction is expected to be normalized by caller)
    const proj = vx * dx + vy * dy + vz * dz;
    if (proj < 0 || proj > length) continue;

    // Closest point on the ray to the candidate
    const cxp = ox + dx * proj;
    const cyp = oy + dy * proj;
    const czp = oz + dz * proj;

    const dist2 =
      (ex - cxp) * (ex - cxp) +
      (ey - cyp) * (ey - cyp) +
      (ez - czp) * (ez - czp);

    if (dist2 <= beamRadius * beamRadius) {
      hits.push({
        targetId: String(candidate.id),
        position: [cxp, cyp, czp],
        distance: proj,
      });
    }
  }

  return hits;
}

// Helper utilities
function vectorsEqual(a: [number, number, number], b: [number, number, number]) {
  const eps = 1e-4;
  return (
    Math.abs(a[0] - b[0]) <= eps &&
    Math.abs(a[1] - b[1]) <= eps &&
    Math.abs(a[2] - b[2]) <= eps
  );
}

function normalize(v: [number, number, number]) {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len <= 1e-9) return null;
  return [v[0] / len, v[1] / len, v[2] / len] as [number, number, number];
}

function distanceAlongRay(
  origin: [number, number, number],
  point: [number, number, number],
  direction: [number, number, number],
) {
  const dx = point[0] - origin[0];
  const dy = point[1] - origin[1];
  const dz = point[2] - origin[2];
  const dot = dx * direction[0] + dy * direction[1] + dz * direction[2];
  return dot;
}

// End of file
