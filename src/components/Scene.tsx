import { Html, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import React, { Suspense } from "react";

import { useSimulationWorld } from "../ecs/world";
import { useCameraControls } from "../hooks/useCameraControls";
import { CameraUiIntegrator } from "../systems/CameraUiIntegrator";
import { getRegisteredUiAdapter } from "../systems/uiAdapterRegistry";
import Simulation from "./Simulation";

export default function Scene() {
  // create camera controls at the Scene level (production mount point)
  const world = useSimulationWorld();
  const controls = useCameraControls({ arena: world.arena });
  const adapter = getRegisteredUiAdapter();
  return (
    <Canvas shadows camera={{ position: [0, 10, 20], fov: 60 }}>
      <ambientLight intensity={0.3} />
      <directionalLight castShadow position={[10, 20, 10]} intensity={1} />
      <Suspense fallback={<Html center>Loading...</Html>}>
        <Simulation />
      </Suspense>
      <OrbitControls />
      {/* Mount production camera integrator when adapter + controls are available */}
      {adapter && controls ? (
        <CameraUiIntegrator adapter={adapter} controls={controls} />
      ) : null}
    </Canvas>
  );
}
