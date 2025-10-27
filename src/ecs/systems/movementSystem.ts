import { RobotBehaviorMode } from "../../simulation/ai/behaviorState";
import {
  integrateMovement,
  planRobotMovement,
} from "../../simulation/ai/pathing";
import { BattleWorld, RobotEntity } from "../world";

export function updateMovementSystem(
  world: BattleWorld,
  deltaSeconds: number,
): void {
  const robots = world.robots.entities;

  robots.forEach((robot: RobotEntity) => {
    if (robot.health <= 0) {
      return;
    }

    const target = robot.ai.targetId
      ? robots.find((candidate) => candidate.id === robot.ai.targetId)
      : undefined;

    const { velocity, orientation } = planRobotMovement(
      robot,
      robot.ai.mode as RobotBehaviorMode,
      target,
      undefined,
      { formationAnchor: robot.ai.anchorPosition ?? undefined },
    );

    robot.velocity = velocity;
    robot.orientation = orientation;
    robot.position = integrateMovement(
      robot.position,
      robot.velocity,
      deltaSeconds,
    );
  });
}
