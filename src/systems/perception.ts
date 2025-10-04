import type { World } from "miniplex";

import type { Entity } from "../ecs/miniplexStore";
import type { RapierWorldOrAdapter } from "../utils/physicsAdapter";
import { callRaycast } from "../utils/physicsAdapter";

/**
 * Lightweight perception utilities used by AI systems.
 * performLineOfSight performs a simplified occlusion check by reusing the
 * world entity positions and a directional dot test similar to hitscan.
 */
export function performLineOfSight(
  origin: [number, number, number],
  target: Entity,
  world: World<Entity>,
  maxDistance = 100,
  // optional Rapier world object from @react-three/rapier (useRapier().world)
  rapierWorld?: RapierWorldOrAdapter,
): boolean {
  if (!target.position) return false;

  const [ox, oy, oz] = origin;
  const [tx, ty, tz] = target.position;

  const toTarget = [tx - ox, ty - oy, tz - oz];
  const distance = Math.sqrt(
    toTarget[0] ** 2 + toTarget[1] ** 2 + toTarget[2] ** 2,
  );
  if (distance > maxDistance) return false;

  // naive occlusion: if any other entity stands between origin and target within a small threshold,
  // treat as blocked. This is not a physics raycast but is sufficient for dev-mode LOS.
  const dir = [
    toTarget[0] / distance,
    toTarget[1] / distance,
    toTarget[2] / distance,
  ];

  // If a Rapier physics world was provided, try to perform a physics raycast
  // using the centralized adapter helper. This avoids duplicating wrapper
  // heuristics across systems.
  if (rapierWorld) {
    try {
      const originVec = { x: origin[0], y: origin[1], z: origin[2] };
      const dirVec = { x: dir[0], y: dir[1], z: dir[2] };
      const res = callRaycast(rapierWorld, originVec, dirVec, maxDistance);
      if (res) {
        if (typeof (res as Record<string, unknown>)['toi'] === 'number') {
          const toi = (res as Record<string, unknown>)['toi'] as number;
          if (toi + 1e-3 < distance) return false;
          return true;
        }
        if ((res as Record<string, unknown>)['position']) {
          const pos = (res as Record<string, unknown>)['position'] as [number, number, number];
          const hitDist = Math.sqrt(
            (pos[0] - ox) ** 2 + (pos[1] - oy) ** 2 + (pos[2] - oz) ** 2,
          );
          if (hitDist + 1e-3 < distance) return false;
          return true;
        }
      }
    } catch {
      // fall back to heuristic
    }
  }

  for (const e of world.entities) {
    if (!e.position) continue;
    if (e === target) continue;

    const [ex, ey, ez] = e.position;
    const toOther = [ex - ox, ey - oy, ez - oz];
    const proj =
      toOther[0] * dir[0] + toOther[1] * dir[1] + toOther[2] * dir[2];
    if (proj <= 0 || proj >= distance) continue;

    // perpendicular distance from the line
    const closestX = ox + dir[0] * proj;
    const closestY = oy + dir[1] * proj;
    const closestZ = oz + dir[2] * proj;
    const perpDistSq =
      (ex - closestX) ** 2 + (ey - closestY) ** 2 + (ez - closestZ) ** 2;

    // assume entities have a small radius ~0.6 and act as occluders
    if (perpDistSq < 0.6 * 0.6) {
      return false; // occluded
    }
  }

  return true;
}
