/* eslint-disable no-unused-vars */
import { CapsuleCollider,RigidBody } from '@react-three/rapier'
import React, { useCallback,useRef } from 'react'
import * as THREE from 'three'

type Props = {
  team: 'red' | 'blue'
  initialPos?: THREE.Vector3
  onRigidBodyReady?: (rb: any) => void
  muzzleFlash?: boolean
}

export default function Robot({ team, initialPos = new THREE.Vector3(), onRigidBodyReady, muzzleFlash }: Props) {
  const ref = useRef<any>(null)

  // Use a callback ref so we can read the attached rigidBody as soon as
  // the underlying RigidBody mounts. This is more reliable than a timing-
  // sensitive effect across versions of react-three/rapier.
  const setRef = useCallback((node: any) => {
    ref.current = node
    if (node?.rigidBody && typeof onRigidBodyReady === 'function') {
      onRigidBodyReady(node.rigidBody)
    }
  }, [onRigidBodyReady])

  const color = team === 'red' ? '#ff6b6b' : '#6ba0ff'

  return (
    <RigidBody
      ref={setRef}
      position={[initialPos.x, initialPos.y, initialPos.z]}
      restitution={0.0}
      friction={1.0}
      colliders={false}
      mass={4}
      enabledRotations={[false, true, false]}
      linearDamping={0.5}
      angularDamping={1.0}
    >
      {/* explicit capsule collider for stable ground contact */}
      <CapsuleCollider args={[0.6, 0.35]} />
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
        {/* muzzle flash near weapon tip when firing */}
        {muzzleFlash && (
          <mesh position={[1.2, 0.9, 0.2]} castShadow>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshStandardMaterial color={team === 'red' ? 'orange' : 'skyblue'} emissive={team === 'red' ? 'orange' : 'skyblue'} emissiveIntensity={2} />
          </mesh>
        )}
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