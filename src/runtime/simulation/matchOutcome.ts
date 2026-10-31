import { BattleWorld, TeamId } from "../../ecs/world";
import { isActiveRobot } from "../../lib/robotHelpers";
import { MatchStateMachine } from "../state/matchStateMachine";

/** Delay before auto-restart once a match has been resolved. */
export const VICTORY_DELAY_MS = 5000;

export interface TeamTally {
  robots: Record<TeamId, number>;
  health: Record<TeamId, number>;
}

export function tallyTeams(world: BattleWorld): TeamTally {
  const tally: TeamTally = {
    robots: { red: 0, blue: 0 },
    health: { red: 0, blue: 0 },
  };
  for (const robot of world.robots.entities) {
    if (isActiveRobot(robot)) {
      tally.robots[robot.team] += 1;
      tally.health[robot.team] += robot.health;
    }
  }
  return tally;
}

function resolveByTally(tally: TeamTally): TeamId | null {
  if (tally.robots.red !== tally.robots.blue) {
    return tally.robots.red > tally.robots.blue ? "red" : "blue";
  }
  if (tally.health.red !== tally.health.blue) {
    return tally.health.red > tally.health.blue ? "red" : "blue";
  }
  return null;
}

/**
 * Ends the match when a team is wiped out (or both are: a draw) or when the
 * optional match time limit expires (resolved by robots left, then total HP).
 */
export function evaluateMatchOutcome(
  world: BattleWorld,
  matchMachine: MatchStateMachine,
  maxMatchDurationMs?: number,
): void {
  const snapshot = matchMachine.getSnapshot();
  if (snapshot.phase !== "running") {
    return;
  }

  const tally = tallyTeams(world);
  const redOut = tally.robots.red === 0;
  const blueOut = tally.robots.blue === 0;

  if (redOut && blueOut) {
    matchMachine.declareDraw(VICTORY_DELAY_MS);
    return;
  }
  if (redOut || blueOut) {
    matchMachine.declareVictory(redOut ? "blue" : "red", VICTORY_DELAY_MS);
    return;
  }

  if (
    maxMatchDurationMs !== undefined &&
    snapshot.elapsedMs >= maxMatchDurationMs
  ) {
    const winner = resolveByTally(tally);
    if (winner) {
      matchMachine.declareVictory(winner, VICTORY_DELAY_MS);
    } else {
      matchMachine.declareDraw(VICTORY_DELAY_MS);
    }
  }
}
