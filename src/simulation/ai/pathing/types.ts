import { Vec3 } from '../../../lib/math/vec3';

/** Minimal Rapier World interface for movement planning */
interface RapierWorldLike {
  castRay(
    ray: { origin: { x: number; y: number; z: number }; dir: { x: number; y: number; z: number } },
    maxToi: number,
    solid: boolean,
    filterGroups?: number
  ): { timeOfImpact: number; normal: { x: number; y: number; z: number } } | null;
}

export interface MovementPlan {
  velocity: Vec3;
  orientation: number;
}

export interface MovementContext {
  formationAnchor?: Vec3;
  neighbors?: Vec3[];
  spawnCenter?: Vec3;
  strafeSign?: 1 | -1;
  /** Optional Rapier physics world for predictive avoidance raycasting */
  rapierWorld?: RapierWorldLike | null;
  /** Current frame count for raycast scheduling */
  frameCount?: number;
  /** Entity ID for raycast scheduling (determines which frames this entity raycasts) */
  entityId?: number;
}
