import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";

import { QualityProfile, useHudStore } from "../state/ui/hudStore";

const SAMPLE_WINDOW = 60;

function pickQualityProfile(avgFps: number): QualityProfile {
  if (avgFps >= 55) {
    return "High";
  }
  if (avgFps >= 35) {
    return "Medium";
  }
  return "Low";
}

function AdaptiveQualityController() {
  const qualityMode = useHudStore((state) => state.qualityMode);
  const applyAutoQuality = useHudStore((state) => state.applyAutoQuality);
  const reducedMotion = useHudStore((state) => state.reducedMotion);
  const setReducedMotion = useHudStore((state) => state.setReducedMotion);
  const setFrameTimeMs = useHudStore((state) => state.setFrameTimeMs);

  const samplesRef = useRef<number[]>([]);

  const reducers = useMemo(
    () => ({
      addSample(value: number) {
        const samples = samplesRef.current;
        samples.push(value);
        if (samples.length > SAMPLE_WINDOW) {
          samples.shift();
        }
        return (
          samples.reduce((total, sample) => total + sample, 0) / samples.length
        );
      },
    }),
    [],
  );

  useFrame((_, delta) => {
    const frameTimeMs = delta * 1000;
    const fps = frameTimeMs > 0 ? 1000 / frameTimeMs : 0;
    setFrameTimeMs(frameTimeMs);

    if (qualityMode !== "auto") {
      return;
    }

    const avgFps = reducers.addSample(fps);
    const nextProfile = pickQualityProfile(avgFps);
    applyAutoQuality(nextProfile);

    if (avgFps < 26 && !reducedMotion) {
      setReducedMotion(true);
    } else if (avgFps > 40 && reducedMotion) {
      setReducedMotion(false);
    }
  });

  return null;
}

export default AdaptiveQualityController;
