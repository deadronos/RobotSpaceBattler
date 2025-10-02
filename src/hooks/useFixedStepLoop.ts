import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";

import { FixedStepDriver } from "../utils/fixedStepDriver";

type OnStep = (ctx: ReturnType<FixedStepDriver['stepOnce']>) => void;

export function useFixedStepLoop({
  enabled,
  seed,
  step,
}: {
  enabled: boolean;
  seed: number;
  step: number;
},
onStep: OnStep) {
  const driverRef = useRef<FixedStepDriver | null>(null);

  useEffect(() => {
    driverRef.current = new FixedStepDriver(seed, step);
    return () => {
      driverRef.current = null;
    };
  }, [seed, step]);

  useFrame(() => {
    if (!enabled) return;
    const driver = driverRef.current;
    if (!driver) return;
    const ctx = driver.stepOnce();
    onStep(ctx);
  });
}
