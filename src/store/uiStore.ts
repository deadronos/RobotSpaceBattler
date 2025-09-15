import { create } from 'zustand';

interface UIState {
  paused: boolean;
  speed: number; // 1x, 2x, etc.
  loading: boolean;
  setPaused: (p: boolean) => void;
  togglePaused: () => void;
  setSpeed: (s: number) => void;
  setLoading: (v: boolean) => void;
}

export const useUI = create<UIState>((set) => ({
  paused: false,
  speed: 1,
  loading: false,
  setPaused: (p) => set({ paused: p }),
  togglePaused: () => set((s) => ({ paused: !s.paused })),
  setSpeed: (s) => set({ speed: s }),
  setLoading: (v) => set({ loading: v }),
}));
