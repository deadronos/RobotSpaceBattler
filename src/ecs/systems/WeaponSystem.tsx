import { useFrame } from '@react-three/fiber'
import { world, addEntity, ECS } from '../miniplexStore'
import useUI from '../../store/uiStore'

// How often the weapon system should run, in seconds.
const WEAPON_TICK_RATE = 1 / 5 // 5 times per second

export function WeaponSystem() {
  const { paused } = useUI()
  const entities = ECS.world.with('team', 'weapon', 'rigidBody', 'target')
  let timeSinceLastTick = 0

  useFrame((state, delta) => {
    if (paused) return

    timeSinceLastTick += delta
    if (timeSinceLastTick < WEAPON_TICK_RATE) {
      return
    }
    timeSinceLastTick = 0

    const now = state.clock.getElapsedTime()

    for (const entity of entities) {
      const { weapon, rigidBody, target } = entity

      if (!target.rigidBody) continue

      // Check if weapon is on cooldown
      if (now - weapon.lastFired < weapon.cooldown) {
        continue
      }

      // Check if target is in range
      const distance = rigidBody.translation().distanceTo(target.rigidBody.translation())
      if (distance > weapon.range) {
        continue
      }

      // Fire weapon!
      console.log(`Entity ${entity.id} fired at ${target.id}!`)

      // Update last fired time
      world.update(entity, { weapon: { ...weapon, lastFired: now } })

      // Create a damage event
      addEntity({
        damage: {
          target: target,
          amount: 10,
        },
      })
    }
  })

  return null
}
