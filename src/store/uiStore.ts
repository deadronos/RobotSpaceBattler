import { create } from "zustand";

interface UIState {
  statsOpen: boolean;
  settingsOpen: boolean;
  performanceOverlayVisible: boolean;
  setStatsOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setPerformanceOverlayVisible: (visible: boolean) => void;
  reset: () => void;
}

const initialState: Pick<
  UIState,
  "statsOpen" | "settingsOpen" | "performanceOverlayVisible"
> = {
  statsOpen: false,
  settingsOpen: false,
  performanceOverlayVisible: true,
};

export const useUIStore = create<UIState>((set) => ({
  ...initialState,
  setStatsOpen: (open) => set({ statsOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setPerformanceOverlayVisible: (visible) =>
    set({ performanceOverlayVisible: visible }),
  reset: () => set({ ...initialState }),
}));

export type { UIState };
