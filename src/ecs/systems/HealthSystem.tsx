import { useFrame } from '@react-three/fiber'
import { world } from '../miniplexStore'

export function HealthSystem() {
  const damageEvents = world.with('damage')
  const entitiesWithHealth = world.with('health', 'id')

  useFrame(() => {
    for (const event of damageEvents) {
      const { target, amount } = event.damage!
      if (world.has(target) && target.health) {
        const newHealth = Math.max(0, target.health.current - amount)
        world.update(target, { health: { ...target.health, current: newHealth } })
      }
      world.remove(event)
    }

    for (const entity of entitiesWithHealth) {
      if (entity.health.current <= 0) {
        console.log(`Entity ${entity.id} has been destroyed!`)
        world.remove(entity)
      }
    }
  })

  return null
}
