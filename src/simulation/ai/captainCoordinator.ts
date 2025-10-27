import { addVec3 } from "../../ecs/utils/vector";
import { RobotEntity, TeamId, Vec3 } from "../../ecs/world";
import { TEAM_CONFIGS } from "../../lib/teamConfig";
import { getGridFormationOffset, getRingFormationOffset } from "../../lib/formation";
import {
  buildFormationAnchor,
  buildTeamDirectives,
  computeEnemyCentroid,
  findCoverPoint,
  FormationSlot,
} from "./teamStrategy";

const BALANCED_RING_RADIUS = 8;

export interface CaptainDirectives {
  directive: "offense" | "defense" | "balanced";
  anchorPosition: Vec3 | null;
  strafeSign?: 1 | -1;
}

interface FormationAssignment extends FormationSlot {
  strafeSign: 1 | -1;
}

export function computeTeamAnchors(
  robots: RobotEntity[],
): Record<string, CaptainDirectives> {
  const directives = buildTeamDirectives(robots);
  const enemyCentroids: Record<TeamId, Vec3 | null> = {
    red: computeEnemyCentroid("red", robots),
    blue: computeEnemyCentroid("blue", robots),
  };

  const aliveByTeam: Record<TeamId, RobotEntity[]> = { red: [], blue: [] };
  robots.forEach((robot) => {
    if (robot.health > 0) {
      aliveByTeam[robot.team].push(robot);
    }
  });

  (Object.keys(aliveByTeam) as TeamId[]).forEach((team) => {
    aliveByTeam[team].sort((a, b) => a.spawnIndex - b.spawnIndex);
  });

  const slotIndexByRobot: Record<string, FormationAssignment> = {};
  (Object.keys(aliveByTeam) as TeamId[]).forEach((team) => {
    const members = aliveByTeam[team];
    const count = members.length > 0 ? members.length : 1;
    members.forEach((member, index) => {
      const strafeSign: 1 | -1 = index % 2 === 0 ? 1 : -1;
      slotIndexByRobot[member.id] = { index, count, strafeSign };
    });
  });

  const anchors: Record<string, CaptainDirectives> = {};

  robots.forEach((robot) => {
    if (robot.health <= 0) {
      return;
    }

    const directive = directives[robot.team];
    let anchor: Vec3 | null = null;

    const slot = slotIndexByRobot[robot.id];
    const strafeSign = slot?.strafeSign ?? 1;

    if (directive === "offense") {
      const captain = robots.find(
        (candidate) => candidate.team === robot.team && candidate.isCaptain,
      );
      if (captain && captain.ai.targetId) {
        const target = robots.find(
          (candidate) => candidate.id === captain.ai.targetId,
        );
        if (target) {
          anchor = buildFormationAnchor(
            robot,
            target,
            slot ?? { index: robot.spawnIndex, count: 1 },
          );
        }
      }
    } else if (directive === "defense") {
      const base = findCoverPoint(robot, enemyCentroids[robot.team]);
      if (slot) {
        const offset = getGridFormationOffset(slot.index, slot.count);
        anchor = addVec3(base, { x: offset.x, y: 0, z: offset.z });
      } else {
        anchor = base;
      }
    } else {
      const centroid = enemyCentroids[robot.team];
      if (centroid && slot) {
        const offset = getRingFormationOffset(
          slot.index,
          slot.count,
          BALANCED_RING_RADIUS,
        );
        anchor = addVec3(centroid, { x: offset.x, y: 0, z: offset.z });
      } else {
        const base = TEAM_CONFIGS[robot.team].spawnCenter;
        if (slot) {
          const offset = getGridFormationOffset(slot.index, slot.count);
          anchor = addVec3(base, { x: offset.x, y: 0, z: offset.z });
        } else {
          anchor = base;
        }
      }
    }

    anchors[robot.id] = {
      directive,
      anchorPosition: anchor,
      strafeSign,
    };
  });

  return anchors;
}
