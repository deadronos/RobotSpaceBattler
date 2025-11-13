import { Vec3 } from "../../../lib/math/vec3";

export interface MovementPlan {
  velocity: Vec3;
  orientation: number;
}

export interface MovementContext {
  formationAnchor?: Vec3;
  neighbors?: Vec3[];
  spawnCenter?: Vec3;
  strafeSign?: 1 | -1;
}
