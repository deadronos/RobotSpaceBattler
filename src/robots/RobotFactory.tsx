import React, { useRef, useEffect } from 'react'
import { RigidBody, RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { Entity, world } from '../ecs/miniplexStore'

type Props = {
  entity: Entity
}

export default function Robot({ entity }: Props) {
  const ref = useRef<RapierRigidBody>(null)

  useEffect(() => {
    if (!ref.current) return
    // Update the entity with its rigid body reference
    world.update(entity, { rigidBody: ref.current })
  }, [entity, ref.current])

  const color = entity.team === 'red' ? '#ff6b6b' : '#6ba0ff'
  const position = new THREE.Vector3().fromArray(entity.position!)

  return (
    <RigidBody
      ref={ref}
      position={position}
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