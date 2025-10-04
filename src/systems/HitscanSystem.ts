import type { World } from "miniplex";

import { resolveEntity, resolveOwner } from "../ecs/ecsResolve";
import { type Entity } from "../ecs/miniplexStore";
import type { DamageEvent, WeaponComponent } from "../ecs/weapons";
import { callRaycast, type PhysicsAdapter, type RapierWorldLike, type RapierWorldOrAdapter, type RaycastAny, type RaycastResult } from "../utils/physicsAdapter";
import type { Rng } from "../utils/seededRng";
import { extractEntityIdFromRapierHit } from "./rapierHelpers";
import type { WeaponFiredEvent } from "./WeaponSystem";

export interface ImpactEvent {
  position: [number, number, number];
  normal: [number, number, number];
  targetId?: string;
}

export function hitscanSystem(...args: unknown[]) {
  // Support either positional args or single params object
  let world: World<Entity>;
  let rng: Rng;
  let weaponFiredEvents: WeaponFiredEvent[] = [];
  let events: { damage: DamageEvent[]; impact: ImpactEvent[] } = { damage: [], impact: [] };
  let rapierWorld: RapierWorldOrAdapter | undefined = undefined;

  if (
    args.length === 1 &&
    args[0] &&
    typeof args[0] === "object" &&
    "world" in args[0]
  ) {
    const p = args[0] as {
      world: World<Entity>;
      stepContext?: { rng?: Rng };
      weaponFiredEvents?: WeaponFiredEvent[];
      events?: { damage: DamageEvent[]; impact: ImpactEvent[] };
      physicsAdapter?: PhysicsAdapter;
      rapierWorld?: RapierWorldLike;
    };
    world = p.world;
    if (!p.stepContext) {
      throw new Error('hitscanSystem requires stepContext with a deterministic rng (stepContext.rng)');
    }
    rng = p.stepContext.rng as Rng;
    if (typeof rng !== 'function') {
      throw new Error('hitscanSystem requires stepContext.rng to be a function');
    }
    weaponFiredEvents = p.weaponFiredEvents ?? weaponFiredEvents;
    events = p.events ?? events;
    rapierWorld = p.physicsAdapter ?? p.rapierWorld;
  } else {
    world = args[0] as World<Entity>;
    rng = args[1] as Rng;
    if (typeof rng !== 'function') {
      throw new Error('hitscanSystem positional API requires rng as second argument for deterministic behavior');
    }
    weaponFiredEvents = (args[2] as WeaponFiredEvent[] | undefined) ?? weaponFiredEvents;
    events = (args[3] as { damage: DamageEvent[]; impact: ImpactEvent[] } | undefined) ?? events;
    rapierWorld = args[4] as RapierWorldOrAdapter | undefined;
  }

  for (const fireEvent of weaponFiredEvents) {
    if (fireEvent.type !== "gun") continue;

    const ownerLookupId = String(fireEvent.ownerId);
    const owner = resolveOwner(world, {
      ownerId: ownerLookupId,
      weaponId: fireEvent.weaponId,
    }) as
      | (Entity & {
          weapon?: WeaponComponent;
          team?: string;
          position?: [number, number, number];
        })
      | undefined;

    const weapon = owner?.weapon;
    if (!owner || !weapon) {
      // No owner in world (test harness): allow physics-only raycast path if physics adapter is available
      const hitFromAdapter = performRaycast(
        fireEvent.origin,
        fireEvent.direction,
        100,
        world,
        undefined,
        ownerLookupId,
        undefined,
        rapierWorld,
      );
      if (hitFromAdapter) {
        const targetIdStr = hitFromAdapter.targetId !== undefined ? String(hitFromAdapter.targetId) : undefined;
        events.damage.push({
          sourceId: ownerLookupId,
          weaponId: fireEvent.weaponId,
          targetId: targetIdStr,
          position: hitFromAdapter.position,
          damage: 1,
        });
        events.impact.push({
          position: hitFromAdapter.position,
          normal: hitFromAdapter.normal,
          targetId: targetIdStr,
        });
      }
      continue;
    }

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
      ownerLookupId,
      owner.team,
      rapierWorld,
    );

    if (hit) {
      const targetIdStr = hit.targetId !== undefined ? String(hit.targetId) : undefined;
      events.damage.push({
        sourceId: ownerLookupId,
        weaponId: fireEvent.weaponId,
        targetId: hit.targetId,
        position: hit.position,
        damage: weapon.power,
      });

      events.impact.push({
        position: hit.position,
        normal: hit.normal,
        targetId: targetIdStr,
      });
    }
  }
}

function applySpread(
  direction: [number, number, number],
  spread: number,
): [number, number, number] {
  const [x, y, z] = direction;
  const yaw = Math.atan2(z, x) + spread;
  const len = Math.sqrt(x * x + y * y + z * z);
  return [Math.cos(yaw) * len, y, Math.sin(yaw) * len];
}

function performRaycast(
  origin: [number, number, number],
  direction: [number, number, number],
  maxDistance: number,
  world: World<Entity>,
  preferredTarget: Entity | undefined,
  ownerId: string,
  ownerTeam?: string,
  rapierWorld?: unknown,
): {
  position: [number, number, number];
  normal: [number, number, number];
  targetId?: number | string;
} | null {
  // ownerId is a gameplay id string; compare against candidate ids/gameplayId
  const [ox, oy, oz] = origin;
  const [dx, dy, dz] = direction;

  // If a Rapier adapter or raw rapier world is available, try the centralized raycast helper
  if (rapierWorld) {
    try {
      const rayRes: RaycastAny = callRaycast(rapierWorld as RapierWorldOrAdapter | undefined, { x: ox, y: oy, z: oz }, { x: dx, y: dy, z: dz }, maxDistance, extractEntityIdFromRapierHit);
      if (rayRes) {
        // If the adapter returned a numeric 'toi' style result, synthesize a position from the TOI
        const raw = rayRes as Record<string, unknown>;
        const cand = raw['toi'] ?? raw['timeOfImpact'] ?? raw['time'];
        if (typeof cand === 'number') {
          const toi = cand as number;
          const pos: [number, number, number] = [ox + dx * toi, oy + dy * toi, oz + dz * toi];
          const mapped = extractEntityIdFromRapierHit(raw);
          const normal: [number, number, number] = [-dx, -dy, -dz];
          return { position: pos, normal, targetId: mapped };
        }

        // If we have a normalized position: map to entity if targetId present or fall back to nearest entity
        const isResult = (r: RaycastAny): r is RaycastResult => !!r && typeof r === 'object' && 'position' in (r as Record<string, unknown>);
        if (isResult(rayRes)) {
          const pos = rayRes.position;
          const mappedId = rayRes.targetId;
          if (mappedId) {
            const normal: [number, number, number] = [-dx, -dy, -dz];
            return { position: pos, normal, targetId: mappedId };
          }
        }
      }
    } catch {
      // fall through to heuristic
    }
  }

  const attemptHit = (
    candidate: Entity & {
      position?: [number, number, number];
      team?: string;
      weapon?: WeaponComponent;
    },
  ) => {
    if (!candidate.position) return null;
    // Skip the owner itself by comparing gameplay id or id string
    if (String(candidate.id) === ownerId) {
      return null;
    }
    if (
      typeof candidate.weapon?.ownerId === "string" &&
      candidate.weapon.ownerId === ownerId
    ) {
      return null;
    }
    // Do not exclude targets simply because they have a `weapon` component.
    if (ownerTeam && candidate.team === ownerTeam) return null;

    const [ex, ey, ez] = candidate.position;
    const toTarget = [ex - ox, ey - oy, ez - oz];
    const distance = Math.sqrt(
      toTarget[0] ** 2 + toTarget[1] ** 2 + toTarget[2] ** 2,
    );

    if (distance > maxDistance) return null;

    const dot = (toTarget[0] * dx + toTarget[1] * dy + toTarget[2] * dz) / distance;
    // If the candidate is not roughly in front of the shooter, skip it
    if (dot <= 0) return null;

    // Distance along the ray to closest approach
    const proj = toTarget[0] * dx + toTarget[1] * dy + toTarget[2] * dz;
    if (proj < 0 || proj > maxDistance) return null;

    // Compute squared perpendicular distance from the ray to the target
    const perp2 =
      distance * distance - (proj * proj) / (dx * dx + dy * dy + dz * dz);
    // Accept hits if within ~1.5 units of the ray
    if (perp2 > 1.5 * 1.5) return null;

    // Compute impact point on ray
    const t = proj / (dx * dx + dy * dy + dz * dz);
    const hitPos: [number, number, number] = [ox + dx * t, oy + dy * t, oz + dz * t];
    const normal: [number, number, number] = [-dx, -dy, -dz];
    return { position: hitPos, normal, targetId: String(candidate.id) };
  }

  // If a preferred target is provided, check it first
  if (preferredTarget) {
    const maybeHit = attemptHit(preferredTarget as Entity & { position?: [number, number, number] });
    if (maybeHit) return maybeHit;
  }

  // Otherwise, find the best candidate among all entities
  let best: { hit: { position: [number, number, number]; normal: [number, number, number]; targetId?: string | number }; d2: number } | undefined;
  for (const candidate of world.entities) {
    const c = candidate as Entity & { position?: [number, number, number]; team?: string; weapon?: WeaponComponent };
    if (!c.position) continue;
    const maybe = attemptHit(c);
    if (maybe) {
      const dxp = maybe.position[0] - origin[0];
      const dyp = maybe.position[1] - origin[1];
      const dzp = maybe.position[2] - origin[2];
      const d2 = dxp * dxp + dyp * dyp + dzp * dzp;
      if (!best || d2 < best.d2) best = { hit: maybe, d2 };
    }
  }

  if (best) return best.hit as { position: [number, number, number]; normal: [number, number, number]; targetId?: number | string };

  return null;
 }
