import type { World } from "miniplex";

import { resolveEntity, resolveOwner } from "../ecs/ecsResolve";
import { type Entity } from "../ecs/miniplexStore";
import type { DamageEvent, WeaponComponent } from "../ecs/weapons";
import type { Rng } from "../utils/seededRng";
import { extractEntityIdFromRapierHit } from "./rapierHelpers";
import type { WeaponFiredEvent } from "./WeaponSystem";

export interface ImpactEvent {
  position: [number, number, number];
  normal: [number, number, number];
  targetId?: number;
}

export function hitscanSystem(...args: any[]) {
  // Support either positional args or single params object
  let world: any;
  let rng: any = () => Math.random();
  let weaponFiredEvents: any[] = [];
  let events: { damage: any[]; impact: any[] } = { damage: [], impact: [] };
  let rapierWorld: unknown | undefined = undefined;

  if (
    args.length === 1 &&
    args[0] &&
    typeof args[0] === "object" &&
    "world" in args[0]
  ) {
    const p = args[0];
    world = p.world;
    if (p.stepContext) {
      rng = p.stepContext.rng ?? rng;
    }
    rng = p.rng ?? rng;
    weaponFiredEvents = p.weaponFiredEvents ?? weaponFiredEvents;
    events = p.events ?? events;
    rapierWorld = p.physicsAdapter ?? p.rapierWorld;
  } else {
    world = args[0];
    rng = args[1] ?? rng;
    weaponFiredEvents = args[2] ?? weaponFiredEvents;
    events = args[3] ?? events;
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
      ownerLookupId,
      owner.team,
      rapierWorld,
    );

    if (hit) {
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
        targetId: hit.targetId,
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
  targetId?: number;
} | null {
  const ownerNumericId = Number(ownerId);
  const ownerNumeric = Number.isFinite(ownerNumericId)
    ? ownerNumericId
    : undefined;
  const [ox, oy, oz] = origin;
  const [dx, dy, dz] = direction;

  // If a Rapier-like physics adapter is provided that exposes a simple raycast
  // function (for tests), use it directly and map the result into a hit.
  if (rapierWorld && typeof (rapierWorld as any).raycast === 'function') {
    try {
      const hit = (rapierWorld as any).raycast({ origin: { x: ox, y: oy, z: oz }, dir: { x: dx, y: dy, z: dz } }, maxDistance);
      if (hit && typeof hit === 'object') {
        const targetId = (hit as any).targetId;
        const position = (hit as any).position as [number, number, number] | undefined;
        const normal = (hit as any).normal as [number, number, number] | undefined;
        if (position && normal) {
          return { position, normal, targetId };
        }
      }
    } catch {
      // fall through and use other methods
    }
  }

  if (rapierWorld) {
    try {
      const rw = rapierWorld as unknown as Record<string, unknown>;
      let hit: unknown = undefined;

      if (typeof (rw as { castRay?: unknown }).castRay === "function") {
        const fn = (rw as { castRay?: (...args: unknown[]) => unknown })
          .castRay!;
        hit = fn(
          { origin: { x: ox, y: oy, z: oz }, dir: { x: dx, y: dy, z: dz } },
          maxDistance,
        );
      }

      if (
        !hit &&
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
        if (typeof hitEntityId === "number") {
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
          if (
            typeof c.id === "number" &&
            ownerNumeric !== undefined &&
            c.id === ownerNumeric
          ) {
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
              // translation may be exposed on the rapier rigid ref
              const t = (c.rigid as unknown as Record<string, unknown>)[
                "translation"
              ] as (() => { x: number; y: number; z: number }) | undefined;
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
            targetId: best.e.id as unknown as number,
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
    // Skip the owner itself
    if (
      typeof candidate.id === "number" &&
      ownerNumeric !== undefined &&
      candidate.id === ownerNumeric
    ) {
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
    if
