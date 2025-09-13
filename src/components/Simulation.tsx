import React, { useEffect } from 'react'
import * as THREE from 'three'
import { ECS, addEntity, world } from '../ecs/miniplexStore'
import Robot from '../robots/RobotFactory'
import { AISystem } from '../ecs/systems/AISystem'
import { WeaponSystem } from '../ecs/systems/WeaponSystem'
import { HealthSystem } from '../ecs/systems/HealthSystem'

// Spawner system
function Spawner() {
  useEffect(() => {
    // spawn 10 red and 10 blue robots in two zones
    const spacing = 3
    for (let i = 0; i < 10; i++) {
      const rx = -12 + (i % 5) * spacing
      const rz = -5 + Math.floor(i / 5) * spacing
      addEntity({
        team: 'red',
        position: [rx, 1, rz],
        health: { current: 100, max: 100 },
        weapon: { range: 10, cooldown: 1, lastFired: 0 },
      })
    }
    for (let i = 0; i < 10; i++) {
      const rx = 12 - (i % 5) * spacing
      const rz = 5 - Math.floor(i / 5) * spacing
      addEntity({
        team: 'blue',
        position: [rx, 1, rz],
        health: { current: 100, max: 100 },
        weapon: { range: 10, cooldown: 1, lastFired: 0 },
      })
    }

    // HACK: clear the world when the component unmounts
    return () => {
      for (const entity of world) {
        world.remove(entity)
      }
    }
  }, [])

  return null
}

export default function Simulation() {
  return (
    <>
      {/* <Spawner /> */}
      {/* <AISystem /> */}
      {/* <WeaponSystem /> */}
      {/* <HealthSystem /> */}

      {/* Ground / floor */}
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#11151d" />
      </mesh>

      {/* Render robots from the ECS */}
      {/* <ECS.Entities>
        {(entity) => <Robot key={entity.id} entity={entity} />}
      </ECS.Entities> */}

      <mesh>
        <boxGeometry />
        <meshStandardMaterial color="hotpink" />
      </mesh>
    </>
  )
}
