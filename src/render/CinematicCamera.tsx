import { useFrame, useThree } from "@react-three/fiber";
import { memo, useRef } from "react";

import { useHudStore } from "../state/ui/hudStore";

function CinematicCamera() {
  const cameraMode = useHudStore((state) => state.cameraMode);
  const reducedMotion = useHudStore((state) => state.reducedMotion);
  const { camera } = useThree();
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (cameraMode !== "cinematic" || reducedMotion) {
      return;
    }

    timeRef.current += delta * 0.25;
    const radius = 32;
    const height = 16 + Math.sin(timeRef.current * 1.5) * 2;
    const x = Math.cos(timeRef.current) * radius;
    const z = Math.sin(timeRef.current) * radius;

    camera.position.set(x, height, z);
    camera.lookAt(0, 4, 0);
  });

  return null;
}

export default memo(CinematicCamera);
