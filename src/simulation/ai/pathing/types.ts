import { Ray } from '@dimforge/rapier3d-compat';

import { Vec3 } from '../../../lib/math/vec3';

/** Minimal Rapier World interface for movement planning */
interface RapierWorldLike {
  castRayAndGetNormal(
    ray: Ray,
    maxToi: number,
    solid: boolean,
    filterFlags?: number,
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
  /** Optional runtime obstacles to consider for avoidance/LOS */
  obstacles?: Array<
    | {
        position?: { x: number; y: number; z: number };
        shape?: { kind: 'circle'; radius: number } | { kind: 'box'; halfWidth: number; halfDepth: number };
        blocksMovement?: boolean;
        blocksVision?: boolean;
      }
    | null
  >;
}
