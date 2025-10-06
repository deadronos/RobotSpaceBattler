import type { PerformanceStats, SimulationStatus, Team } from "../../types";

export interface SimulationUIState {
  statsOpen: boolean;
  settingsOpen: boolean;
}

export interface SimulationState {
  status: SimulationStatus;
  winner: Team | "draw" | null;
  frameTime: number;
  totalFrames: number;
  simulationTime: number;
  timeScale: number;
  victoryScreenStartTime: number | null;
  autoRestartCountdown: number | null;
  countdownPaused: boolean;
  performanceStats: PerformanceStats;
  pendingTeamConfig: Record<Team, unknown> | null;
  ui: SimulationUIState;
  postBattleStats?: PostBattleStats | null;
}

const INITIAL_PERFORMANCE: PerformanceStats = {
  currentFPS: 60,
  averageFPS: 60,
  qualityScalingActive: false,
};

export function createInitialSimulationState(): SimulationState {
  return {
    status: "running",
    winner: null,
    frameTime: 0,
    totalFrames: 0,
    simulationTime: 0,
    timeScale: 1,
    victoryScreenStartTime: null,
    autoRestartCountdown: null,
    countdownPaused: false,
    performanceStats: { ...INITIAL_PERFORMANCE },
    pendingTeamConfig: null,
    ui: {
      statsOpen: false,
      settingsOpen: false,
    },
  };
}

export function tickSimulation(
  state: SimulationState,
  deltaTime: number,
): SimulationState {
  return {
    ...state,
    frameTime: deltaTime,
    totalFrames: state.totalFrames + 1,
    simulationTime: state.simulationTime + deltaTime * state.timeScale,
  };
}

export function setVictoryState(
  state: SimulationState,
  winner: Team | "draw",
  currentTime: number,
): SimulationState {
  return {
    ...state,
    status: winner === "draw" ? "simultaneous-elimination" : "victory",
    winner,
    victoryScreenStartTime: currentTime,
    autoRestartCountdown: 5,
    countdownPaused: false,
  };
}

export function setCountdownPaused(
  state: SimulationState,
  paused: boolean,
): SimulationState {
  if (state.autoRestartCountdown === null) {
    return state;
  }

  return {
    ...state,
    countdownPaused: paused,
  };
}

export function resetAutoRestartCountdown(
  state: SimulationState,
): SimulationState {
  if (state.autoRestartCountdown === null) {
    return state;
  }

  return {
    ...state,
    autoRestartCountdown: 5,
  };
}

export function tickAutoRestart(
  state: SimulationState,
  deltaTime: number,
): SimulationState {
  if (state.autoRestartCountdown === null || state.countdownPaused) {
    return state;
  }

  const nextCountdown = Math.max(0, state.autoRestartCountdown - deltaTime);
  return {
    ...state,
    autoRestartCountdown: nextCountdown,
  };
}

export function clearVictoryState(state: SimulationState): SimulationState {
  return {
    ...state,
    status: "running",
    winner: null,
    victoryScreenStartTime: null,
    autoRestartCountdown: null,
    countdownPaused: false,
    ui: {
      statsOpen: false,
      settingsOpen: false,
    },
  };
}

export function setStatsOpen(
  state: SimulationState,
  open: boolean,
): SimulationState {
  return {
    ...state,
    ui: {
      ...state.ui,
      statsOpen: open,
    },
  };
}

export function setSettingsOpen(
  state: SimulationState,
  open: boolean,
): SimulationState {
  return {
    ...state,
    ui: {
      ...state.ui,
      settingsOpen: open,
    },
  };
}

export function setPendingTeamConfig(
  state: SimulationState,
  config: Record<Team, unknown>,
): SimulationState {
  return {
    ...state,
    pendingTeamConfig: config,
  };
}

export function updatePerformanceStats(
  state: SimulationState,
  stats: Partial<PerformanceStats>,
): SimulationState {
  return {
    ...state,
    performanceStats: {
      ...state.performanceStats,
      ...stats,
    },
  };
}

export function setTimeScale(
  state: SimulationState,
  timeScale: number,
): SimulationState {
  return {
    ...state,
    timeScale,
  };
}

// Add snapshot types for post-battle statistics and helpers to set/clear them.
export interface PostBattleStats {
  perRobot: Record<string, import("../../types").RobotStats>;
  perTeam: Record<
    import("../../types").Team,
    import("../entities/Team").TeamStats
  >;
  computedAt: number;
}

export function setPostBattleStats(
  state: SimulationState,
  stats: PostBattleStats,
): SimulationState {
  return {
    ...state,
    postBattleStats: stats,
  };
}

export function clearPostBattleStats(state: SimulationState): SimulationState {
  return {
    ...state,
    postBattleStats: null,
  };
}
