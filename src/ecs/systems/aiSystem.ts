import { lengthVec3 } from "../../lib/math/vec3";
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
import type { MovementContext } from "../../simulation/ai/pathing/types";
import {
  groupRobotsByTeam,
  mapEnemiesByTeam,
} from "../../simulation/ai/teamUtils";
import { BattleWorld } from "../world";
import { buildNeighbors } from "./aiNeighbors";

/**
 * Updates the AI for all robots in the battle world.
 * Manages sensor updates, target selection, behavior state transitions, and movement planning.
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
  const robotsByTeam = groupRobotsByTeam(robots);
  const enemiesByTeam = mapEnemiesByTeam(robotsByTeam);

  robots.forEach((robot) => {
    const allies = robotsByTeam.get(robot.team) ?? [];
    const potentialEnemies = enemiesByTeam.get(robot.team) ?? [];

    const { target } = updateTargeting(
      robot,
      robots,
      potentialEnemies,
      battleWorld,
      rng,
    );

    const assignment = anchors[robot.id];
    const anchorCandidate = target
      ? (assignment?.anchorPosition ?? null)
      : (robot.ai.searchPosition ?? assignment?.anchorPosition ?? null);
    robot.ai.anchorPosition = anchorCandidate;
    robot.ai.directive =
      assignment?.directive ?? robot.ai.directive ?? "balanced";
    robot.ai.strafeSign = assignment?.strafeSign ?? robot.ai.strafeSign ?? 1;
    robot.ai.anchorDistance = anchorCandidate
      ? lengthVec3({
          x: robot.position.x - anchorCandidate.x,
          y: robot.position.y - anchorCandidate.y,
          z: robot.position.z - anchorCandidate.z,
        })
      : (robot.ai.anchorDistance ?? null);

    const behavior = nextBehaviorState(
      {
        health: robot.health,
        maxHealth: robot.maxHealth,
        mode:
          robot.ai.mode === "retreat"
            ? RobotBehaviorMode.Retreat
            : robot.ai.mode === "engage"
              ? RobotBehaviorMode.Engage
              : RobotBehaviorMode.Seek,
        role: robot.role,
      },
      {
        targetDistance: robot.ai.targetDistance ?? null,
        anchorDistance: robot.ai.anchorDistance ?? null,
        rng,
      },
    );

    robot.ai.mode = behavior;

    const neighborPositions = buildNeighbors(robot, allies);
    const neighborsContext: MovementContext = {
      formationAnchor: anchorCandidate ?? undefined,
      strafeSign: robot.ai.strafeSign ?? 1,
      neighbors: neighborPositions.length > 0 ? neighborPositions : undefined,
      obstacles: battleWorld.obstacles.entities,
    };

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
      robot.pathComponent.requestedTarget = { x: navTarget.x, y: navTarget.y, z: navTarget.z };
    } else {
      robot.pathComponent.requestedTarget = null;
    }

    const movementPlan = planRobotMovement(
      robot,
      behavior,
      target,
      undefined,
      neighborsContext,
    );

    robot.velocity = movementPlan.velocity;
    robot.orientation = movementPlan.orientation;
    robot.speed = lengthVec3(movementPlan.velocity);
  });

  perfMarkEnd("updateAISystem");
}
