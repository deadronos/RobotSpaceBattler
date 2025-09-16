import type { World } from 'miniplex';

import type { Entity } from '../ecs/miniplexStore';

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
  rapierWorld?: unknown
): boolean {
  if (!target.position) return false;

  const [ox, oy, oz] = origin;
  const [tx, ty, tz] = target.position;

  const toTarget = [tx - ox, ty - oy, tz - oz];
  const distance = Math.sqrt(toTarget[0] ** 2 + toTarget[1] ** 2 + toTarget[2] ** 2);
  if (distance > maxDistance) return false;

  // naive occlusion: if any other entity stands between origin and target within a small threshold,
  // treat as blocked. This is not a physics raycast but is sufficient for dev-mode LOS.
  const dir = [toTarget[0] / distance, toTarget[1] / distance, toTarget[2] / distance];

  // If a Rapier physics world was provided, try to perform a physics raycast.
  // We don't rely on exact typings here because react-three-rapier exposes
  // several possible helpers; attempt common call shapes and interpret the
  // returned "toi" (time of impact) to determine whether an occluder exists
  // before the target. If anything fails, fall back to the heuristic below.
  if (rapierWorld) {
    try {
      const ox = origin[0];
      const oy = origin[1];
      const oz = origin[2];
      const dirVec = { x: dir[0], y: dir[1], z: dir[2] };
      const originVec = { x: ox, y: oy, z: oz };

      // Try a few common call patterns that different rapier wrappers expose.
      const rw = rapierWorld as unknown as Record<string, unknown>;
      let hit: unknown = undefined;

      // Common wrapper: world.castRay(origin, dir, maxDistance)
      if (typeof (rw as { castRay?: unknown }).castRay === 'function') {
        const fn = (rw as { castRay?: (...args: unknown[]) => unknown }).castRay!;
        hit = fn(originVec, dirVec, maxDistance);
      }

      // Some wrappers expose a queryPipeline/castRay API
      if (!hit && rw.queryPipeline && typeof (rw.queryPipeline as { castRay?: unknown }).castRay === 'function') {
        try {
          const qp = rw.queryPipeline as { castRay?: (...args: unknown[]) => unknown };
          const bodies = (rw as Record<string, unknown>)['bodies'];
          const colliders = (rw as Record<string, unknown>)['colliders'];
          if (qp.castRay) {
            hit = qp.castRay(bodies, colliders, originVec, dirVec, maxDistance);
          }
        } catch {
          // ignore and continue to other attempts
        }
      }

      // Some wasm bindings expose raw methods
      if (!hit && rw.raw && typeof (rw.raw as { castRay?: unknown }).castRay === 'function') {
        try {
          const raw = rw.raw as { castRay?: (...args: unknown[]) => unknown };
          if (raw.castRay) hit = raw.castRay(originVec, dirVec, maxDistance);
        } catch {
          // ignore
        }
      }

      // Heuristically extract a time-of-impact (toi) number from the hit
      // result using safe unknown checks.
      let toi: number | undefined;
      if (hit && typeof hit === 'object') {
        const h = hit as Record<string, unknown>;
        const cand = h['toi'] ?? h['toiSeconds'] ?? h['time'];
        if (typeof cand === 'number') {
          toi = cand;
        }
      }
      if (toi === undefined && Array.isArray(hit) && hit.length > 0) {
        const first = hit[0] as unknown;
        if (first && typeof first === 'object') {
          const f = first as Record<string, unknown>;
          const cand2 = f['toi'];
          if (typeof cand2 === 'number') toi = cand2;
        }
      }

      if (typeof toi === 'number') {
        if (toi + 1e-3 < distance) return false;
        return true;
      }
    } catch {
      // If rapier raycast attempts fail, silently continue to heuristic path
    }
  }

  for (const e of world.entities) {
    if (!e.position) continue;
    if (e === target) continue;

    const [ex, ey, ez] = e.position;
    const toOther = [ex - ox, ey - oy, ez - oz];
    const proj = toOther[0] * dir[0] + toOther[1] * dir[1] + toOther[2] * dir[2];
    if (proj <= 0 || proj >= distance) continue;

    // perpendicular distance from the line
    const closestX = ox + dir[0] * proj;
    const closestY = oy + dir[1] * proj;
    const closestZ = oz + dir[2] * proj;
    const perpDistSq = (ex - closestX) ** 2 + (ey - closestY) ** 2 + (ez - closestZ) ** 2;

    // assume entities have a small radius ~0.6 and act as occluders
    if (perpDistSq < 0.6 * 0.6) {
      return false; // occluded
    }
  }

  return true;
}
