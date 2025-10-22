import { TEAM_CONFIGS } from "../../lib/teamConfig";
import { distance } from "../utils/vector";
import { BattleWorld, RobotEntity } from "../world";

function findClosestEnemy(
  robot: RobotEntity,
  robots: RobotEntity[],
): RobotEntity | undefined {
  let closest: RobotEntity | undefined;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of robots) {
    if (candidate.team === robot.team || candidate.health <= 0) {
      continue;
    }

    const d = distance(robot.position, candidate.position);
    if (d < closestDistance) {
      closestDistance = d;
      closest = candidate;
    }
  }

  return closest;
}

function pickCaptainTarget(
  robot: RobotEntity,
  robots: RobotEntity[],
): RobotEntity | undefined {
  const enemies = robots.filter(
    (candidate) => candidate.team !== robot.team && candidate.health > 0,
  );

  if (enemies.length === 0) {
    return undefined;
  }

  const enemyCaptain = enemies.find((candidate) => candidate.isCaptain);
  if (enemyCaptain) {
    return enemyCaptain;
  }

  const sorted = [...enemies].sort((a, b) => {
    if (b.kills !== a.kills) {
      return b.kills - a.kills;
    }

    return a.id.localeCompare(b.id);
  });

  return sorted[0];
}

export function updateAiSystem(world: BattleWorld): void {
  const robots = world.robots.entities;

  robots.forEach((robot: RobotEntity) => {
    if (robot.health <= 0) {
      return;
    }

    const target = robot.isCaptain
      ? (pickCaptainTarget(robot, robots) ?? findClosestEnemy(robot, robots))
      : findClosestEnemy(robot, robots);

    if (!target) {
      robot.ai = { mode: "seek", targetId: undefined };
      return;
    }

    const targetDistance = distance(robot.position, target.position);
    const spawnCenter = TEAM_CONFIGS[robot.team].spawnCenter;

    let mode: RobotEntity["ai"]["mode"] = "seek";

    if (robot.health < robot.maxHealth * 0.3 && targetDistance < 12) {
      mode = "retreat";
    } else if (targetDistance < 18) {
      mode = "engage";
    }

    if (mode === "retreat") {
      const anchorDistance = distance(robot.position, spawnCenter);
      if (anchorDistance < 4) {
        mode = "engage";
      }
    }

    robot.ai = { mode, targetId: target.id };
  });
}
