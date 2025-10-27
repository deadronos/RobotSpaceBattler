import { TEAM_CONFIGS } from "../../lib/teamConfig";
import {
  nextBehaviorState,
  RobotBehaviorMode,
} from "../../simulation/ai/behaviorState";
import { computeTeamAnchors } from "../../simulation/ai/captainCoordinator";
import {
  findClosestEnemy,
  pickCaptainTarget,
} from "../../simulation/ai/targeting";
import {
  buildTeamDirectives,
  computeEnemyCentroid,
} from "../../simulation/ai/teamStrategy";
import { distance } from "../utils/vector";
import { BattleWorld, RobotEntity } from "../world";

export interface UpdateAiOptions {
  rng?: () => number;
}

export function updateAiSystem(
  world: BattleWorld,
  options: UpdateAiOptions = {},
): void {
  const robots = world.robots.entities;
  const rng = options.rng ?? Math.random;
  const directives = buildTeamDirectives(robots);
  const anchors = computeTeamAnchors(robots);
  const enemyCentroids: Record<"red" | "blue", ReturnType<typeof computeEnemyCentroid>> = {
    red: computeEnemyCentroid("red", robots),
    blue: computeEnemyCentroid("blue", robots),
  };

  robots.forEach((robot: RobotEntity) => {
    if (robot.health <= 0) {
      return;
    }

    const target = robot.isCaptain
      ? (pickCaptainTarget(robot, robots) ?? findClosestEnemy(robot, robots))
      : findClosestEnemy(robot, robots);

    const targetDistance = target
      ? distance(robot.position, target.position)
      : null;
    const anchorDirective = anchors[robot.id];
    const anchorPosition =
      anchorDirective?.anchorPosition ?? enemyCentroids[robot.team];
    const anchorReference =
      anchorPosition ?? TEAM_CONFIGS[robot.team].spawnCenter;
    const anchorDistance = distance(robot.position, anchorReference);
    const directive = directives[robot.team];
    const strafeSign = anchorDirective?.strafeSign ?? robot.ai.strafeSign ?? 1;

    const nextMode = nextBehaviorState(
      {
        health: robot.health,
        maxHealth: robot.maxHealth,
        mode: robot.ai.mode as RobotBehaviorMode,
      },
      {
        targetDistance,
        anchorDistance,
        rng,
      },
    );

    robot.ai = {
      mode: nextMode,
      targetId: target?.id,
      directive,
      anchorPosition,
      strafeSign,
    };
  });
}
