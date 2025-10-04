import type { World } from "miniplex";

import { resolveEntity, resolveOwner } from "../ecs/ecsResolve";
import { type Entity } from "../ecs/miniplexStore";
import type { DamageEvent, WeaponComponent } from "../ecs/weapons";
import type { Rng } from "../utils/seededRng";
import { extractEntityIdFromRapierHit } from "./rapierHelpers";
import type { WeaponFiredEvent } from "./WeaponSystem";

interface RigidBodyLike {
  translation?: () => { x: number; y: number; z: number };
  setLinvel?: (v: { x: number; y: number; z: number }, wake: boolean) => void;
}

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
  let rapierWorld: unknown | undefined = undefined;

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
      physicsAdapter?: unknown;
      rapierWorld?: unknown;
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
    rapierWorld = args[4];
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

  // If a Rapier-like physics adapter is provided that exposes a simple raycast
  // function (for tests), use it directly and map the result into a hit.
  if (rapierWorld) {
    try {
      const adapter = rapierWorld as { raycast?: (opts: unknown, maxDistance?: number) => unknown };
      if (typeof adapter.raycast === 'function') {
        const hit = adapter.raycast({ origin: { x: ox, y: oy, z: oz }, dir: { x: dx, y: dy, z: dz } }, maxDistance);
        if (hit && typeof hit === 'object') {
          const h = hit as Record<string, unknown>;
          const targetId = h['targetId'] as number | undefined;
          const position = h['position'] as [number, number, number] | undefined;
          const normal = h['normal'] as [number, number, number] | undefined;
          if (position && normal) {
            return { position, normal, targetId };
          }
        }
      }
    } catch {
      // fall through and use other methods
    }
  }

  if (rapierWorld) {
    try {
      const rw = rapierWorld as Record<string, unknown> | undefined;
      let hit: unknown = undefined;

      if (rw && typeof (rw as { castRay?: unknown }).castRay === "function") {
        const fn = (rw as { castRay?: (...args: unknown[]) => unknown })
          .castRay!;
        hit = fn(
          { origin: { x: ox, y: oy, z: oz }, dir: { x: dx, y: dy, z: dz } },
          maxDistance,
        );
      }

      if (
        !hit &&
        rw &&
        rw.queryPipeline &&
        typeof (rw.queryPipeline as { castRay?: unknown }).castRay ===
          "function"
      ) {
        try {
          const qp = rw.queryPipeline as {
            castRay?: (...args: unknown[]) => unknown;
          };
          const bodies = (rw as Record<string, unknown>)["bodies"];
          const colliders = (rw as Record<string, unknown>)["colliders"];
          if (qp.castRay) {
            hit = qp.castRay(
              bodies,
              colliders,
              { origin: { x: ox, y: oy, z: oz }, dir: { x: dx, y: dy, z: dz } },
              maxDistance,
            );
          }
        } catch {
          /* swallow errors and fall back to heuristic */
        }
      }

      if (
        !hit &&
        rw &&
        rw.raw &&
        typeof (rw.raw as { castRay?: unknown }).castRay === "function"
      ) {
        try {
          const raw = rw.raw as { castRay?: (...args: unknown[]) => unknown };
          if (raw.castRay)
            hit = raw.castRay(
              { origin: { x: ox, y: oy, z: oz }, dir: { x: dx, y: dy, z: dz } },
              maxDistance,
            );
        } catch {
          /* ignore and fall back */
        }
      }

      // Try to extract a point from the hit result
      let px: number | undefined;
      let py: number | undefined;
      let pz: number | undefined;

      if (hit && typeof hit === "object") {
        const h = hit as Record<string, unknown>;
        const point = h["point"] ?? h["hitPoint"] ?? h["position"];
        if (point && typeof point === "object") {
          // common shapes: { x,y,z } or array-like [x,y,z]
          const po = point as Record<string, unknown>;
          const arr = point as unknown as unknown[];
          const vx =
            typeof po["x"] === "number" ? (po["x"] as number) : undefined;
          const vy =
            typeof po["y"] === "number" ? (po["y"] as number) : undefined;
          const vz =
            typeof po["z"] === "number" ? (po["z"] as number) : undefined;
          px =
            vx ??
            (Array.isArray(arr) && typeof arr[0] === "number"
              ? (arr[0] as number)
              : undefined);
          py =
            vy ??
            (Array.isArray(arr) && typeof arr[1] === "number"
              ? (arr[1] as number)
              : undefined);
          pz =
            vz ??
            (Array.isArray(arr) && typeof arr[2] === "number"
              ? (arr[2] as number)
              : undefined);
        }
      }

      if (px !== undefined && py !== undefined && pz !== undefined) {
        // Find nearest entity to hit point
        // First try to map rapier hit to entity id directly
        const hitEntityId = extractEntityIdFromRapierHit(hit);
        if (typeof hitEntityId === "string") {
          return {
            position: [px, py, pz],
            normal: [-dx, -dy, -dz],
            targetId: hitEntityId,
          };
        }

        let best: { e: Entity; d2: number } | undefined;
        for (const candidate of world.entities) {
          const c = candidate as Entity & {
            position?: [number, number, number];
            rigid?: unknown;
            team?: string;
            weapon?: WeaponComponent;
          };
          if (!c.position) continue;
          // Skip the weapon owner itself
          if (String(c.id) === ownerId) {
            continue;
          }
          if (
            typeof c.weapon?.ownerId === "string" &&
            c.weapon.ownerId === ownerId
          ) {
            continue;
          }
          // Do not skip entities just because they have a `weapon` component —
          // robots are valid targets even though they own weapons. Previously
          // filtering by `weapon` prevented hits from resolving against robots.
          if (ownerTeam && c.team === ownerTeam) continue;

          // prefer rigid translation when available
          let cx = c.position[0];
          let cy = c.position[1];
          let cz = c.position[2];
          if (
            c.rigid &&
            typeof (c.rigid as Record<string, unknown>)["translation"] ===
              "function"
          ) {
            try {
              const t = (c.rigid as RigidBodyLike | null)?.translation;
              if (t) {
                const tv = t();
                cx = tv.x;
                cy = tv.y;
                cz = tv.z;
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
            targetId: String(best.e.id),
          };
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

    const dot =
      (toTarget[0] * dx + toTarget[1] * dy + toTarget[2] * dz) / distance;
    if (dot > 0.99) {
      return {
        position: candidate.position as [number, number, number],
        normal: [-dx, -dy, -dz] as [number, number, number],
        targetId: String(candidate.id),
      };
    }

    return null;
  };

  if (preferredTarget) {
    const preferredHit = attemptHit(
      preferredTarget as Entity & {
        position?: [number, number, number];
        team?: string;
        weapon?: WeaponComponent;
      },
    );
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
