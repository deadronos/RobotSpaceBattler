import { Vec3 } from "../../../lib/math/vec3";
import type { TeamConfigs } from "../../../lib/teamConfig";

export interface MovementPlan {
  velocity: Vec3;
  orientation: number;
}

export interface MovementContext {
  /**
   * The seeded team configs for the current match (`battleWorld.teams`).
   * Spawn centres are seed-dependent, so they must come from the match.
   */
  teams: TeamConfigs;
  formationAnchor?: Vec3;
  neighbors?: Vec3[];
  /** Optional override for the owning team's spawn centre. */
  spawnCenter?: Vec3;
  strafeSign?: 1 | -1;
  /** Optional runtime obstacles to consider for avoidance/LOS */
  obstacles?: Array<{
    position?: { x: number; y: number; z: number };
    shape?:
      | { kind: "circle"; radius: number }
      | { kind: "box"; halfWidth: number; halfDepth: number };
    blocksMovement?: boolean;
    blocksVision?: boolean;
  } | null>;
}
