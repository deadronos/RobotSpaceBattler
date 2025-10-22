import { create } from "zustand";

import { BattleWorld, TeamId } from "../ecs/world";

export type SimulationPhase = "initializing" | "running" | "paused" | "victory";
export type QualityProfile = "High" | "Medium" | "Low";

interface SimulationStore {
  phase: SimulationPhase;
  showHud: boolean;
  cinematicMode: boolean;
  qualityProfile: QualityProfile;
  reducedMotion: boolean;
  battleWorld: BattleWorld | null;
  elapsedMs: number;
  winner: TeamId | null;
  restartTimer: number | null;
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
  toggleHud: () => void;
  toggleCinematic: () => void;
  toggleReducedMotion: () => void;
  setQualityProfile: (profile: QualityProfile) => void;
  initialize: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  phase: "initializing",
  showHud: true,
  cinematicMode: false,
  qualityProfile: "High",
  reducedMotion: false,
  battleWorld: null,
  elapsedMs: 0,
  winner: null,
  restartTimer: null,
  teamStats: {
    red: { active: 0, eliminations: 0, captainId: null, totalKills: 0 },
    blue: { active: 0, eliminations: 0, captainId: null, totalKills: 0 },
  },
  setBattleWorld: (world) => set({ battleWorld: world }),
  setPhase: (phase) => set({ phase }),
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
  toggleHud: () => set((state) => ({ showHud: !state.showHud })),
  toggleCinematic: () =>
    set((state) => ({ cinematicMode: !state.cinematicMode })),
  toggleReducedMotion: () =>
    set((state) => ({ reducedMotion: !state.reducedMotion })),
  setQualityProfile: (profile) => set({ qualityProfile: profile }),
  initialize: () =>
    set({
      phase: "running",
      elapsedMs: 0,
      winner: null,
      restartTimer: null,
      teamStats: {
        red: { active: 0, eliminations: 0, captainId: null, totalKills: 0 },
        blue: { active: 0, eliminations: 0, captainId: null, totalKills: 0 },
      },
    }),
  pause: () => set({ phase: "paused" }),
  resume: () => set({ phase: "running" }),
  reset: () =>
    set({
      phase: "initializing",
      elapsedMs: 0,
      winner: null,
      restartTimer: null,
      battleWorld: null,
      teamStats: {
        red: { active: 0, eliminations: 0, captainId: null, totalKills: 0 },
        blue: { active: 0, eliminations: 0, captainId: null, totalKills: 0 },
      },
    }),
}));
