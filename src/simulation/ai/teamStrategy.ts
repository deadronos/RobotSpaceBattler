import { addVec3, normalize, scaleVec3, subVec3 } from "../../ecs/utils/vector";
import { RobotEntity, TeamId, Vec3 } from "../../ecs/world";
import { TEAM_CONFIGS } from "../../lib/teamConfig";

export type TeamDirective = "offense" | "defense" | "balanced";

const ADVANTAGE_THRESHOLD = 2;
const FORMATION_RING_RADIUS = 5.5;

export function buildTeamDirectives(
  robots: RobotEntity[],
): Record<TeamId, TeamDirective> {
  const aliveCounts: Record<TeamId, number> = { red: 0, blue: 0 };
  robots.forEach((robot) => {
    if (robot.health > 0) {
      aliveCounts[robot.team] += 1;
    }
  });

  const directives: Record<TeamId, TeamDirective> = {
    red: "balanced",
    blue: "balanced",
  };

  if (aliveCounts.red >= aliveCounts.blue + ADVANTAGE_THRESHOLD) {
    directives.red = "offense";
    directives.blue =
      aliveCounts.blue <= aliveCounts.red - ADVANTAGE_THRESHOLD
        ? "defense"
        : "balanced";
  } else if (aliveCounts.blue >= aliveCounts.red + ADVANTAGE_THRESHOLD) {
    directives.blue = "offense";
    directives.red =
      aliveCounts.red <= aliveCounts.blue - ADVANTAGE_THRESHOLD
        ? "defense"
        : "balanced";
  }

  return directives;
}

export function computeEnemyCentroid(
  team: TeamId,
  robots: RobotEntity[],
): Vec3 | null {
  const accum = { x: 0, y: 0, z: 0 };
  let count = 0;
  robots.forEach((robot) => {
    if (robot.team !== team && robot.health > 0) {
      accum.x += robot.position.x;
      accum.y += robot.position.y;
      accum.z += robot.position.z;
      count += 1;
    }
  });

  if (count === 0) {
    return null;
  }

  return { x: accum.x / count, y: accum.y / count, z: accum.z / count };
}

export function buildFormationAnchor(
  robot: RobotEntity,
  target: RobotEntity,
): Vec3 {
  const slot = robot.spawnIndex % 6;
  const angle = (slot / 6) * Math.PI * 2;
  const offset = {
    x: Math.cos(angle) * FORMATION_RING_RADIUS,
    y: 0,
    z: Math.sin(angle) * FORMATION_RING_RADIUS,
  };
  return addVec3(target.position, offset);
}

export function findCoverPoint(
  robot: RobotEntity,
  enemyCentroid: Vec3 | null,
): Vec3 {
  const spawnCenter = TEAM_CONFIGS[robot.team].spawnCenter;
  if (!enemyCentroid) {
    return spawnCenter;
  }

  const direction = normalize(subVec3(spawnCenter, enemyCentroid));
  return addVec3(spawnCenter, scaleVec3(direction, 6));
}
