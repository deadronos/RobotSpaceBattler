import { describe, it, expect, beforeEach } from 'vitest'
import { cleanupProjectiles } from '../src/systems/projectileCleanup'
import { handleProjectileHit } from '../src/systems/projectileOnHit'

type AnyEntity = Record<string, any>

describe('cleanupProjectiles', () => {
  let fakeStore: { entities: Map<string, AnyEntity>; remove: (e: AnyEntity) => void }

  beforeEach(() => {
    fakeStore = {
      entities: new Map(),
      remove: (e: AnyEntity) => {
        // remove by id if present
        for (const [k, v] of fakeStore.entities.entries()) {
          if (v === e) fakeStore.entities.delete(k)
        }
      },
    }
  })

  it('removes projectile when ttl expires', () => {
    const p: AnyEntity = {
      id: 'proj-1',
      position: [0, 0, 0],
      projectile: { ttl: 0.01, damage: 1, velocity: { x: 0, y: 0, z: 0 } },
    }
    fakeStore.entities.set(p.id, p)

    cleanupProjectiles(0.02, fakeStore as any)

    expect(fakeStore.entities.size).toBe(0)
  })

  it('removes projectile when out of bounds', () => {
    const p: AnyEntity = {
      id: 'proj-2',
      position: [1000, 0, 0],
      projectile: { ttl: 10, damage: 1, velocity: { x: 0, y: 0, z: 0 } },
    }
    fakeStore.entities.set(p.id, p)

    cleanupProjectiles(0.01, fakeStore as any)

    expect(fakeStore.entities.size).toBe(0)
  })

  it("doesn't remove projectiles still alive and in bounds", () => {
    const p: AnyEntity = {
      id: 'proj-3',
      position: [0, 0, 0],
      projectile: { ttl: 1, damage: 1, velocity: { x: 0, y: 0, z: 0 } },
    }
    fakeStore.entities.set(p.id, p)

    cleanupProjectiles(0.1, fakeStore as any)

    expect(fakeStore.entities.size).toBe(1)
    expect(fakeStore.entities.get(p.id)).toBe(p)
  })

  it('applies damage and removes projectile on hit', () => {
    // simulate an entity (victim) with a rigid body reference and health
    const victimRb = { id: 'rb-1' }
    const victim: AnyEntity = {
      id: 'victim-1',
      team: 'blue',
      position: [0, 0, 0],
      health: { hp: 10, maxHp: 10 },
      rb: victimRb,
    }

    // projectile entity belonging to opposing team
    const proj: AnyEntity = {
      id: 'proj-hit',
      team: 'red',
      position: [0, 0, 0],
      projectile: { ttl: 1, damage: 3, velocity: { x: 0, y: 0, z: 0 } },
      rb: { id: 'rb-proj' },
    }

    fakeStore.entities.set(victim.id, victim)
    fakeStore.entities.set(proj.id, proj)

    // Use the exported helper to perform hit handling
    handleProjectileHit(proj as any, victimRb as any, fakeStore as any)
    // Damage should be applied immediately, but removal is deferred to cleanup
    expect(victim.health.hp).toBe(7)
    // Run a cleanup tick to remove the projectile with ttl=0
    cleanupProjectiles(0.016, fakeStore as any)
    expect(fakeStore.entities.has(proj.id)).toBe(false)
  })
})
