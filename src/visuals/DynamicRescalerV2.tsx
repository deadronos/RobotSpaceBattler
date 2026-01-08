import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

import { qualityManager } from "../state/quality/QualityManager";

const TARGET_FPS = 60;
const CHECK_INTERVAL = 1000; // ms - slightly longer for stability
const FPS_TOLERANCE = 5;
const MIN_DPR = 0.5;
const MAX_DPR = typeof window !== "undefined" ? Math.min(window.devicePixelRatio, 2) : 1;

/**
 * DynamicResScalerV2 monitors the frame rate and adjusts the global DPR
 * via QualityManager to maintain a stable target FPS.
 *
 * Improvements over the previous scaler:
 * - Discrete DPR levels to avoid tiny oscillations
 * - Hysteresis (require consecutive intervals before changing) to prevent flip-flopping
 * - Console debug logging for diagnostic use
 */
export function DynamicResScalerV2() {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  // Hysteresis counters to require consecutive signals before changing DPR
  const upCount = useRef(0);
  const downCount = useRef(0);
  const STABLE_THRESHOLD = 2; // require two consecutive intervals before committing

  // Discrete DPR steps to avoid small oscillations
  const DPR_LEVELS = [0.5, 0.75, 1, 1.5, 2].filter((d) => d <= MAX_DPR && d >= MIN_DPR);

  function findNearestIndex(value: number) {
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < DPR_LEVELS.length; i++) {
      const diff = Math.abs(DPR_LEVELS[i] - value);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  useFrame(() => {
    frameCount.current += 1;
    const time = performance.now();
    const elapsed = time - lastTime.current;

    if (elapsed >= CHECK_INTERVAL) {
      const fps = (frameCount.current * 1000) / elapsed;
      frameCount.current = 0;
      lastTime.current = time;

      const currentDpr = qualityManager.getSettings().visuals.render.dpr;
      const currentIdx = findNearestIndex(currentDpr);
      let desiredIdx = currentIdx;

      if (fps < TARGET_FPS - FPS_TOLERANCE) {
        // Performance is struggling, consider stepping down by one level
        desiredIdx = Math.max(0, currentIdx - 1);
      } else if (fps > TARGET_FPS + 2) {
        // Performance is great, consider stepping up by one level
        desiredIdx = Math.min(DPR_LEVELS.length - 1, currentIdx + 1);
      }

      if (desiredIdx > currentIdx) {
        upCount.current += 1;
        downCount.current = 0;
        // Only apply after enough consecutive increases
        if (upCount.current >= STABLE_THRESHOLD) {
          const nextDpr = DPR_LEVELS[desiredIdx];
          if (Math.abs(nextDpr - currentDpr) > 0.01) {
            qualityManager.setRenderDpr(nextDpr);
            console.debug(`[DynamicResScalerV2] Increasing DPR to ${nextDpr} (fps=${fps.toFixed(1)}, cnt=${upCount.current})`);
          }
          upCount.current = 0;
        }
      } else if (desiredIdx < currentIdx) {
        downCount.current += 1;
        upCount.current = 0;
        // Only apply after enough consecutive decreases
        if (downCount.current >= STABLE_THRESHOLD) {
          const nextDpr = DPR_LEVELS[desiredIdx];
          if (Math.abs(nextDpr - currentDpr) > 0.01) {
            qualityManager.setRenderDpr(nextDpr);
            console.debug(`[DynamicRescalerV2] Decreasing DPR to ${nextDpr} (fps=${fps.toFixed(1)}, cnt=${downCount.current})`);
          }
          downCount.current = 0;
        }
      } else {
        // Stable - reset counters
        upCount.current = 0;
        downCount.current = 0;
      }
    }
  });

  return null;
}
