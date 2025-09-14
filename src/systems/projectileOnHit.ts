import type { Entity } from '../ecs/types'
import type { World } from 'miniplex'

// Handle a projectile hitting another rigid body (other). The Simulation
// onHit handler searches entities by matching `rb === other`. This helper
// centralizes that logic so tests and Simulation can call it.
export function handleProjectileHit(proj: Entity, other: unknown, storeRef: World<Entity>) {
  const ents = [...storeRef.entities.values()]
  const victim = ents.find((e) => (e as unknown as { rb?: unknown }).rb === other)
  if (victim && victim.team !== proj.team && victim.health) {
    victim.health.hp -= proj.projectile!.damage
    storeRef.remove(proj)
  }
}

export default handleProjectileHit;
