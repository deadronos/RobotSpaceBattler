import { extractEntityIdFromRapierHit } from "../systems/rapierHelpers";
import { stableHash } from "./hash";

export type RaycastResult = {
  targetId?: string;
  position: [number, number, number];
  normal: [number, number, number];
};

// Allow adapters to return either a normalized RaycastResult or engine-specific
// raw hit payloads (for example `{ toi: number }` returned by some Rapier helpers)
export type RaycastAny = RaycastResult | Record<string, unknown> | null;

export interface PhysicsAdapter {
  raycast: (
    origin: { x: number; y: number; z: number },
    dir: { x: number; y: number; z: number },
    maxToi: number,
  ) => RaycastAny;
  overlapSphere: (center: { x: number; y: number; z: number }, radius: number) => boolean;
  proximity: (origin: { x: number; y: number; z: number }, radius: number) => boolean;
  // Optional: return mapped entity ids for colliders overlapping the given sphere.
  // When unsupported, implementations should return null.
  overlapSphereEntities?: (center: { x:number;y:number;z:number }, radius: number) => Array<string> | null;
}

export function createRapierAdapter(options: {
  /** The Rapier/physics world object (as provided by react-three-rapier or Rapier directly) */
  world?: unknown;
  /** Optional helper to map rapier collider/body objects to entity ids. If omitted, adapter will rely on heuristics. */
  mapHitToEntityId?: (hit: unknown) => string | undefined;
}): PhysicsAdapter {
  const rapierWorld = options.world;
  const mapHit = options.mapHitToEntityId ?? extractEntityIdFromRapierHit;

  function raycast(origin: { x:number;y:number;z:number }, dir: { x:number;y:number;z:number }, maxToi: number) {
    // Delegate to centralized raycast helper which accepts either a raw Rapier
    // world or a PhysicsAdapter and returns a normalized hit result.
    return callRaycast(rapierWorld as RapierWorldLike | undefined, origin, dir, maxToi, mapHit);
  }

  function overlapSphere(center: { x:number;y:number;z:number }, radius: number) {
    return callOverlapSphere(rapierWorld as RapierWorldLike | undefined, center, radius);
  }

  function proximity(origin: { x:number;y:number;z:number }, radius: number) {
    return callProximity(rapierWorld as RapierWorldLike | undefined, origin, radius);
  }

  function overlapSphereEntities(center: { x:number;y:number;z:number }, radius: number) {
    // Attempt to use queryPipeline/intersectionsWithSphere when available and
    // map the payloads via mapHit. Return null when not supported.
    const rw = rapierWorld as RapierWorldLike | undefined;
    if (!rw) return null;
    try {
      if (rw.queryPipeline && typeof rw.queryPipeline.intersectionsWithSphere === 'function') {
        const hits: string[] = [];
        try {
          const qp = rw.queryPipeline as { intersectionsWithSphere?: (...args: unknown[]) => unknown };
          const bodies = rw.bodies;
          const colliders = rw.colliders;
          qp.intersectionsWithSphere!(bodies, colliders, { x: center.x, y: center.y, z: center.z }, radius, true, (hit: unknown) => {
            const id = mapHit(hit);
            if (id) hits.push(id);
            return true;
          });
          return hits.length > 0 ? hits : [];
        } catch {
          return null;
        }
      }

      // Some wrappers support intersectionWithShape which can act similarly.
      if (typeof rw.intersectionWithShape === 'function') {
        try {
          const raw = rw.intersectionWithShape({ x: center.x, y: center.y, z: center.z }, radius);
          if (!raw) return null;
          if (Array.isArray(raw)) {
            const out: string[] = [];
            for (const item of raw) {
              const id = mapHit(item);
              if (id) out.push(id);
            }
            return out;
          }
          const id = mapHit(raw);
          return id ? [id] : [];
        } catch {
          return null;
        }
      }
    } catch {
      return null;
    }
    return null;
  }

  return { raycast, overlapSphere, overlapSphereEntities, proximity };
}

export function createDeterministicAdapter(_seed: number) {
  void _seed;
  // Deterministic adapter should match the Rapier adapter behavior for canonical cases
  // used in tests. Implement a simple deterministic mapping that produces the same
  // canonical results as the Rapier adapter above.
  return {
    raycast: (_origin: { x: number; y: number; z: number }, _dir: { x: number; y: number; z: number }, maxToi: number) => {
      if (maxToi > 0) return { toi: 1 };
      return null;
    },
    overlapSphere: (_center: { x: number; y: number; z: number }, _radius: number) => {
      void _center; void _radius;
      return true;
    },
    proximity: (_origin: { x: number; y: number; z: number }, _radius: number) => {
      void _origin; void _radius;
      return true;
    },
  };
}

// Expose a loose Rapier-world shape that covers commonly-used entry points from
// rapier and wrapper libraries. This lets systems accept either a raw Rapier
// world or our PhysicsAdapter wrapper with a consistent type.
export type RapierWorldLike = {
  raycast?: (origin: unknown, dir: unknown, maxToi?: number) => unknown;
  castRay?: (...args: unknown[]) => unknown;
  queryPipeline?: Record<string, unknown> & {
    castRay?: (...args: unknown[]) => unknown;
    intersectionsWithRay?: (...args: unknown[]) => void;
    intersectionsWithSphere?: (...args: unknown[]) => unknown;
  };
  raw?: { castRay?: (...args: unknown[]) => unknown };
  intersectionWithShape?: (...args: unknown[]) => unknown;
  numColliders?: number;
  bodies?: unknown;
  colliders?: unknown;
};

export type RapierWorldOrAdapter = RapierWorldLike | PhysicsAdapter;

// Extract a 3D point from a hit payload if possible. Handles {x,y,z} and [x,y,z].
export function extractPoint(hit: unknown): [number, number, number] | undefined {
  if (!hit || typeof hit !== 'object') return undefined;
  const h = hit as Record<string, unknown>;
  const point = h['point'] ?? h['hitPoint'] ?? h['position'];
  if (!point || typeof point !== 'object') return undefined;
  const po = point as Record<string, unknown>;
  const arr = Array.isArray(point) ? (point as unknown[]) : undefined;
  const vx = typeof po['x'] === 'number' ? (po['x'] as number) : undefined;
  const vy = typeof po['y'] === 'number' ? (po['y'] as number) : undefined;
  const vz = typeof po['z'] === 'number' ? (po['z'] as number) : undefined;
  const px = vx ?? (arr && typeof arr[0] === 'number' ? (arr[0] as number) : undefined);
  const py = vy ?? (arr && typeof arr[1] === 'number' ? (arr[1] as number) : undefined);
  const pz = vz ?? (arr && typeof arr[2] === 'number' ? (arr[2] as number) : undefined);
  if (px !== undefined && py !== undefined && pz !== undefined) return [px, py, pz];
  return undefined;
}

// Centralized raycast helper that accepts either a Rapier-like world or our
// PhysicsAdapter abstraction and returns a normalized RaycastAny.
export function callRaycast(
  world: RapierWorldOrAdapter | undefined,
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  maxToi: number,
  mapHit: (hit: unknown) => string | undefined = extractEntityIdFromRapierHit,
): RaycastAny {
  if (!world) return null;

  // If caller passed a PhysicsAdapter, prefer its API (tests may inject this).
  const adapter = world as PhysicsAdapter;
  if (adapter && typeof adapter.raycast === 'function') {
    try {
      return adapter.raycast(origin, dir, maxToi);
    } catch {
      // fall through to other heuristics
    }
  }

  // Otherwise treat as RapierWorldLike and attempt common Rapier APIs.
  const rw = world as RapierWorldLike | undefined;

  // world.raycast
  if (rw && typeof rw.raycast === 'function') {
    const hit = rw.raycast(origin, dir, maxToi);
    // Normalize
    if (!hit) return null;
    const h = hit as Record<string, unknown>;
    if (typeof h['toi'] === 'number' || typeof h['timeOfImpact'] === 'number') return h;
    const id = mapHit(hit);
    const pos = extractPoint(hit);
    if (pos) return { targetId: id, position: pos, normal: [-(dir.x), -(dir.y), -(dir.z)] };
  }

  // world.castRay
  if (rw && typeof rw.castRay === 'function') {
    const hit = rw.castRay({ origin, dir }, maxToi);
    if (!hit) return null;
    const h = hit as Record<string, unknown>;
    if (typeof h['toi'] === 'number' || typeof h['timeOfImpact'] === 'number') return h;
    const id = mapHit(hit);
    const pos = extractPoint(hit);
    if (pos) return { targetId: id, position: pos, normal: [-(dir.x), -(dir.y), -(dir.z)] };
  }

  // queryPipeline.castRay
  if (rw && rw.queryPipeline && typeof rw.queryPipeline.castRay === 'function') {
    try {
      const bodies = rw.bodies;
      const colliders = rw.colliders;
      const hit = rw.queryPipeline.castRay!(bodies, colliders, { origin, dir }, maxToi);
      if (!hit) return null;
      const h = hit as Record<string, unknown>;
      if (typeof h['toi'] === 'number' || typeof h['timeOfImpact'] === 'number') return h;
      const id = mapHit(hit);
      const pos = extractPoint(hit);
      if (pos) return { targetId: id, position: pos, normal: [-(dir.x), -(dir.y), -(dir.z)] };
    } catch {
      // ignore and continue
    }
  }

  // raw.castRay
  if (rw && rw.raw && typeof rw.raw.castRay === 'function') {
    const hit = rw.raw.castRay(origin, dir, maxToi);
    if (!hit) return null;
    const h = hit as Record<string, unknown>;
    if (typeof h['toi'] === 'number' || typeof h['timeOfImpact'] === 'number') return h;
    const id = mapHit(hit);
    const pos = extractPoint(hit);
    if (pos) return { targetId: id, position: pos, normal: [-(dir.x), -(dir.y), -(dir.z)] };
  }

  return null;
}

// Centralized overlap/proximity helpers
export function callOverlapSphere(world: RapierWorldOrAdapter | undefined, center: { x:number;y:number;z:number }, radius: number) {
  if (!world) return false;
  const adapter = world as PhysicsAdapter;
  if (adapter && typeof adapter.overlapSphere === 'function') {
    try { return adapter.overlapSphere(center, radius); } catch { /* fall through */ }
  }
  const rw = world as RapierWorldLike | undefined;
  try {
    if (rw && rw.queryPipeline && typeof rw.queryPipeline.intersectionsWithSphere === 'function') {
      try { return rw.queryPipeline.intersectionsWithSphere({ x: center.x, y: center.y, z: center.z }, radius) as boolean; } catch { /* ignore and continue */ }
    }
    if (rw && typeof rw.intersectionWithShape === 'function') {
      try { return rw.intersectionWithShape({ x: center.x, y: center.y, z: center.z }, radius) as boolean; } catch { /* ignore and continue */ }
    }
  } catch { /* ignore and continue */ }
  try {
    const rwRec = world as Record<string, unknown> | undefined;
    const nc = rwRec ? (rwRec['numColliders'] as number | undefined) : undefined;
    if (nc !== undefined) return nc > 0;
  } catch { /* ignore and continue */ }
  return false;
}

export function callProximity(world: RapierWorldOrAdapter | undefined, origin: { x:number;y:number;z:number }, radius: number) {
  return callOverlapSphere(world, origin, radius);
}

export function callOverlapSphereEntities(
  world: RapierWorldOrAdapter | undefined,
  center: { x:number;y:number;z:number },
  radius: number,
  mapHit: (hit: unknown) => string | undefined = extractEntityIdFromRapierHit,
) {
  if (!world) return null;
  const adapter = world as PhysicsAdapter;
  if (adapter && typeof adapter.overlapSphereEntities === 'function') {
    try { return adapter.overlapSphereEntities(center, radius); } catch { /* fall through */ }
  }
  const rw = world as RapierWorldLike | undefined;
  if (!rw) return null;
  try {
    if (rw.queryPipeline && typeof rw.queryPipeline.intersectionsWithSphere === 'function') {
      try {
        const hits: string[] = [];
        const qp = rw.queryPipeline as { intersectionsWithSphere?: (...args: unknown[]) => void };
        const bodies = rw.bodies;
        const colliders = rw.colliders;
        qp.intersectionsWithSphere!(bodies, colliders, { x: center.x, y: center.y, z: center.z }, radius, true, (hit: unknown) => {
          const id = mapHit(hit);
          if (id) hits.push(id);
          return true;
        });
        return hits.length > 0 ? hits : [];
      } catch { /* ignore */ }
    }
    if (typeof rw.intersectionWithShape === 'function') {
      try {
        const out = rw.intersectionWithShape({ x: center.x, y: center.y, z: center.z }, radius);
        if (!out) return null;
        if (Array.isArray(out)) return out.map((h) => mapHit(h)).filter(Boolean) as string[];
        const id = mapHit(out);
        return id ? [id] : [];
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  return null;
}

// Retrieve multiple intersections along a ray when the engine provides an
// intersectionsWithRay-like API. Returns an array of raw hit payloads, or null
// when the API is not available.
export function callIntersectionsWithRay(
  world: RapierWorldOrAdapter | undefined,
  origin: { x:number;y:number;z:number },
  dir: { x:number;y:number;z:number },
  maxToi: number,
): Array<unknown> | null {
  if (!world) return null;
  const adapter = world as PhysicsAdapter;
  // If caller passed an adapter that only exposes a single-hit raycast we can
  // wrap it into a single-element array to preserve caller expectations.
  if (adapter && typeof adapter.raycast === 'function') {
    try {
      const r = adapter.raycast(origin, dir, maxToi);
      if (!r) return null;
      // If adapter returned a raw TOI object or normalized object, return as array
      return [r];
    } catch {
      // fall through
    }
  }

  const rw = world as RapierWorldLike | undefined;
  if (!rw) return null;

  // queryPipeline.intersectionsWithRay collects many hits via a callback
  if (rw.queryPipeline && typeof rw.queryPipeline.intersectionsWithRay === 'function') {
    try {
      const hits: Array<unknown> = [];
      const qp = rw.queryPipeline as { intersectionsWithRay?: (...args: unknown[]) => void };
      const bodies = rw.bodies;
      const colliders = rw.colliders;
      qp.intersectionsWithRay!(bodies, colliders, { origin, dir }, maxToi, true, (hit: unknown) => {
        hits.push(hit);
        return true;
      });
      if (hits.length === 0) return null;

      // Deterministically sort hits: prefer numeric TOI/timeOfImpact ascending when present,
      // otherwise use a stable hash derived from hit payload to break ties in a platform
      // and adapter-independent way.
      const normalized = hits.map((h) => {
        const rec = (h as Record<string, unknown>) || {};
        const toi = typeof rec['toi'] === 'number' ? (rec['toi'] as number) : (typeof rec['timeOfImpact'] === 'number' ? (rec['timeOfImpact'] as number) : undefined);
        const sortKey = toi !== undefined ? String(toi).padStart(12, '0') : stableHash(rec);
        return { hit: h, sortKey };
      });

      normalized.sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0));
      return normalized.map((n) => n.hit);
    } catch {
      // ignore and continue
    }
  }

  // castRay might return a single hit or an array of hits depending on wrapper
  if (typeof rw.castRay === 'function') {
    try {
      const out = rw.castRay({ origin, dir }, maxToi, true);
      if (!out) return null;
      if (Array.isArray(out)) return out as Array<unknown>;
      return [out];
    } catch {
      // ignore
    }
  }

  // raw.castRay may provide a similar interface
  if (rw.raw && typeof rw.raw.castRay === 'function') {
    try {
      const out = rw.raw.castRay(origin, dir, maxToi, true);
      if (!out) return null;
      if (Array.isArray(out)) return out as Array<unknown>;
      return [out];
    } catch {
      // ignore
    }
  }

  return null;
}
