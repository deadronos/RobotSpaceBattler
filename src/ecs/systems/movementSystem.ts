import { RobotBehaviorMode } from "../../simulation/ai/behaviorState";
import { planRobotMovement } from "../../simulation/ai/pathing";
import { BattleWorld, RobotEntity } from "../world";

export function updateMovementSystem(
  world: BattleWorld,
  deltaSeconds: number,
): void {
  const robots = world.robots.entities;
  const aliveRobots = robots.filter(
    (candidate) => candidate.health > 0,
  );
  const neighborPositions: Record<string, { x: number; y: number; z: number }[]> =
    {};

  aliveRobots.forEach((robot) => {
    neighborPositions[robot.id] = aliveRobots
      .filter(
        (candidate) =>
          candidate.team === robot.team && candidate.id !== robot.id,
      )
      .map((candidate) => ({
        x: candidate.position.x,
        y: candidate.position.y,
        z: candidate.position.z,
      }));
  });

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
      {
        formationAnchor: robot.ai.anchorPosition ?? undefined,
        neighbors: neighborPositions[robot.id] ?? [],
        strafeSign: robot.ai.strafeSign ?? 1,
      },
    );

    robot.velocity = velocity;
    robot.orientation = orientation;
  });
}
