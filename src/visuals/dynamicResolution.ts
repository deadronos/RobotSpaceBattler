import { resolveDefaultDpr } from "../state/quality/qualityDefaults";

export const TARGET_FPS = 60;
export const CHECK_INTERVAL_MS = 1000;
export const FPS_TOLERANCE = 5;
/** FPS at or above which the scaler may step resolution back up. */
export const RECOVER_FPS = TARGET_FPS - 2;
export const MIN_DPR = 0.75;
/** Upper bound for the scaler; equals the initial (default) DPR. */
export const MAX_DPR = resolveDefaultDpr();
