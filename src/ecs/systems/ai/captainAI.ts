import type { Team } from "../../../types";
import { lerpVector } from "../../../utils/math";
import type { Robot } from "../../entities/Robot";
import { getTeamCenter, updateTeamCaptain } from "../../entities/Team";
import { setRobotBodyPosition } from "../../simulation/physics";
import type { WorldView } from "../../simulation/worldTypes";
import {
  addVectors,
  clampToArena,
  distance,
  normalize,
  scaleVector,
  subtractVectors,
} from "../../utils/vector";
import {
  getAliveRobots,
  getBaseFormationOffset,
  setTeamEntity,
} from "./common";

const FORMATION_SPEED = 8;

function getCaptain(world: WorldView, team: Team): Robot | undefined {
  return getAliveRobots(world, team).find((robot) => robot.isCaptain);
}

export function propagateCaptainDirectives(world: WorldView): void {
  (Object.keys(world.teams) as Team[]).forEach((team) => {
    const captain = getCaptain(world, team);
    if (!captain || !captain.aiState.targetId) {
      return;
    }

    getAliveRobots(world, team)
      .filter((robot) => !robot.isCaptain)
      .forEach((robot) => {
        robot.aiState.targetId = captain.aiState.targetId;
      });
  });
}

export function maintainFormations(world: WorldView, deltaTime: number): void {
  (Object.keys(world.teams) as Team[]).forEach((team) => {
    const captain = getCaptain(world, team);
    if (!captain) {
      return;
    }

    getAliveRobots(world, team)
      .filter((robot) => !robot.isCaptain)
      .forEach((robot) => {
        const baseOffset = getBaseFormationOffset(world, robot);
        const desiredOffset = robot.aiState.formationOffset ?? baseOffset;
        const smoothedOffset = lerpVector(baseOffset, desiredOffset, 0.6);
        robot.aiState.formationOffset = smoothedOffset;

        const formationTarget = addVectors(captain.position, smoothedOffset);
        const offset = subtractVectors(formationTarget, robot.position);
        const distanceToTarget = distance(robot.position, formationTarget);
        if (distanceToTarget < 0.01) {
          return;
        }
        const direction = normalize(offset);
        const stepSize = Math.min(
          distanceToTarget,
          FORMATION_SPEED * deltaTime,
        );
        const movement = scaleVector(direction, stepSize);
        const next = clampToArena(
          world.arena,
          addVectors(robot.position, movement),
        );
        robot.position = next;
        setRobotBodyPosition(world.physics, robot, next);
      });
  });
}

export function reassignCaptain(world: WorldView, team: Team): void {
  const spawnCenter = getTeamCenter(world.teams[team]);
  const candidates = getAliveRobots(world, team).sort((a, b) => {
    if (b.health !== a.health) {
      return b.health - a.health;
    }

    if (b.stats.kills !== a.stats.kills) {
      return b.stats.kills - a.stats.kills;
    }

    const distanceA = distance(a.position, spawnCenter);
    const distanceB = distance(b.position, spawnCenter);
    if (distanceA !== distanceB) {
      return distanceA - distanceB;
    }

    return a.id.localeCompare(b.id);
  });
  const nextCaptain = candidates[0] ?? null;

  world.entities
    .filter((robot) => robot.team === team)
    .forEach((robot) => {
      robot.isCaptain = !!nextCaptain && robot.id === nextCaptain.id;
    });

  const updatedTeam = updateTeamCaptain(
    world.teams[team],
    nextCaptain ? nextCaptain.id : null,
  );
  setTeamEntity(world, team, updatedTeam);
}
