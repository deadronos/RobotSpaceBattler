import { TEAM_CONFIGS } from "../../lib/teamConfig";
import {
  nextBehaviorState,
  RobotBehaviorMode,
} from "../../simulation/ai/behaviorState";
import {
  findClosestEnemy,
  pickCaptainTarget,
} from "../../simulation/ai/targeting";
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
    const spawnCenter = TEAM_CONFIGS[robot.team].spawnCenter;
    const anchorDistance = distance(robot.position, spawnCenter);

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

    robot.ai = { mode: nextMode, targetId: target?.id };
  });
}
