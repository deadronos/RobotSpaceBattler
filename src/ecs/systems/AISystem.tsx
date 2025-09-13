import { useFrame } from '@react-three/fiber'
import { ECS, world } from '../miniplexStore'
import useUI from '../../store/uiStore'
import * as THREE from 'three'
import { rng } from '../../lib/rng'

// How often the AI should run, in seconds.
const AI_TICK_RATE = 1 / 10 // 10 times per second

export function AISystem() {
  const { paused } = useUI()
  const entities = ECS.useEntities()
  let timeSinceLastTick = 0

  useFrame((_, delta) => {
    if (paused) return

    timeSinceLastTick += delta
    if (timeSinceLastTick < AI_TICK_RATE) {
      return
    }
    timeSinceLastTick = 0

    const entitiesWithRigidBody = entities.filter((e) => e.rigidBody)

    for (const entity of entitiesWithRigidBody) {
      // Find nearest enemy
      const enemies = entitiesWithRigidBody.filter(
        (other) => other.team !== entity.team
      )

      if (enemies.length === 0) {
        world.update(entity, { target: undefined })
        continue
      }

      // Find the 3 nearest enemies
      const entityPosition = entity.rigidBody!.translation()
      const sortedEnemies = enemies
        .map((enemy) => ({
          enemy,
          distance: entityPosition.distanceTo(enemy.rigidBody!.translation()),
        }))
        .sort((a, b) => a.distance - b.distance)

      const nearestEnemies = sortedEnemies.slice(0, 3).map((e) => e.enemy)

      // Pick one of the nearest enemies at random
      const nearestEnemy = nearestEnemies[Math.floor(rng() * nearestEnemies.length)]

      // Set target
      world.update(entity, { target: nearestEnemy })

      // Steer towards the nearest enemy
      const from = entity.rigidBody!.translation()
      const to = nearestEnemy.rigidBody!.translation()
      const direction = new THREE.Vector3().subVectors(to, from).normalize()

      const speed = 4
      const linearVelocity = {
        x: direction.x * speed,
        y: entity.rigidBody!.linvel().y,
        z: direction.z * speed,
      }

      entity.rigidBody!.setLinvel(linearVelocity, true)
    }
  })

  return null
}
