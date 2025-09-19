import { OrbitControls, Stats } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import React, { Suspense } from 'react';

import DiagnosticsOverlay from './DiagnosticsOverlay';
import EnvironmentLayout from './environment/EnvironmentLayout';
import EnvironmentLighting from './environment/EnvironmentLighting';
import Simulation from './Simulation';

const ENABLE_ENVIRONMENT = true;

export default function Scene() {
  return (
  <Canvas shadows camera={{ position: [16, 12, 16], fov: 50 }}>
      <color attach="background" args={[0.04, 0.05, 0.09]} />
      {ENABLE_ENVIRONMENT ? <EnvironmentLighting /> : <ambientLight intensity={0.3} />}
      <Suspense fallback={null}>
        {ENABLE_ENVIRONMENT ? <EnvironmentLayout /> : null}
        <Physics gravity={[0, -9.81, 0]}>
          <Simulation renderFloor={!ENABLE_ENVIRONMENT} />
        </Physics>
        <DiagnosticsOverlay updateHz={8} />
      </Suspense>
      <OrbitControls makeDefault />
      <Stats />
    </Canvas>
  );
}
