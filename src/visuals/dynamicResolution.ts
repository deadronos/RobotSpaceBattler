export const TARGET_FPS = 60;
export const CHECK_INTERVAL_MS = 1000;
export const FPS_TOLERANCE = 5;
export const MIN_DPR = 0.5;
export const MAX_DPR =
  typeof window !== "undefined" ? Math.min(window.devicePixelRatio, 2) : 1;
