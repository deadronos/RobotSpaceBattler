import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

import { qualityManager } from "../state/quality/QualityManager";

const TARGET_FPS = 60;
const CHECK_INTERVAL = 1000; // ms - slightly longer for stability
const FPS_TOLERANCE = 5;
const MIN_DPR = 0.5;
const MAX_DPR = typeof window !== "undefined" ? Math.min(window.devicePixelRatio, 2) : 1;
const STEP = 0.1;

/**
 * DynamicResScaler monitors the frame rate and adjusts the global DPR
 * via QualityManager to maintain a stable target FPS.
 *
 * This component should be mounted inside the R3F Canvas.
 */
export function DynamicResScaler() {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useFrame(() => {
    frameCount.current += 1;
    const time = performance.now();
    const elapsed = time - lastTime.current;

    if (elapsed >= CHECK_INTERVAL) {
      const fps = (frameCount.current * 1000) / elapsed;
      frameCount.current = 0;
      lastTime.current = time;

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
    }
  });

  return null;
}
