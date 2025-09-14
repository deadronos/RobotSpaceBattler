import { create } from "zustand";

type Team = "red" | "blue";

type UIState = {
  paused: boolean;
  togglePause: () => void;

  // whether dynamic drei Html (or other heavy scene UI) is loading
  dreiLoading: boolean;
  setDreiLoading: (loading: boolean) => void;

  redAlive: number;
  blueAlive: number;
  redKills: number;
  blueKills: number;
  setCounts: (redAlive: number, blueAlive: number) => void;
  addKill: (team: Team) => void;
};

const useUI = create<UIState>((set) => ({
  paused: false,
  togglePause: () => set((s) => ({ paused: !s.paused })),

  dreiLoading: false,
  setDreiLoading: (loading: boolean) => set(() => ({ dreiLoading: loading })),

  redAlive: 0,
  blueAlive: 0,
  redKills: 0,
  blueKills: 0,
  setCounts: (_redAlive, _blueAlive) =>
    set(() => ({ redAlive: _redAlive, blueAlive: _blueAlive })),
  addKill: (team) =>
    set((s) =>
      team === "red"
        ? { redKills: s.redKills + 1 }
        : { blueKills: s.blueKills + 1 },
    ),
}));

export default useUI;
