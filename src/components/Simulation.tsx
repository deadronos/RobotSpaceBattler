import { useFrame } from '@react-three/fiber'
import React from 'react'

import { useSimulationWorld } from '../ecs/world'
import RobotPlaceholder from './RobotPlaceholder'

export default function Simulation(): JSX.Element {
  const world = useSimulationWorld()

  // Minimal frame hook to ensure useFrame is exercised. Real simulation
  // will be handled by ECS stepSimulation.
  useFrame(() => {
    // no-op for now
    void world
  })

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#081029" />
      </mesh>

      <RobotPlaceholder position={[0, 1, 0]} team="red" />
      <RobotPlaceholder position={[2, 1, 0]} team="blue" />
    </>
  )
}
