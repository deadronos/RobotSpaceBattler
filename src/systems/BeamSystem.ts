import type { World } from "miniplex";

import { resolveEntity, resolveOwner } from "../ecs/ecsResolve";
import { type Entity, notifyEntityChanged } from "../ecs/miniplexStore";
import type { BeamComponent, DamageEvent, WeaponComponent } from "../ecs/weapons";
import type { Rng } from "../utils/seededRng";
import { extractEntityIdFromRapierHit } from "./rapierHelpers";
import type { WeaponFiredEvent } from "./WeaponSystem";

const POSITION_EPSILON = 0.0001;

// Monotonic counter to guarantee uniqueness when timestamps collide.
// Date.now() can return the same millisecond for rapid successive events;
// append a counter to generated beam ids to avoid duplicate React keys.
let beamIdCounter = 0;

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
  targetId: number;
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
  simNowMs?: number,
  rapierWorld?: unknown,
) {
  void _dt;
  void _rng;
  const now = typeof simNowMs === "number" ? simNowMs : Date.now();

  processBeamFireEvents(world, weaponFiredEvents, now);
  processBeamTicks(world, events, now, rapierWorld);
}

export function processBeamFireEvents(
  world: World<Entity>,
  weaponFiredEvents: WeaponFiredEvent[],
  now: number,
) {
  if (weaponFiredEvents.length === 0) return;

  const beamQuery = world.with("beam") as unknown as { entities: BeamEntity[] };

  for (const fireEvent of weaponFiredEvents) {
    if (fireEvent.type !== "laser") continue;

    const owner = resolveOwner(world, {
      ownerId: fireEvent.ownerId,
      weaponId: fireEvent.weaponId,
    }) as BeamOwnerEntity | undefined;

    const weapon = owner?.weapon;
    if (!owner || !weapon) continue;

    const duration = weapon.beamParams?.duration ?? 2000;
    const width = weapon.beamParams?.width ?? 0.1;
    const length = weapon.range || 50;

    const existing = beamQuery.entities.find((candidate) => {
      const beam = candidate.beam;
      return (
        beam &&
        beam.sourceWeaponId === fireEvent.weaponId &&
        beam.ownerId === fireEvent.ownerId
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

    const counter = ++beamIdCounter;
    const beamEntity: BeamEntity = {
      id: `beam_${fireEvent.weaponId}_${now}_${counter}`,
      position: [
        fireEvent.origin[0],
        fireEvent.origin[1],
        fireEvent.origin[2],
      ],
      team: weapon.team,
      beam: {
        sourceWeaponId: fireEvent.weaponId,
        ownerId: fireEvent.ownerId,
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
        tickDamage: weapon.power / 10,
        tickInterval: weapon.beamParams?.tickInterval ?? 100,
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
) {
  const beamQuery = world.with("beam") as unknown as { entities: BeamEntity[] };
  const beams = [...beamQuery.entities];

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
  if (
    rigid &&
    typeof rigid.translation === "function"
  ) {
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

  if (!beamEntity.position || !vectorsEqual(beamEntity.position, sourcePosition)) {
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
) {
  const normalized = normalize(direction);
  if (!normalized) {
    return [] as Array<{ position: [number, number, number]; targetId: number }>;
  }

  const rapierHits =
    tryRapierBeamRaycast(origin, normalized, length, rapierWorld) ?? [];

  let candidates: BeamHitCandidate[] = rapierHits;

  if (candidates.length === 0) {
    candidates = fallbackBeamRaycast(origin, normalized, length, width, world);
  } else {
    const fallback = fallbackBeamRaycast(origin, normalized, length, width, world);
    for (const candidate of fallback) {
      if (!candidates.some((existing) => existing.targetId === candidate.targetId)) {
        candidates.push(candidate);
      }
    }
  }

  const filtered: BeamHitCandidate[] = [];
  for (const candidate of candidates) {
    const target = resolveEntity(world, candidate.targetId);
    if (!target) continue;

    const team = (target as { team?: string }).team;
    if (ownerTeam && team === ownerTeam) continue;

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

  const hits: BeamHitCandidate[] = [];

  const processHit = (raw: unknown) => {
    if (!raw) return;
    if (Array.isArray(raw)) {
      for (const nested of raw) processHit(nested);
      return;
    }

    const hit = raw as Record<string, unknown>;
    const targetId = extractEntityIdFromRapierHit(hit);
    if (typeof targetId !== "number") {
      return;
    }

    const point = extractPointFromRapierHit(hit, origin, direction, length);
    if (!point) {
      return;
    }

    const distance = distanceAlongRay(origin, point, direction);
    hits.push({ targetId, position: point, distance });
  };

  try {
    const rw = rapierWorld as Record<string, unknown>;
    let attempted = false;

    const ray = {
      origin: { x: origin[0], y: origin[1], z: origin[2] },
      dir: { x: direction[0], y: direction[1], z: direction[2] },
    };

    if (
      rw.queryPipeline &&
      typeof (rw.queryPipeline as { intersectionsWithRay?: unknown }).intersectionsWithRay ===
        "function"
    ) {
      attempted = true;
      try {
        const qp = rw.queryPipeline as {
          intersectionsWithRay?: (
            bodies: unknown,
            colliders: unknown,
            ray: unknown,
            maxToi: number,
            solid?: boolean,
            callback?: (hit: unknown) => boolean,
          ) => void;
        };
        const bodies = (rw as Record<string, unknown>)["bodies"];
        const colliders = (rw as Record<string, unknown>)["colliders"];
        qp.intersectionsWithRay?.(bodies, colliders, ray, length, true, (hit) => {
          processHit(hit);
          return true;
        });
      } catch {
        /* fall back to other strategies */
      }
    }

    if (
      typeof (rw as { castRay?: unknown }).castRay === "function"
    ) {
      attempted = true;
      processHit((rw as { castRay: (...args: unknown[]) => unknown }).castRay(ray, length, true));
    }

    if (
      rw.raw &&
      typeof (rw.raw as { castRay?: unknown }).castRay === "function"
    ) {
      attempted = true;
      const raw = rw.raw as { castRay: (...args: unknown[]) => unknown };
      processHit(raw.castRay(ray, length, true));
    }

    if (!attempted) {
      return null;
    }
  } catch {
    return null;
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

  const query = world.with("team", "position") as unknown as {
    entities: Array<
      Entity & {
        position: [number, number, number];
        team?: string;
        beam?: BeamComponent;
      }
    >;
  };

  for (const candidate of query.entities) {
    if (candidate.beam) continue;

    const [ex, ey, ez] = candidate.position;
    const toEntity = [ex - ox, ey - oy, ez - oz];
    const projectionLength = toEntity[0] * dx + toEntity[1] * dy + toEntity[2] * dz;

    if (projectionLength < 0 || projectionLength > length) continue;

    const closestPoint: [number, number, number] = [
      ox + dx * projectionLength,
      oy + dy * projectionLength,
      oz + dz * projectionLength,
    ];

    const distanceToBeam = Math.sqrt(
      (ex - closestPoint[0]) ** 2 +
        (ey - closestPoint[1]) ** 2 +
        (ez - closestPoint[2]) ** 2,
    );

    if (distanceToBeam <= beamRadius) {
      hits.push({
        position: closestPoint,
        targetId: candidate.id as unknown as number,
        distance: projectionLength,
      });
    }
  }

  return hits;
}

function normalize(direction: [number, number, number]) {
  const [dx, dy, dz] = direction;
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (length < POSITION_EPSILON) {
    return null;
  }
  return [dx / length, dy / length, dz / length] as [number, number, number];
}

function vectorsEqual(
  a: [number, number, number],
  b: [number, number, number],
) {
  return (
    Math.abs(a[0] - b[0]) <= POSITION_EPSILON &&
    Math.abs(a[1] - b[1]) <= POSITION_EPSILON &&
    Math.abs(a[2] - b[2]) <= POSITION_EPSILON
  );
}

function extractPointFromRapierHit(
  hit: Record<string, unknown>,
  origin: [number, number, number],
  direction: [number, number, number],
  maxDistance: number,
) {
  const pointValue = hit["point"] ?? hit["hitPoint"] ?? hit["position"];
  const parsedPoint = parsePoint(pointValue);
  if (parsedPoint) {
    return parsedPoint;
  }

  const toi = typeof hit["toi"] === "number" ? (hit["toi"] as number) : undefined;
  if (typeof toi === "number") {
    const distance = Math.min(Math.max(toi, 0), maxDistance);
    return [
      origin[0] + direction[0] * distance,
      origin[1] + direction[1] * distance,
      origin[2] + direction[2] * distance,
    ] as [number, number, number];
  }

  const distance =
    typeof hit["distance"] === "number" ? (hit["distance"] as number) : undefined;
  if (typeof distance === "number") {
    const clamped = Math.min(Math.max(distance, 0), maxDistance);
    return [
      origin[0] + direction[0] * clamped,
      origin[1] + direction[1] * clamped,
      origin[2] + direction[2] * clamped,
    ] as [number, number, number];
  }

  return null;
}

function parsePoint(value: unknown) {
  if (!value) return null;
  if (Array.isArray(value) && value.length >= 3) {
    const [x, y, z] = value;
    if (
      typeof x === "number" &&
      typeof y === "number" &&
      typeof z === "number"
    ) {
      return [x, y, z] as [number, number, number];
    }
  }
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    const x = v["x"];
    const y = v["y"];
    const z = v["z"];
    if (
      typeof x === "number" &&
      typeof y === "number" &&
      typeof z === "number"
    ) {
      return [x, y, z] as [number, number, number];
    }
  }
  return null;
}

function distanceAlongRay(
  origin: [number, number, number],
  point: [number, number, number],
  direction: [number, number, number],
) {
  const dx = point[0] - origin[0];
  const dy = point[1] - origin[1];
  const dz = point[2] - origin[2];
  return dx * direction[0] + dy * direction[1] + dz * direction[2];
}
