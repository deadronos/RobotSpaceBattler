import { useSimulationStore } from "../../state/simulationStore";
import { BattleWorld, TeamId } from "../world";

const AUTO_RESTART_MS = 5000;

export function updateVictorySystem(world: BattleWorld): void {
  const store = useSimulationStore.getState();
  const { phase } = store;

  if (phase === "victory") {
    return;
  }

  const robots = world.robots.entities;
  const aliveByTeam: Record<TeamId, number> = { red: 0, blue: 0 };

  robots.forEach((robot) => {
    if (robot.health > 0) {
      aliveByTeam[robot.team] += 1;
    }
  });

  let winner: TeamId | null = null;

  if (aliveByTeam.red === 0 && aliveByTeam.blue > 0) {
    winner = "blue";
  } else if (aliveByTeam.blue === 0 && aliveByTeam.red > 0) {
    winner = "red";
  }

  if (winner) {
    store.setWinner(winner);
    store.setPhase("victory");
    store.setRestartTimer(AUTO_RESTART_MS);
  }
}
