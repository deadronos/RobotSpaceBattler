import { RobotEntity, TeamId, Vec3 } from "../../ecs/world";
import { TEAM_CONFIGS } from "../../lib/teamConfig";
import {
  buildFormationAnchor,
  buildTeamDirectives,
  computeEnemyCentroid,
  findCoverPoint,
} from "./teamStrategy";

export interface CaptainDirectives {
  directive: "offense" | "defense" | "balanced";
  anchorPosition: Vec3 | null;
}

export function computeTeamAnchors(
  robots: RobotEntity[],
): Record<string, CaptainDirectives> {
  const directives = buildTeamDirectives(robots);
  const enemyCentroids: Record<TeamId, Vec3 | null> = {
    red: computeEnemyCentroid("red", robots),
    blue: computeEnemyCentroid("blue", robots),
  };

  const anchors: Record<string, CaptainDirectives> = {};

  robots.forEach((robot) => {
    if (robot.health <= 0) {
      return;
    }

    const directive = directives[robot.team];
    let anchor: Vec3 | null = null;

    if (directive === "offense") {
      const captain = robots.find(
        (candidate) => candidate.team === robot.team && candidate.isCaptain,
      );
      if (captain && captain.ai.targetId) {
        const target = robots.find(
          (candidate) => candidate.id === captain.ai.targetId,
        );
        if (target) {
          anchor = buildFormationAnchor(robot, target);
        }
      }
    } else if (directive === "defense") {
      anchor = findCoverPoint(robot, enemyCentroids[robot.team]);
    } else {
      anchor = TEAM_CONFIGS[robot.team].spawnCenter;
    }

    anchors[robot.id] = { directive, anchorPosition: anchor };
  });

  return anchors;
}
