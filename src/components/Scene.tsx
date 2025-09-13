import { Html,OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import React, { Suspense } from 'react'

import Simulation from './Simulation'

export default function Scene() {
  return (
    <Canvas shadows camera={{ position: [0, 20, 30], fov: 50 }}>
      <ambientLight intensity={0.4} />
      <directionalLight
        castShadow
        intensity={0.9}
        position={[10, 20, 15]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      <Suspense
        fallback={
          <Html center>
            <div style={{ color: 'white' }}>Loading...</div>
          </Html>
        }
      >
        <Physics gravity={[0, -9.81, 0]}>
          <Simulation />
        </Physics>
      </Suspense>
      <OrbitControls />
    </Canvas>
  )
}