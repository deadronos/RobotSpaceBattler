import { OrbitControls, Stats } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import React, { Suspense } from 'react';

import Simulation from './Simulation';

export default function Scene() {
  return (
    <Canvas shadows camera={{ position: [16, 12, 16], fov: 50 }}>
      <color attach="background" args={[0.04, 0.05, 0.09]} />
      <ambientLight intensity={0.3} />
      <directionalLight
        castShadow
        position={[10, 15, 5]}
        intensity={1.1}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]}>
          <Simulation />
        </Physics>
      </Suspense>
      <OrbitControls makeDefault />
      <Stats />
    </Canvas>
  );
}
