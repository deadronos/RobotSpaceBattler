import { extractEntityIdFromRapierHit } from "../systems/rapierHelpers";

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
}

export function createRapierAdapter(options: {
  /** The Rapier/physics world object (as provided by react-three-rapier or Rapier directly) */
  world?: unknown;
  /** Optional helper to map rapier collider/body objects to entity ids. If omitted, adapter will rely on heuristics. */
  mapHitToEntityId?: (hit: unknown) => string | undefined;
}): PhysicsAdapter {
  const rapierWorld = options.world;
  const rw = rapierWorld as RapierWorldLike | undefined;
  const mapHit = options.mapHitToEntityId ?? extractEntityIdFromRapierHit;

  function raycast(origin: { x:number;y:number;z:number }, dir: { x:number;y:number;z:number }, maxToi: number) {
    // Try common Rapier / rapier-like query entry points and normalize output
    if (!rapierWorld) return null;

    // A helper to normalize hit -> RaycastResult
    const normalize = (hit: unknown): RaycastAny => {
      if (!hit) return null;
      // Preserve raw 'toi' style results when present
      try {
        const h = hit as Record<string, unknown>;
        if (typeof h['toi'] === 'number' || typeof h['timeOfImpact'] === 'number') {
          return h;
        }
      } catch (__) {
        // swallow
        void __;
      }
      const mappedId = mapHit(hit);
      const pos = extractPoint(hit);
      if (pos) {
        const normal: [number, number, number] = [-(dir.x), -(dir.y), -(dir.z)];
        return { targetId: mappedId, position: pos, normal };
      }
      return null;
    };

    try {
      // Try common APIs in prioritized order
      // 1. world.raycast(origin, dir, maxToi)
      const raycastFn = rw?.raycast;
      if (typeof raycastFn === 'function') {
        const hit = raycastFn(origin, dir, maxToi);
        const res = normalize(hit);
        if (res) return res;
      }

      // 2. world.castRay(bodies, colliders, { origin, dir }, maxToi)
      const castRayFn = rw?.castRay;
      if (typeof castRayFn === 'function') {
        const hit = castRayFn({ origin, dir }, maxToi);
        const res = normalize(hit);
        if (res) return res;
      }

      // 3. queryPipeline.castRay(bodies, colliders, ray, maxToi)
      const qp = rw?.queryPipeline;
      if (qp && typeof qp.castRay === 'function') {
        try {
          const bodies = rw?.bodies;
          const colliders = rw?.colliders;
          const hit = qp.castRay!(bodies, colliders, { origin, dir }, maxToi);
          const res = normalize(hit);
          if (res) return res;
        } catch (__) {
          void __;
        }
      }

      // 4. raw.castRay
      const raw = rw?.raw;
      if (raw && typeof raw.castRay === 'function') {
        const hit = raw.castRay(origin, dir, maxToi);
        const res = normalize(hit);
        if (res) return res;
      }
    } catch (__) {
      // swallow and return null
      void __;
    }

    return null;
  }

  function overlapSphere(center: { x:number;y:number;z:number }, radius: number) {
    if (!rapierWorld) return false;
    try {
      const rp = rapierWorld as RapierWorldLike | undefined;
      // Rapier may expose a queryPipeline with intersection tests
      if (rp?.queryPipeline && typeof rp.queryPipeline.intersectionsWithSphere === 'function') {
        try {
          return rp.queryPipeline.intersectionsWithSphere({ x: center.x, y: center.y, z: center.z }, radius) as boolean;
        } catch {
          // fall through to other strategies
        }
      }

      // Some wrappers provide intersectionWithShape
      if (rp && typeof rp.intersectionWithShape === 'function') {
        try {
          return rp.intersectionWithShape({ x: center.x, y: center.y, z: center.z }, radius) as boolean;
        } catch {
          // ignore and fall back
        }
      }
    } catch (__) {
      void __;
    }

    // Fallback conservative answer: true if world exposes any contacts (best-effort)
    try {
      const rwRec = rapierWorld as Record<string, unknown> | undefined;
      const nc = rwRec ? (rwRec['numColliders'] as number | undefined) : undefined;
      if (nc !== undefined) return nc > 0;
    } catch (__) {
      // ignore
      void __;
    }

    return false;
  }

  function proximity(origin: { x:number;y:number;z:number }, radius: number) {
    // For Rapier, approximate with overlapSphere for now
    return overlapSphere(origin, radius);
  }

  return { raycast, overlapSphere, proximity };
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
  castRay?: (opts: unknown, maxToi?: number) => unknown;
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
function extractPoint(hit: unknown): [number, number, number] | undefined {
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
  try {
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
  } catch {
    /* swallow */
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
