import { OrbitControls, Stats } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import React, { Suspense, useEffect, useState } from "react";

// import DiagnosticsOverlay from './DiagnosticsOverlay';
import EnvironmentLayout from "./environment/EnvironmentLayout";
import EnvironmentLighting from "./environment/EnvironmentLighting";
import Simulation from "./Simulation";

const ENABLE_ENVIRONMENT = true;

export default function Scene() {
  // HMR-safe: force a full Canvas remount on hot updates to avoid stale singletons.
  const [hmrKey, setHmrKey] = useState(0);

  useEffect(() => {
    const hot = (
      import.meta as unknown as { hot?: { accept?: (cb?: () => void) => void } }
    ).hot;
    hot?.accept?.(() => setHmrKey((k) => k + 1));
  }, []);

  return (
    <Canvas
      key={hmrKey}
      frameloop="demand"
      shadows
      camera={{ position: [16, 12, 16], fov: 50 }}
    >
      {/* Backdrop & lighting */}
      <color attach="background" args={[0.04, 0.05, 0.09]} />
      {ENABLE_ENVIRONMENT ? (
        <EnvironmentLighting />
      ) : (
        <ambientLight intensity={0.3} />
      )}
      {ENABLE_ENVIRONMENT ? (
        <Suspense fallback={null}>
          <EnvironmentLayout />
        </Suspense>
      ) : null}

      {/* Physics world and simulation */}
      <Physics
        updateLoop="independent"
        timeStep={1 / 60}
        key={hmrKey}
        gravity={[0, -9.81, 0]}
      >
        <Simulation renderFloor={!ENABLE_ENVIRONMENT} />
      </Physics>

      {/* Diagnostics & controls */}
      {/* <DiagnosticsOverlay updateHz={8} /> */}
      <OrbitControls makeDefault />
      <Stats />
    </Canvas>
  );
}
