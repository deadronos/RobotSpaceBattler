import { create } from "zustand";

interface UIState {
  paused: boolean;
  speed: number; // 1x, 2x, etc.
  loading: boolean;
  friendlyFire: boolean;
  showFx: boolean;
  setPaused: (p: boolean) => void;
  togglePaused: () => void;
  setSpeed: (s: number) => void;
  setLoading: (v: boolean) => void;
  setFriendlyFire: (v: boolean) => void;
  toggleFriendlyFire: () => void;
  setShowFx: (v: boolean) => void;
  toggleShowFx: () => void;
}

export const useUI = create<UIState>((set) => ({
  paused: false,
  speed: 1,
  loading: false,
  friendlyFire: false,
  showFx: true,
  setPaused: (p) => set({ paused: p }),
  togglePaused: () => set((s) => ({ paused: !s.paused })),
  setSpeed: (s) => set({ speed: s }),
  setLoading: (v) => set({ loading: v }),
  setFriendlyFire: (v) => set({ friendlyFire: v }),
  toggleFriendlyFire: () => set((s) => ({ friendlyFire: !s.friendlyFire })),
  setShowFx: (v) => set({ showFx: v }),
  toggleShowFx: () => set((s) => ({ showFx: !s.showFx })),
}));
