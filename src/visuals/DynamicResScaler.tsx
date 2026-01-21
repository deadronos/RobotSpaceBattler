import { qualityManager } from "../state/quality/QualityManager";
import {
  CHECK_INTERVAL_MS,
  FPS_TOLERANCE,
  MAX_DPR,
  MIN_DPR,
  TARGET_FPS,
} from "./dynamicResolution";
import { useFpsSampler } from "./useFpsSampler";

const STEP = 0.1;

/**
 * DynamicResScaler monitors the frame rate and adjusts the global DPR
 * via QualityManager to maintain a stable target FPS.
 *
 * This component should be mounted inside the R3F Canvas.
 */
export function DynamicResScaler() {
  useFpsSampler(CHECK_INTERVAL_MS, (fps) => {
    const currentDpr = qualityManager.getSettings().visuals.render.dpr;
    let nextDpr = currentDpr;

    if (fps < TARGET_FPS - FPS_TOLERANCE) {
      // Performance is struggling, drop resolution
      nextDpr = Math.max(MIN_DPR, currentDpr - STEP);
    } else if (fps > TARGET_FPS + 2) {
      // Performance is great, we can afford higher resolution
      // We use a tighter upper bound to avoid oscillating
      nextDpr = Math.min(MAX_DPR, currentDpr + STEP);
    }

    if (Math.abs(nextDpr - currentDpr) > 0.01) {
      qualityManager.setRenderDpr(nextDpr);
      // Note: console.log removed for production, but kept here for initial verification
      // console.log(`[DynamicResScaler] FPS: ${fps.toFixed(1)}, DPR: ${nextDpr.toFixed(2)}`);
    }
  });

  return null;
}
