import "./VictoryScreen.css";

import type { SimulationState } from "../../ecs/entities/SimulationState";
import { useUIStore } from "../../store/uiStore";

export interface VictoryScreenProps {
  simulation: Pick<
    SimulationState,
    "status" | "winner" | "autoRestartCountdown" | "countdownPaused"
  > & { postBattleStats?: SimulationState["postBattleStats"] };
  onTogglePause?: (paused: boolean) => void;
  onResetCountdown?: () => void;
  onShowStats?: () => void;
  onShowSettings?: () => void;
}

function formatWinnerMessage(
  winner: VictoryScreenProps["simulation"]["winner"],
): string {
  if (winner === "draw" || winner === null) {
    return "Battle Ends in a Draw";
  }

  return winner === "red" ? "Red Team Wins" : "Blue Team Wins";
}

function formatCountdown(countdown: number | null): string {
  if (countdown === null) {
    return "Auto-restart pending";
  }

  const seconds = Math.max(0, Math.ceil(countdown));
  return `Auto-restart in ${seconds}s`;
}

export function VictoryScreen({
  simulation,
  onTogglePause,
  onResetCountdown,
  onShowStats,
  onShowSettings,
}: VictoryScreenProps) {
  const isVisible =
    simulation.status === "victory" ||
    simulation.status === "simultaneous-elimination";
  const setStatsOpen = useUIStore($1);
  const openSettings = useUIStore((s) => s.openSettings);
}

export default VictoryScreen;
