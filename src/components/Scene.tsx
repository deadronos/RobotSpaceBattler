import { OrbitControls, Stats } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import React, { Suspense, useEffect, useState } from 'react';

import DiagnosticsOverlay from './DiagnosticsOverlay';
import EnvironmentLayout from './environment/EnvironmentLayout';
import EnvironmentLighting from './environment/EnvironmentLighting';
import Simulation from './Simulation';

const ENABLE_ENVIRONMENT = true;

export default function Scene() {
  // Allow a full remount of the Canvas when Vite HMR updates modules.
  // This is important for r3f/rapier-based scenes where module-level singletons
  // or external state (physics, ECS world, etc.) can otherwise become
  // inconsistent across hot-reloads. Bumping `hmrKey` forces React to
  // recreate the entire Canvas tree.
  const [hmrKey, setHmrKey] = useState(0);

  useEffect(() => {
    // Vite exposes import.meta.hot in dev. Guard for environments without HMR.
    // Narrowly type the Vite HMR API to avoid using `any` directly.
  const hot = (import.meta as unknown as { hot?: { accept?: (cb?: () => void) => void } }).hot;
    if (hot && typeof hot.accept === 'function') {
      hot.accept(() => {
        // increment to force remount
        setHmrKey((k: number) => k + 1);
      });
    }
  }, []);

  return (
  // Force a continuous frameloop so the visual layer stays in sync with the
  // simulation. The simulation uses on-demand invalidation in places; setting
  // frameloop to "always" avoids cases where the canvas can appear frozen
  // while the game state continues to step.
  <Canvas key={hmrKey} frameloop="always" shadows camera={{ position: [16, 12, 16], fov: 50 }}>
      <color attach="background" args={[0.04, 0.05, 0.09]} />
      {ENABLE_ENVIRONMENT ? <EnvironmentLighting /> : <ambientLight intensity={0.3} />}
      {ENABLE_ENVIRONMENT ? (
        <Suspense fallback={null}>
          <EnvironmentLayout />
        </Suspense>
      ) : null}
      <Physics key={hmrKey} gravity={[0, -9.81, 0]}>
        <Simulation renderFloor={!ENABLE_ENVIRONMENT} />
      </Physics>
      <DiagnosticsOverlay updateHz={8} />
      <OrbitControls makeDefault />
      <Stats />
    </Canvas>
  );
}
