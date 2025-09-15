import { beforeEach, describe, expect, it, vi } from 'vitest'

type AnyEntity = Record<string, any>

// Define a hoisted reference for the fake store so the vi.mock factory can
// access it without a temporal dead zone.
const hoisted = vi.hoisted(() => ({
  fakeStore: { entities: new Map<string, AnyEntity>() },
}))

// Mock the real store module to return our hoisted fake store
vi.mock('../src/ecs/miniplexStore', () => ({ default: hoisted.fakeStore }))

import { syncRigidBodiesToECS } from '../src/systems/physicsSync'

describe('syncRigidBodiesToECS', () => {
  beforeEach(() => {
    // Reset the fake store map for test isolation
    hoisted.fakeStore.entities = new Map()
  })

  it('copies rb.translation() values into entity.position when present', () => {
    const ent: AnyEntity = {
      id: 'e1',
      position: [0, 0, 0],
      rb: {
        translation: () => ({ x: 1.5, y: -2.25, z: 3 }),
      },
    }

  hoisted.fakeStore.entities.set('e1', ent)

  // pass the fakeStore directly to avoid any runtime module resolution
  syncRigidBodiesToECS(hoisted.fakeStore)

    expect(ent.position).toEqual([1.5, -2.25, 3])
  })

  it("doesn't touch entities that don't have a rigid body", () => {
    const ent: AnyEntity = { id: 'e2', position: [0, 0, 0] }
  hoisted.fakeStore.entities.set('e2', ent)

  syncRigidBodiesToECS(hoisted.fakeStore)

    expect(ent.position).toEqual([0, 0, 0])
  })

  it("skips entities whose position isn't a length-3 array (no throw)", () => {
    const ent: AnyEntity = {
      id: 'e3',
      position: [0, 0],
      rb: { translation: () => ({ x: 9, y: 9, z: 9 }) },
    }
  hoisted.fakeStore.entities.set('e3', ent)

  expect(() => syncRigidBodiesToECS(hoisted.fakeStore)).not.toThrow()
    // position should remain unchanged because length < 3
    expect(ent.position).toEqual([0, 0])
  })
})
