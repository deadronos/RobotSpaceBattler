import React, { useEffect } from 'react'
import { RigidBody, RigidBodyApi, RigidBodyProps } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createStore, createEntity } from 'miniplex'
import Robot from '../robots/RobotFactory'
import useUI from '../store/uiStore'

type Entity = {
  id: string
  team: 'red' | 'blue'
  rb?: RigidBodyApi
}

const store = createStore<Entity>()

function createRobotEntity(team: 'red' | 'blue', pos: THREE.Vector3) {
  const id = createEntity(store, { team, position: pos.toArray() })
  return id
}

export default function Simulation() {
  const { paused } = useUI()

  useEffect(() => {
    // spawn 10 red and 10 blue robots in two zones
    const spacing = 3
    for (let i = 0; i < 10; i++) {
      const rx = -12 + (i % 5) * spacing
      const rz = -5 + Math.floor(i / 5) * spacing
      createRobotEntity('red', new THREE.Vector3(rx, 1, rz))
    }
    for (let i = 0; i < 10; i++) {
      const rx = 12 - (i % 5) * spacing
      const rz = 5 - Math.floor(i / 5) * spacing
      createRobotEntity('blue', new THREE.Vector3(rx, 1, rz))
    }
  }, [])

  // A very small, naive global AI loop to apply impulses toward nearest enemy
  useFrame((_, delta) => {
    if (paused) return
    const entities = store.query().filter(e => !!e)
    entities.forEach((e) => {
      // each entity will look for the nearest enemy and apply a small force toward them
      // we store RigidBodyApi on the miniplex entity when the Robot registers it
      if (!e.rb) return
      // find nearest enemy
      const enemies = entities.filter(x => x.team !== e.team && x !== e)
      if (enemies.length === 0) return
      // compute nearest by distance using the RigidBody world transform if available
      let best = enemies[0]
      let bestDist = Number.POSITIVE_INFINITY
      enemies.forEach((enemy) => {
        const a = e.rb!.translation()
        const b = (enemy.rb && enemy.rb.translation) ? enemy.rb.translation() : new THREE.Vector3()
        // enemy.rb might not be defined yet; skip
        if (!enemy.rb) return
        const dx = a.x - b.x
        const dy = a.y - b.y
        const dz = a.z - b.z
        const d = Math.sqrt(dx*dx + dy*dy + dz*dz)
        if (d < bestDist) { bestDist = d; best = enemy }
      })
      if (!best || !best.rb) return
      // steer: compute direction and set a modest linear velocity toward target
      const from = e.rb.translation()
      const to = best.rb.translation()
      const dir = { x: to.x - from.x, y: 0, z: to.z - from.z }
      const len = Math.sqrt(dir.x*dir.x + dir.z*dir.z) || 1
      const speed = 4 // tuning value
      const vx = (dir.x / len) * speed
      const vz = (dir.z / len) * speed
      // set target linear velocity while preserving Y velocity
      const current = e.rb.linvel()
      e.rb.setLinvel({ x: vx, y: current.y, z: vz }, true)
    })
  })

  return (
    <>
      {/* Ground / floor */}
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#11151d" />
      </mesh>

      {/* Spawn robots from the store as React objects */}
      {store.query().map((e) => (
        <Robot
          key={e.id}
          team={e.team}
          initialPos={new THREE.Vector3(...(e as any).position)}
          onRigidBodyReady={(rb) => {
            // attach rapier api to the entity so AI system can access it
            const ent = store.get(e.id)
            if (ent) {
              ent.rb = rb
            }
          }}
        />
      ))}
    </>
  )
}