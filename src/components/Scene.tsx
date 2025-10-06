import { Html,OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import React, { Suspense } from 'react'

import Simulation from './Simulation'

export default function Scene() {
  return (
    <Canvas shadows camera={{ position: [0, 10, 20], fov: 60 }}>
      <ambientLight intensity={0.3} />
      <directionalLight castShadow position={[10, 20, 10]} intensity={1} />
      <Suspense fallback={<Html center>Loading...</Html>}>
        <Simulation />
      </Suspense>
      <OrbitControls />
    </Canvas>
  )
}
