import { World } from 'miniplex';

// Component types based on SPEC.md
export type Vec3 = [number, number, number];

export type Team = 'red' | 'blue';

export interface Transform {
  position: Vec3;
  rotation: Vec3; // Euler in radians
}

export interface Health {
  hp: number;
  maxHp: number;
  alive: boolean;
}

export interface Weapon {
  range: number;
  power: number;
  cooldown: number; // seconds
  cooldownLeft: number; // seconds
}

export interface RobotStats {
  speed: number; // m/s
  turnSpeed: number; // rad/s (not used yet)
}

export interface Target {
  targetId?: number; // entity id of current target
}

// Rapier RigidBody API is provided by @react-three/rapier
export interface RigidBodyRef {
  // Avoid strict type coupling to @react-three/rapier version
  rigid?: unknown | null;
}

export interface RenderRef {
  mesh?: unknown | null;
}

export type Entity = Partial<
  Transform &
    Health &
    Weapon &
    RobotStats &
    Target & {
      team: Team;
    } &
    RigidBodyRef &
    RenderRef
>;

export const world = new World<Entity>();

// Helper queries
export function getRobots() {
  return Array.from(world.entities).filter((e) => e.team && e.rigid);
}

export function createRobotEntity(init: Partial<Entity>): Entity {
  const entity: Entity = {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    hp: 100,
    maxHp: 100,
    alive: true,
    range: 8,
    power: 10,
    cooldown: 1.0,
    cooldownLeft: 0,
    speed: 3,
    turnSpeed: 4,
    ...init,
  };

  return world.add(entity);
}

export function removeEntity(e: Entity) {
  world.remove(e);
}

export function resetWorld() {
  for (const e of [...world.entities]) world.remove(e);
}
