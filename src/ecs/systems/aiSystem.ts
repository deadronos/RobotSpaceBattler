import { lengthVec3, Vec3 } from "../../lib/math/vec3";
import { perfMarkEnd, perfMarkStart } from "../../lib/perf";
import {
  nextBehaviorState,
  RobotBehaviorMode,
} from "../../simulation/ai/behaviorState";
import { computeTeamAnchors } from "../../simulation/ai/captainCoordinator";
import { updateTargeting } from "../../simulation/ai/decision";
import {
  planRobotMovement,
  resolveSpawnCenter,
} from "../../simulation/ai/pathing";
import type {
  MovementContext,
  MovementPlan,
} from "../../simulation/ai/pathing/types";
import { SENSOR_RANGE } from "../../simulation/ai/sensors";
import { SpatialGrid } from "../../simulation/ai/spatialGrid";
import { BattleWorld, RobotEntity } from "../world";
import { buildNeighbors } from "./aiNeighbors";

// Per-tick scratch state, reused so the steady-state AI tick does not allocate
// for targeting or neighbour queries. The simulation is single threaded and
// updateAISystem is not re-entrant.
const grid = new SpatialGrid(SENSOR_RANGE / 2);
const enemiesScratch: RobotEntity[] = [];
const neighborsScratch: Vec3[] = [];
const movementContextScratch: MovementContext = {
  formationAnchor: undefined,
  strafeSign: 1,
  neighbors: undefined,
  obstacles: undefined,
};
const behaviorSnapshotScratch = {
  health: 0,
  maxHealth: 0,
  mode: RobotBehaviorMode.Seek,
  role: "assault" as RobotEntity["role"],
};
const behaviorContextScratch: {
  targetDistance: number | null;
  anchorDistance: number | null;
  rng: () => number;
} = { targetDistance: null, anchorDistance: null, rng: Math.random };
// Reusable plan whose velocity vector is the robot's own, so movement planning
// writes the final velocity in place instead of allocating a plan per robot.
const movementPlanScratch: MovementPlan = {
  velocity: { x: 0, y: 0, z: 0 },
  orientation: 0,
};

/**
 * Updates the AI for all robots in the battle world.
 * Manages sensor updates, target selection, behavior state transitions, and movement planning.
 *
 * Enemy and neighbour lookups go through a uniform grid rebuilt once per tick,
 * so per-robot cost depends on local density rather than on the roster size.
 *
 * @param battleWorld - The current state of the battle world.
 * @param rng - A random number generator function.
 */
export function updateAISystem(
  battleWorld: BattleWorld,
  rng: () => number,
): void {
  perfMarkStart("updateAISystem");

  const robots = battleWorld.robots.entities;
  if (robots.length === 0) {
    perfMarkEnd("updateAISystem");
    return;
  }

  const anchors = computeTeamAnchors(robots);

  // One O(n) rebuild per tick; every per-robot query below is local to the
  // robot's neighbourhood instead of scanning the full roster.
  grid.rebuild(robots);

  for (let index = 0; index < robots.length; index += 1) {
    const robot = robots[index];
    const allies = grid.teamMembers(robot.team);
    // Sensors reject anything beyond SENSOR_RANGE, so querying exactly that
    // radius yields the same candidates (in the same order) as a full scan.
    const enemyCount = grid.queryInto(
      robot.position.x,
      robot.position.z,
      SENSOR_RANGE,
      robot.team,
      false,
      robot,
      enemiesScratch,
    );

    const { target } = updateTargeting(
      robot,
      robots,
      enemiesScratch,
      battleWorld,
      rng,
      allies,
      enemyCount,
    );

    const assignment = anchors[robot.id];
    const anchorCandidate = target
      ? (assignment?.anchorPosition ?? null)
      : (robot.ai.searchPosition ?? assignment?.anchorPosition ?? null);
    robot.ai.anchorPosition = anchorCandidate;
    robot.ai.directive =
      assignment?.directive ?? robot.ai.directive ?? "balanced";
    robot.ai.strafeSign = assignment?.strafeSign ?? robot.ai.strafeSign ?? 1;
    if (anchorCandidate) {
      const dx = robot.position.x - anchorCandidate.x;
      const dy = robot.position.y - anchorCandidate.y;
      const dz = robot.position.z - anchorCandidate.z;
      robot.ai.anchorDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    } else {
      robot.ai.anchorDistance = robot.ai.anchorDistance ?? null;
    }

    behaviorSnapshotScratch.health = robot.health;
    behaviorSnapshotScratch.maxHealth = robot.maxHealth;
    behaviorSnapshotScratch.mode =
      robot.ai.mode === "retreat"
        ? RobotBehaviorMode.Retreat
        : robot.ai.mode === "engage"
          ? RobotBehaviorMode.Engage
          : RobotBehaviorMode.Seek;
    behaviorSnapshotScratch.role = robot.role;
    behaviorContextScratch.targetDistance = robot.ai.targetDistance ?? null;
    behaviorContextScratch.anchorDistance = robot.ai.anchorDistance ?? null;
    behaviorContextScratch.rng = rng;
    const behavior = nextBehaviorState(
      behaviorSnapshotScratch,
      behaviorContextScratch,
    );

    robot.ai.mode = behavior;

    const neighborPositions = buildNeighbors(robot, grid, neighborsScratch);
    const neighborsContext = movementContextScratch;
    neighborsContext.formationAnchor = anchorCandidate ?? undefined;
    neighborsContext.strafeSign = robot.ai.strafeSign ?? 1;
    neighborsContext.neighbors =
      neighborPositions.length > 0 ? neighborPositions : undefined;
    neighborsContext.obstacles = battleWorld.obstacles.entities;

    // calculate nav target
    let navTarget = target ? target.position : undefined;
    if (behavior === RobotBehaviorMode.Retreat) {
      navTarget = resolveSpawnCenter(robot, neighborsContext);
    } else if (robot.ai.searchPosition) {
      navTarget = robot.ai.searchPosition;
    } else if (anchorCandidate) {
      navTarget = anchorCandidate;
    } else if (!target) {
      navTarget = resolveSpawnCenter(robot, neighborsContext);
    }

    if (navTarget) {
      const requested = robot.pathComponent.requestedTarget;
      // Point3D is read-only (the path system treats it as a value), so only
      // replace it when the destination actually changed.
      if (
        !requested ||
        requested.x !== navTarget.x ||
        requested.y !== navTarget.y ||
        requested.z !== navTarget.z
      ) {
        robot.pathComponent.requestedTarget = {
          x: navTarget.x,
          y: navTarget.y,
          z: navTarget.z,
        };
      }
    } else {
      robot.pathComponent.requestedTarget = null;
    }

    movementPlanScratch.velocity = robot.velocity;
    planRobotMovement(
      robot,
      behavior,
      target,
      undefined,
      neighborsContext,
      movementPlanScratch,
    );

    robot.orientation = movementPlanScratch.orientation;
    robot.speed = lengthVec3(robot.velocity);
  }

  perfMarkEnd("updateAISystem");
}
