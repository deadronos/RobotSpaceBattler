import { World } from 'miniplex'
import { createReactAPI } from '@miniplex/react'
import { RapierRigidBody } from '@react-three/rapier'

export type Entity = {
  id: string
  team?: 'red' | 'blue'

  // components
  position?: [number, number, number]
  rigidBody?: RapierRigidBody
  health?: { current: number; max: number }
  weapon?: { range: number; cooldown: number; lastFired: number }
  target?: Entity
  damage?: { target: Entity; amount: number }
}

// Create a world for our entities
export const world = new World<Entity>()

// Create a React API for the world
export const ECS = createReactAPI(world)

// Helper function to add entities to the world
export const addEntity = (entity: Omit<Entity, 'id'>) => {
  return world.add({ ...entity, id: Math.random().toString(36).substr(2, 9) })
}
