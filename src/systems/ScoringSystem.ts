import type { Team } from "../ecs/miniplexStore";
import { getScores, incrementScore, resetScores } from "../store/scoreStore";
import type { DeathEvent } from "./DamageSystem";

function isTeam(value: unknown): value is Team {
  return value === "red" || value === "blue";
}

export function scoringSystem(deathEvents: DeathEvent[]) {
  for (const death of deathEvents) {
    if (!isTeam(death.killerTeam)) continue;
    if (death.team === death.killerTeam) continue;

    incrementScore(death.killerTeam, 1);
  }
}

export { getScores, resetScores };
