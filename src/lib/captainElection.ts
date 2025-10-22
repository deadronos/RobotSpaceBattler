import { distance } from "../ecs/utils/vector";
import { RobotEntity } from "../ecs/world";
import { TEAM_CONFIGS } from "./teamConfig";

export function electCaptain(
  teamId: RobotEntity["team"],
  robots: RobotEntity[],
): string | null {
  if (robots.length === 0) {
    return null;
  }

  const spawnCenter = TEAM_CONFIGS[teamId].spawnCenter;

  const sorted = [...robots].sort((a, b) => {
    if (b.health !== a.health) {
      return b.health - a.health;
    }

    if (b.kills !== a.kills) {
      return b.kills - a.kills;
    }

    const distanceDelta =
      distance(a.position, spawnCenter) - distance(b.position, spawnCenter);
    if (Math.abs(distanceDelta) > 0.0001) {
      return distanceDelta < 0 ? -1 : 1;
    }

    return a.id.localeCompare(b.id);
  });

  return sorted[0]?.id ?? null;
}

export function applyCaptaincy(
  teamId: RobotEntity["team"],
  robots: RobotEntity[],
): void {
  const captainId = electCaptain(teamId, robots);

  robots.forEach((robot) => {
    robot.isCaptain = captainId === robot.id;
  });
}
