import { World } from 'miniplex';

import type { FxComponent } from './fx';
import type {
  BeamComponent,
  ProjectileComponent,
  WeaponComponent,
  WeaponStateComponent,
} from './weapons';

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

export const ROBOT_BASE_STATS = {
  hp: 100,
  maxHp: 100,
  alive: true,
  range: 8,
  power: 10,
  cooldown: 1.0,
  cooldownLeft: 0,
  speed: 3,
  turnSpeed: 4,
} as const satisfies Partial<Entity>;

export type Entity = Partial<
  Transform &
    Health &
    Weapon &
    RobotStats &
    Target & {
      id: string | number;
      team: Team;
    } &
    RigidBodyRef &
    RenderRef & {
      // Ephemeral component used to store paused velocities when pausing the simulation
      pauseVel?: { lin?: Vec3; ang?: Vec3 };
      beam?: BeamComponent;
      projectile?: ProjectileComponent;
      weapon?: WeaponComponent;
      weaponState?: WeaponStateComponent;
      fx?: FxComponent;
    }
>;

export const world = new World<Entity>();

let nextEntityId = 1;
const entityLookup = new Map<number, Entity>();

type EntityChangeListener = (entity: Entity | undefined) => void;
const entityChangeListeners = new Set<EntityChangeListener>();

export function subscribeEntityChanges(listener: EntityChangeListener) {
  entityChangeListeners.add(listener);
  return () => {
    entityChangeListeners.delete(listener);
  };
}

export function notifyEntityChanged(entity: Entity | undefined) {
  if (entityChangeListeners.size === 0) return;
  for (const listener of entityChangeListeners) {
    try {
      listener(entity);
    } catch {
      // Listener errors are swallowed to keep simulation running.
    }
  }
}

export function getEntityById(id: number) {
  return entityLookup.get(id);
}

// Helper queries
export function getRobots() {
  return Array.from(world.entities).filter((e) => e.team && e.rigid);
}

// pauseVel helpers - small ECS-style API for ephemeral pause velocity component
export function setPauseVel(entity: Entity, lin?: Vec3, ang?: Vec3) {
  entity.pauseVel = entity.pauseVel ?? {};
  if (lin) entity.pauseVel.lin = lin;
  if (ang) entity.pauseVel.ang = ang;
}

export function getPauseVel(entity: Entity) {
  return entity.pauseVel;
}

export function clearPauseVel(entity: Entity) {
  if (entity.pauseVel) delete entity.pauseVel;
}

export function createRobotEntity(init: Partial<Entity>): Entity {
  const entity: Entity = {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    ...ROBOT_BASE_STATS,
    ...init,
  };

  if (typeof entity.id !== 'number') {
    entity.id = nextEntityId++;
  }

  const added = world.add(entity);

  if (typeof added.id === 'number') {
    entityLookup.set(added.id, added);
  }

  return added;
}

export function removeEntity(e: Entity) {
  if (typeof e.id === 'number') {
    entityLookup.delete(e.id);
  }
  world.remove(e);
}

export function resetWorld() {
  for (const e of [...world.entities]) {
    removeEntity(e);
  }
  entityLookup.clear();
  nextEntityId = 1;
}





