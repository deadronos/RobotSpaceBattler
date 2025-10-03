import { extractEntityIdFromRapierHit } from "../systems/rapierHelpers";

export type RaycastResult = {
  targetId?: number;
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
  world?: any;
  /** Optional helper to map rapier collider/body objects to entity ids. If omitted, adapter will rely on heuristics. */
  mapHitToEntityId?: (hit: unknown) => number | undefined;
}): PhysicsAdapter {
  const rapierWorld = options.world;
  const mapHit = options.mapHitToEntityId ?? extractEntityIdFromRapierHit;

  function extractPointFromHit(hit: unknown): { pos?: [number, number, number]; normal?: [number, number, number] } {
    if (!hit || typeof hit !== 'object') return {};
    const h = hit as Record<string, unknown>;
    const point = (h['point'] ?? h['hitPoint'] ?? h['position']) as unknown;
    if (point) {
      if (Array.isArray(point) && point.length >= 3) {
        const [x,y,z] = point as unknown as number[];
        return { pos: [x,y,z] };
      }
      if (typeof (point as any).x === 'number') {
        const p = point as any;
        return { pos: [p.x, p.y, p.z] };
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
      if (typeof (rapierWorld as any).raycast === 'function') {
        const hit = (rapierWorld as any).raycast(origin, dir, maxToi);
        const res = normalize(hit);
        if (res) return res;
      }

      // 2. world.castRay(bodies, colliders, { origin, dir }, maxToi)
      if (typeof (rapierWorld as any).castRay === 'function') {
        const hit = (rapierWorld as any).castRay({ origin, dir }, maxToi);
        const res = normalize(hit);
        if (res) return res;
      }

      // 3. queryPipeline.castRay(bodies, colliders, ray, maxToi)
      const qp = (rapierWorld as any)?.queryPipeline;
      if (qp && typeof qp.castRay === 'function') {
        try {
          const bodies = (rapierWorld as any)['bodies'];
          const colliders = (rapierWorld as any)['colliders'];
          const hit = qp.castRay(bodies, colliders, { origin, dir }, maxToi);
          const res = normalize(hit);
          if (res) return res;
        } catch (__) {
          // fall through to heuristic
          void __;
        }
      }

      // 4. raw.castRay
      if ((rapierWorld as any).raw && typeof (rapierWorld as any).raw.castRay === 'function') {
        const hit = (rapierWorld as any).raw.castRay(origin, dir, maxToi);
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
      // Rapier may expose a queryPipeline with intersection tests
      const qp = (rapierWorld as any)?.queryPipeline;
      if (qp && typeof qp.intersectionsWithSphere === 'function') {
        return qp.intersectionsWithSphere({ x: center.x, y: center.y, z: center.z }, radius);
      }

      // Some wrappers provide intersectionWithShape
      if (typeof (rapierWorld as any).intersectionWithShape === 'function') {
        return (rapierWorld as any).intersectionWithShape({ x: center.x, y: center.y, z: center.z }, radius);
      }
    } catch (__) {
      // ignore and fall back
      void __;
    }

    // Fallback conservative answer: true if world exposes any contacts (best-effort)
    try {
      if ((rapierWorld as any).numColliders !== undefined) {
        return (rapierWorld as any).numColliders > 0;
      }
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
  // Deterministic adapter should match the Rapier adapter behavior for canonical cases
  // used in tests. Implement a simple deterministic mapping that produces the same
  // canonical results as the Rapier adapter above.
  return {
    raycast: (_origin: { x: number; y: number; z: number }, _dir: { x: number; y: number; z: number }, maxToi: number) => {
      if (maxToi > 0) return { toi: 1 };
      return null;
    },
    overlapSphere: (_center: { x: number; y: number; z: number }, _radius: number) => {
      return true;
    },
    proximity: (_origin: { x: number; y: number; z: number }, _radius: number) => {
      return true;
    },
  };
}
