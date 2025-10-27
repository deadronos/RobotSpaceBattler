import { create } from "zustand";

import { BattleWorld, TeamId } from "../ecs/world";
import { InitialMatchPayload } from "../runtime/bootstrap/loadInitialMatch";
import type { MatchRuntimePhase } from "../runtime/state/matchStateMachine";

export type SimulationPhase = MatchRuntimePhase;
interface SimulationStore {
  phase: SimulationPhase;
  battleWorld: BattleWorld | null;
  elapsedMs: number;
  winner: TeamId | null;
  restartTimer: number | null;
  initialMatch: InitialMatchPayload | null;
  teamStats: Record<
    TeamId,
    {
      active: number;
      eliminations: number;
      captainId: string | null;
      totalKills: number;
    }
  >;
  setBattleWorld: (world: BattleWorld | null) => void;
  setPhase: (phase: SimulationPhase) => void;
  setWinner: (winner: TeamId | null) => void;
  setRestartTimer: (ms: number | null) => void;
  setElapsedMs: (ms: number) => void;
  updateTeamStats: (
    team: TeamId,
    stats: {
      active: number;
      eliminations: number;
      captainId: string | null;
      totalKills: number;
    },
  ) => void;
  initialize: (match?: InitialMatchPayload) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

const createInitialTeamStats = () => ({
  red: { active: 0, eliminations: 0, captainId: null, totalKills: 0 },
  blue: { active: 0, eliminations: 0, captainId: null, totalKills: 0 },
});

export const useSimulationStore = create<SimulationStore>((set) => ({
  phase: "initializing",
  battleWorld: null,
  elapsedMs: 0,
  winner: null,
  restartTimer: null,
  initialMatch: null,
  teamStats: createInitialTeamStats(),
  setBattleWorld: (world) => set({ battleWorld: world }),
  setPhase: (phase) => {
    console.log("setPhase called with:", phase);
    set({ phase });
  },
  setWinner: (winner) => set({ winner }),
  setRestartTimer: (ms) => set({ restartTimer: ms }),
  setElapsedMs: (ms) => set({ elapsedMs: ms }),
  updateTeamStats: (team, stats) =>
    set((state) => ({
      teamStats: {
        ...state.teamStats,
        [team]: stats,
      },
    })),
  initialize: (match) =>
    set((state) => {
      const nextMatch = match ?? state.initialMatch;
      if (!nextMatch) {
        throw new Error("Initial match payload is required for initialization");
      }

      return {
        phase: "initializing",
        elapsedMs: 0,
        winner: null,
        restartTimer: null,
        initialMatch: nextMatch,
        teamStats: createInitialTeamStats(),
      };
    }),
  pause: () => set({ phase: "paused" }),
  resume: () => set({ phase: "running" }),
  reset: () =>
    set((state) => ({
      phase: "initializing",
      elapsedMs: 0,
      winner: null,
      restartTimer: null,
      battleWorld: null,
      initialMatch: state.initialMatch,
      teamStats: createInitialTeamStats(),
    })),
}));
