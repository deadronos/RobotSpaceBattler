import { beforeEach, describe, expect, it, vi } from 'vitest'

type AnyEntity = Record<string, any>

// Create a fake store object with a Map-backed `entities` collection. We'll
// mock the real `miniplexStore` module so the system under test reads from
// this fake store during the tests (no need to touch Rapier or real ECS).
const fakeStore = { entities: new Map<string, AnyEntity>() }

vi.mock('../src/ecs/miniplexStore', () => ({ default: fakeStore }))

import { syncRigidBodiesToECS } from '../src/systems/physicsSync'

describe('syncRigidBodiesToECS', () => {
  beforeEach(() => {
    // Reset the fake store map for test isolation
    fakeStore.entities = new Map()
  })

  it('copies rb.translation() values into entity.position when present', () => {
    const ent: AnyEntity = {
      id: 'e1',
      position: [0, 0, 0],
      rb: {
        translation: () => ({ x: 1.5, y: -2.25, z: 3 }),
      },
    }

    fakeStore.entities.set('e1', ent)

    syncRigidBodiesToECS()

    expect(ent.position).toEqual([1.5, -2.25, 3])
  })

  it("doesn't touch entities that don't have a rigid body", () => {
    const ent: AnyEntity = { id: 'e2', position: [0, 0, 0] }
    fakeStore.entities.set('e2', ent)

    syncRigidBodiesToECS()

    expect(ent.position).toEqual([0, 0, 0])
  })

  it("skips entities whose position isn't a length-3 array (no throw)", () => {
    const ent: AnyEntity = {
      id: 'e3',
      position: [0, 0],
      rb: { translation: () => ({ x: 9, y: 9, z: 9 }) },
    }
    fakeStore.entities.set('e3', ent)

    expect(() => syncRigidBodiesToECS()).not.toThrow()
    // position should remain unchanged because length < 3
    expect(ent.position).toEqual([0, 0])
  })
})
