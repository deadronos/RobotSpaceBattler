import { describe, expect, test } from 'vitest'

import type { Entity } from '../src/ecs/types'
import { cleanupProjectiles } from '../src/systems/projectileCleanup'
import { handleProjectileHit } from '../src/systems/projectileOnHit'

function makeStore(initial: Entity[]) {
  return {
    entities: new Map(initial.map((e) => [e.id, e])),
    removeCalls: [] as string[],
    remove(e: Entity) {
      this.removeCalls.push(e.id)
      this.entities.delete(e.id)
    },
  }
}

describe('projectile hit/removal flow', () => {
  test('handleProjectileHit defers removal (ttl=0) and cleanup removes next frame', () => {
    const victim: Entity = {
      id: 'bot-1',
      team: 'red',
      position: [0, 0, 0],
      health: { hp: 10, maxHp: 10 },
      rb: { translation: () => ({ x: 0, y: 0, z: 0 }) },
    }
    const proj: Entity = {
      id: 'proj-1',
      team: 'blue',
      position: [0, 0, 0],
      projectile: { ttl: 1, damage: 3, radius: 0.1, velocity: { x: 0, y: 0, z: 0 } },
      rb: {},
    }
    const store = makeStore([victim, proj])

    // Hit: should decrement victim hp and NOT remove the projectile immediately
    handleProjectileHit(proj, victim.rb, store as any)
    expect(victim.health?.hp).toBe(7)
    expect(proj.projectile?.ttl).toBe(0)
    expect(store.removeCalls.length).toBe(0)

    // Next frame cleanup: should mark/destroy and remove
    cleanupProjectiles(0.016, store as any)
    expect(store.removeCalls).toEqual(['proj-1'])
    // The projectile entity should be gone
    expect(store.entities.has('proj-1')).toBe(false)
  })
})

