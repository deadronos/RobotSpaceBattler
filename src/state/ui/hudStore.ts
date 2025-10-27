import { create } from "zustand";

export type QualityProfile = "High" | "Medium" | "Low";
export type CameraMode = "default" | "cinematic";

export type HudLatencyAction =
  | "toggleHud"
  | "setCameraMode"
  | "setQualityProfile"
  | "toggleReducedMotion";

export interface HudLatencyEvent {
  action: HudLatencyAction;
  durationMs: number;
  timestamp: number;
}

export type QualityMode = "manual" | "auto";

export type HudLatencyListener = (event: HudLatencyEvent) => void;

type HudStoreState = {
  showHud: boolean;
  cameraMode: CameraMode;
  qualityProfile: QualityProfile;
  qualityMode: QualityMode;
  reducedMotion: boolean;
  frameTimeMs: number;
  showDebugStats: boolean;
  registerLatencyListener: (listener: HudLatencyListener) => () => void;
  toggleHud: () => void;
  setCameraMode: (mode: CameraMode) => void;
  setQualityProfile: (profile: QualityProfile) => void;
  toggleReducedMotion: () => void;
  setQualityMode: (mode: QualityMode) => void;
  applyAutoQuality: (profile: QualityProfile) => void;
  setReducedMotion: (value: boolean) => void;
  setFrameTimeMs: (ms: number) => void;
  toggleDebugStats: () => void;
};

const latencyListeners = new Set<HudLatencyListener>();

const now = () => {
  if (
    typeof performance !== "undefined" &&
    typeof performance.now === "function"
  ) {
    return performance.now();
  }
  return Date.now();
};

const emitLatency = (action: HudLatencyAction, startedAt: number) => {
  const timestamp = now();
  const durationMs = Math.max(0, timestamp - startedAt);
  const event: HudLatencyEvent = { action, durationMs, timestamp };
  latencyListeners.forEach((listener) => listener(event));
};

export const useHudStore = create<HudStoreState>((set) => ({
  showHud: true,
  cameraMode: "default",
  qualityProfile: "High",
  qualityMode: "manual",
  reducedMotion: false,
  frameTimeMs: 0,
  showDebugStats: false,
  registerLatencyListener: (listener) => {
    latencyListeners.add(listener);
    return () => latencyListeners.delete(listener);
  },
  toggleHud: () => {
    const startedAt = now();
    set((state) => ({ showHud: !state.showHud }));
    emitLatency("toggleHud", startedAt);
  },
  setCameraMode: (mode) => {
    const startedAt = now();
    set({ cameraMode: mode });
    emitLatency("setCameraMode", startedAt);
  },
  setQualityProfile: (profile) => {
    const startedAt = now();
    set({ qualityProfile: profile, qualityMode: "manual" });
    emitLatency("setQualityProfile", startedAt);
  },
  toggleReducedMotion: () => {
    const startedAt = now();
    set((state) => ({ reducedMotion: !state.reducedMotion }));
    emitLatency("toggleReducedMotion", startedAt);
  },
  setQualityMode: (mode) => set({ qualityMode: mode }),
  applyAutoQuality: (profile) =>
    set((state) =>
      state.qualityProfile === profile && state.qualityMode === "auto"
        ? state
        : { qualityProfile: profile, qualityMode: "auto" },
    ),
  setReducedMotion: (value) => set({ reducedMotion: value }),
  setFrameTimeMs: (ms) => set({ frameTimeMs: ms }),
  toggleDebugStats: () => set((state) => ({ showDebugStats: !state.showDebugStats })),
}));

export const hudLatencyListeners = latencyListeners;
