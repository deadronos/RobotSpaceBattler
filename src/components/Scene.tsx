import { OrbitControls, Stats } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import React, { Suspense, useEffect } from "react";

import { useUI } from "../store/uiStore";
import DiagnosticsOverlay from "./DiagnosticsOverlay";
import EnvironmentLayout from "./environment/EnvironmentLayout";
import EnvironmentLighting from "./environment/EnvironmentLighting";
import Simulation from "./Simulation";

const ENABLE_ENVIRONMENT = true;

export default function Scene() {
  const paused = useUI((s) => s.paused);

  return (
    <Canvas
      shadows
      camera={{ position: [16, 12, 16], fov: 50 }}
      // Render continuously to keep visuals in sync with physics across environments.
      // Pausing is handled by the Physics component and systems.
      frameloop="always"
    >
      <color attach="background" args={[0.04, 0.05, 0.09]} />
      {ENABLE_ENVIRONMENT ? (
        <EnvironmentLighting />
      ) : (
        <ambientLight intensity={0.3} />
      )}
      {/* Heartbeat: ensure frames are enqueued across environments */}
      <TickDriver active={!paused} hz={60} />
      <Suspense fallback={null}>
        {ENABLE_ENVIRONMENT ? <EnvironmentLayout /> : null}
        {/**
         * Tie Rapier's stepping to the render loop so visuals advance with frames,
         * and use a fixed timestep for consistency across machines.
         */}
        <Physics
          gravity={[0, -9.81, 0]}
          paused={paused}
          updateLoop="follow"
          timeStep={1 / 60}
        >
          <Simulation renderFloor={!ENABLE_ENVIRONMENT} />
        </Physics>
        <DiagnosticsOverlay updateHz={8} />
      </Suspense>
      <OrbitControls makeDefault />
      <Stats />
    </Canvas>
  );
}

function TickDriver({ active, hz = 60 }: { active: boolean; hz?: number }) {
  const { invalidate } = useThree();
  useEffect(() => {
    if (!active) return;
    const interval = Math.max(1, Math.floor(1000 / hz));
    const id = setInterval(() => invalidate(), interval);
    return () => clearInterval(id);
  }, [active, hz, invalidate]);
  return null;
}
