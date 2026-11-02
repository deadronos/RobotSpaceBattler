import type { MatchStateSnapshot } from "../runtime/state/matchStateMachine";
import { readStoredBoolean } from "./storedBoolean";

/**
 * Pure app-shell helpers for the match status line and persisted HUD
 * preferences (#166 kept `App.tsx` under the 300-line limit by moving these
 * out; #170 later added the auto-restart preference).
 */
export const ROBOT_LIST_STORAGE_KEY = "hud.showRobotList";
export const AUTO_RESTART_STORAGE_KEY = "hud.autoRestart";

export function readAutoRestartPreference(): boolean {
  return readStoredBoolean(AUTO_RESTART_STORAGE_KEY, true);
}

export function createIdleSnapshot(): MatchStateSnapshot {
  return {
    phase: "initializing",
    elapsedMs: 0,
    restartTimerMs: null,
    winner: null,
    isDraw: false,
    autoRestartEnabled: readAutoRestartPreference(),
  };
}

export function formatStatus({
  phase,
  winner,
  isDraw,
  restartTimerMs,
}: MatchStateSnapshot): string {
  switch (phase) {
    case "running":
      return "Battle in progress";
    case "paused":
      return "Simulation paused";
    case "victory": {
      const countdown =
        restartTimerMs != null ? Math.ceil(restartTimerMs / 1000) : null;
      return `${isDraw ? "Draw" : `Victory: ${winner ?? "unknown"}`}${countdown != null ? ` · restart in ${countdown}s` : ""}`;
    }
    default:
      return "Initializing space match...";
  }
}
