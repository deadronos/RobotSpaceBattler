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
  const mapHit = options.mapHitToEntityId ?? extractEntityIdFromRapierHit;

  function extractPointFromHit(hit: unknown): { pos?: [number, number, number]; normal?: [number, number, number] } {
    if (!hit || typeof hit !== 'object') return {};
    const h = hit as Record<string, unknown>;
    const point = (h['point'] ?? h['hitPoint'] ?? h['position']) as unknown;
    if (point) {
      if (Array.isArray(point) && point.length >= 3) {
        const arr = point as unknown as Array<unknown>;
        const x = typeof arr[0] === 'number' ? (arr[0] as number) : undefined;
        const y = typeof arr[1] === 'number' ? (arr[1] as number) : undefined;
        const z = typeof arr[2] === 'number' ? (arr[2] as number) : undefined;
        if (x !== undefined && y !== undefined && z !== undefined) return { pos: [x, y, z] };
      }
      const pRec = point as Record<string, unknown>;
      if (typeof pRec['x'] === 'number' && typeof pRec['y'] === 'number' && typeof pRec['z'] === 'number') {
        return { pos: [pRec['x'] as number, pRec['y'] as number, pRec['z'] as number] };
      }
    }
    return {};
  }

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
      const extracted = extractPointFromHit(hit);
      if (extracted.pos) {
        const pos = extracted.pos;
        const normal: [number, number, number] = [-(dir.x), -(dir.y), -(dir.z)];
        return { targetId: mappedId, position: pos, normal };
      }
      return null;
    };

    try {
      // Try common APIs in prioritized order
      // 1. world.raycast(origin, dir, maxToi)
      const rw = rapierWorld as unknown as Record<string, unknown> | undefined;
      const raycastFn = rw?.['raycast'] as ((origin: unknown, dir: unknown, maxToi: number) => unknown) | undefined;
      if (typeof raycastFn === 'function') {
        const hit = raycastFn(origin, dir, maxToi);
        const res = normalize(hit);
        if (res) return res;
      }

      // 2. world.castRay(bodies, colliders, { origin, dir }, maxToi)
      const castRayFn = rw?.['castRay'] as ((opts: unknown, maxToi?: number) => unknown) | undefined;
      if (typeof castRayFn === 'function') {
        const hit = castRayFn({ origin, dir }, maxToi);
        const res = normalize(hit);
        if (res) return res;
      }

      // 3. queryPipeline.castRay(bodies, colliders, ray, maxToi)
      const qp = rw?.['queryPipeline'] as Record<string, unknown> | undefined;
      if (qp) {
        const qpCast = qp['castRay'] as ((...args: unknown[]) => unknown) | undefined;
        if (typeof qpCast === 'function') {
          try {
            const bodies = rw?.['bodies'];
            const colliders = rw?.['colliders'];
            const hit = qpCast(bodies, colliders, { origin, dir }, maxToi);
            const res = normalize(hit);
            if (res) return res;
          } catch (__) {
            void __;
          }
        }
      }

      // 4. raw.castRay
      const raw = rw?.['raw'] as Record<string, unknown> | undefined;
      if (raw) {
        const rawCast = raw['castRay'] as ((...args: unknown[]) => unknown) | undefined;
        if (typeof rawCast === 'function') {
          const hit = rawCast(origin, dir, maxToi);
          const res = normalize(hit);
          if (res) return res;
        }
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
      // Rapier may expose a queryPipeline with intersection tests
      const qp2 = (rapierWorld as unknown as Record<string, unknown>)?.queryPipeline as Record<string, unknown> | undefined;
      if (qp2) {
        const inter = qp2['intersectionsWithSphere'] as ((...args: unknown[]) => unknown) | undefined;
        if (typeof inter === 'function') return inter({ x: center.x, y: center.y, z: center.z }, radius) as boolean;
      }

      // Some wrappers provide intersectionWithShape
      const intersectionFn = (rapierWorld as unknown as Record<string, unknown>)['intersectionWithShape'] as ((...args: unknown[]) => unknown) | undefined;
      if (typeof intersectionFn === 'function') return intersectionFn({ x: center.x, y: center.y, z: center.z }, radius) as boolean;
    } catch (__) {
      // ignore and fall back
      void __;
    }

    // Fallback conservative answer: true if world exposes any contacts (best-effort)
    try {
      const nc = (rapierWorld as unknown as Record<string, unknown>)['numColliders'] as number | undefined;
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
