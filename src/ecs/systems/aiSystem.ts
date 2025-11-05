import {
  cloneVec3,
  distanceVec3,
  lengthVec3,
  Vec3,
} from '../../lib/math/vec3';
import { nextBehaviorState, RobotBehaviorMode } from '../../simulation/ai/behaviorState';
import { computeTeamAnchors } from '../../simulation/ai/captainCoordinator';
import { MovementContext, planRobotMovement } from '../../simulation/ai/pathing';
import { findClosestEnemy, pickCaptainTarget } from '../../simulation/ai/targeting';
import { BattleWorld, RobotEntity } from '../world';

function buildNeighbors(robot: RobotEntity, allies: RobotEntity[]): Vec3[] {
  return allies
    .filter((ally) => ally.id !== robot.id)
    .filter((ally) => distanceVec3(ally.position, robot.position) < 2.5)
    .map((ally) => cloneVec3(ally.position));
}

export function updateAISystem(battleWorld: BattleWorld, rng: () => number): void {
  const robots = battleWorld.robots.entities;
  if (robots.length === 0) {
    return;
  }

  const robotsById = new Map(robots.map((robot) => [robot.id, robot]));
  const anchors = computeTeamAnchors(robots);

  robots.forEach((robot) => {
    const allies = robots.filter((ally) => ally.team === robot.team && ally.health > 0);

    let target: RobotEntity | undefined;
    if (robot.isCaptain) {
      target = pickCaptainTarget(robot, robots);
    } else if (robot.ai.targetId) {
      target = robotsById.get(robot.ai.targetId);
    }

    if (!target) {
      target = findClosestEnemy(robot, robots) ?? undefined;
    }

    robot.ai.targetId = target?.id;
    const targetDistance = target ? distanceVec3(robot.position, target.position) : null;
    robot.ai.targetDistance = targetDistance;

    const assignment = anchors[robot.id];
    const formationAnchor = assignment?.anchorPosition ?? null;
    robot.ai.anchorPosition = formationAnchor;
    robot.ai.directive = assignment?.directive ?? robot.ai.directive ?? 'balanced';
    robot.ai.strafeSign = assignment?.strafeSign ?? robot.ai.strafeSign ?? 1;
    robot.ai.anchorDistance = formationAnchor
      ? distanceVec3(robot.position, formationAnchor)
      : robot.ai.anchorDistance ?? null;

    const behavior = nextBehaviorState(
      {
        health: robot.health,
        maxHealth: robot.maxHealth,
        mode:
          robot.ai.mode === 'retreat'
            ? RobotBehaviorMode.Retreat
            : robot.ai.mode === 'engage'
              ? RobotBehaviorMode.Engage
              : RobotBehaviorMode.Seek,
      },
      {
        targetDistance,
        anchorDistance: robot.ai.anchorDistance ?? null,
        rng,
      },
    );

    robot.ai.mode = behavior;

    const neighborPositions = buildNeighbors(robot, allies);
    const neighborsContext: MovementContext = {
      formationAnchor: formationAnchor ?? undefined,
      strafeSign: robot.ai.strafeSign ?? 1,
      neighbors: neighborPositions.length > 0 ? neighborPositions : undefined,
    };

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
}
