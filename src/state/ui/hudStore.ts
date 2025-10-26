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

export type HudLatencyListener = (event: HudLatencyEvent) => void;

type HudStoreState = {
  showHud: boolean;
  cameraMode: CameraMode;
  qualityProfile: QualityProfile;
  reducedMotion: boolean;
  registerLatencyListener: (listener: HudLatencyListener) => () => void;
  toggleHud: () => void;
  setCameraMode: (mode: CameraMode) => void;
  setQualityProfile: (profile: QualityProfile) => void;
  toggleReducedMotion: () => void;
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
  reducedMotion: false,
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
    set({ qualityProfile: profile });
    emitLatency("setQualityProfile", startedAt);
  },
  toggleReducedMotion: () => {
    const startedAt = now();
    set((state) => ({ reducedMotion: !state.reducedMotion }));
    emitLatency("toggleReducedMotion", startedAt);
  },
}));

export const hudLatencyListeners = latencyListeners;
