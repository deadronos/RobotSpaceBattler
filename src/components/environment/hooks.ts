import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { MeshStandardMaterial } from "three";

import {
  markVisualActive,
  unmarkVisualActive,
} from "../../utils/visualActivity";

export interface EmissiveFlickerOptions {
  enabled?: boolean;
  baseIntensity?: number;
  speed?: number;
  amount?: number;
}

export function useEmissiveFlicker(
  material: MeshStandardMaterial,
  options: EmissiveFlickerOptions = {},
) {
  const { enabled = true, speed = 2.4, amount = 0.18 } = options;
  const baseIntensityRef = useRef(
    options.baseIntensity ?? material.emissiveIntensity,
  );
  const { invalidate } = useThree();
  const offset = useMemo(() => Math.random() * Math.PI * 2, []);

  useEffect(() => {
    baseIntensityRef.current =
      options.baseIntensity ?? material.emissiveIntensity;
  }, [material, options.baseIntensity]);

  // Track visual activity so Simulation can drive the frameloop while this flicker is active
  useEffect(() => {
    if (enabled) {
      markVisualActive();
      return () => {
        unmarkVisualActive();
      };
    }
    return;
  }, [enabled]);

  useFrame(({ clock }) => {
    if (!enabled) {
      if (material.emissiveIntensity !== baseIntensityRef.current) {
        material.emissiveIntensity = baseIntensityRef.current;
        // ensure a final paint when disabling flicker
        invalidate();
      }
      return;
    }

    const flicker = Math.sin(clock.elapsedTime * speed + offset) * amount;
    const intensity = Math.max(0, baseIntensityRef.current * (1 + flicker));
    material.emissiveIntensity = intensity;
    // Drive the demand frameloop while flicker is active
    invalidate();
  });
}
