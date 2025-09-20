import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { MeshStandardMaterial } from "three";

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
  const offset = useMemo(() => Math.random() * Math.PI * 2, []);

  useEffect(() => {
    baseIntensityRef.current =
      options.baseIntensity ?? material.emissiveIntensity;
  }, [material, options.baseIntensity]);

  useFrame(({ clock }) => {
    if (!enabled) {
      if (material.emissiveIntensity !== baseIntensityRef.current) {
        material.emissiveIntensity = baseIntensityRef.current;
      }
      return;
    }

    const flicker = Math.sin(clock.elapsedTime * speed + offset) * amount;
    const intensity = Math.max(0, baseIntensityRef.current * (1 + flicker));
    material.emissiveIntensity = intensity;
  });
}
