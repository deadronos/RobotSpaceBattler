import type { Team } from "../../../types";
import type { WorldView } from "../../simulation/worldTypes";
import { scaleVector } from "../../utils/vector";
import {
  getAliveRobots,
  getBaseFormationOffset,
  getOpposingTeam,
} from "./common";

const DEFENSIVE_RATIO_THRESHOLD = 0.8;
const AGGRESSIVE_RATIO_THRESHOLD = 1.2;
const DEFENSIVE_HEALTH_THRESHOLD = 45;
const AGGRESSIVE_HEALTH_THRESHOLD = 70;
const DEFENSIVE_FORMATION_SCALE = 1.25;
const AGGRESSIVE_FORMATION_SCALE = 0.8;

function determineStance(
  world: WorldView,
  team: Team,
): "aggressive" | "defensive" | "neutral" {
  const opposing = getOpposingTeam(team);
  const teamStats = world.teams[team];
  const opposingStats = world.teams[opposing];
  const ratio =
    teamStats.activeRobots / Math.max(1, opposingStats?.activeRobots ?? 1);
  const averageHealth = teamStats.aggregateStats.averageHealthRemaining;

  if (
    ratio <= DEFENSIVE_RATIO_THRESHOLD ||
    averageHealth < DEFENSIVE_HEALTH_THRESHOLD
  ) {
    return "defensive";
  }

  if (
    ratio >= AGGRESSIVE_RATIO_THRESHOLD &&
    averageHealth >= AGGRESSIVE_HEALTH_THRESHOLD
  ) {
    return "aggressive";
  }

  return "neutral";
}

export function applyAdaptiveStrategy(world: WorldView): void {
  (Object.keys(world.teams) as Team[]).forEach((team) => {
    const stance = determineStance(world, team);
    const robots = getAliveRobots(world, team);

    robots.forEach((robot) => {
      if (robot.health <= 20) {
        robot.aiState.behaviorMode = "retreating";
      } else if (stance === "defensive") {
        robot.aiState.behaviorMode = "defensive";
      } else if (stance === "aggressive") {
        robot.aiState.behaviorMode = "aggressive";
      }

      const baseOffset = getBaseFormationOffset(world, robot);
      let scale = 1;
      if (stance === "defensive") {
        scale = DEFENSIVE_FORMATION_SCALE;
      } else if (stance === "aggressive") {
        scale = AGGRESSIVE_FORMATION_SCALE;
      }

      robot.aiState.formationOffset = scaleVector(baseOffset, scale);
    });
  });
}
