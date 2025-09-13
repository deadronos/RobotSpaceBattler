import React, { useRef, useEffect } from 'react'
import { RigidBody } from '@react-three/rapier'
import * as THREE from 'three'

type Props = {
  team: 'red' | 'blue'
  initialPos?: THREE.Vector3
  onRigidBodyReady?: (rb: any) => void
}

export default function Robot({ team, initialPos = new THREE.Vector3(), onRigidBodyReady }: Props) {
  const ref = useRef<any>(null)

  useEffect(() => {
    if (!ref.current) return
    // expose rapier API once available
    const api = ref.current.rigidBody
    if (api && typeof onRigidBodyReady === 'function') {
      // react-three/rapier provides api as .rigidBody on ref current
      onRigidBodyReady(api)
    }
  }, [ref.current])

  const color = team === 'red' ? '#ff6b6b' : '#6ba0ff'

  return (
    <RigidBody
      ref={ref}
      position={[initialPos.x, initialPos.y, initialPos.z]}
      restitution={0.0}
      friction={1.0}
      colliders="capsule"
      mass={3}
    >
      {/* simple procedural humanoid-ish robot made with boxes and cylinders */}
      <group castShadow receiveShadow>
        {/* torso */}
        <mesh position={[0, 0.9, 0]} castShadow>
          <boxGeometry args={[0.9, 1.2, 0.6]} />
          <meshStandardMaterial color={color} />
        </mesh>
        {/* head */}
        <mesh position={[0, 1.8, 0]} castShadow>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        {/* left arm */}
        <mesh position={[-0.9, 0.9, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.8, 8]} />
          <meshStandardMaterial color="#999" />
        </mesh>
        {/* right arm (weapon mount) */}
        <mesh position={[0.9, 0.9, 0.2]} castShadow>
          <boxGeometry args={[0.6, 0.2, 0.2]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        {/* legs */}
        <mesh position={[-0.25, 0.1, 0]} castShadow>
          <boxGeometry args={[0.4, 0.8, 0.4]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        <mesh position={[0.25, 0.1, 0]} castShadow>
          <boxGeometry args={[0.4, 0.8, 0.4]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      </group>
    </RigidBody>
  )
}