import { createEntityLookup } from "./entityLookup";
import { createRenderKeyGenerator } from "./renderKey";
import { clearPauseVelocity, getPauseVelocity, setPauseVelocity } from "./pauseVelocity";
import { createWorldController } from "./worldFactory";

import type { FxComponent } from "./fx";
import type {
  BeamComponent,
  ProjectileComponent,
  WeaponComponent,
  WeaponStateComponent,
} from "./weapons";

export type Vec3 = [number, number, number];

export type Team = "red" | "blue";

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

export interface RigidBodyRef {
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
    } & RigidBodyRef &
    RenderRef & {
      pauseVel?: { lin?: Vec3; ang?: Vec3 };
      beam?: BeamComponent;
      projectile?: ProjectileComponent;
      weapon?: WeaponComponent;
      weaponState?: WeaponStateComponent;
      fx?: FxComponent;
    }
>;

const entityLookup = createEntityLookup<Entity>();
const worldController = createWorldController<Entity>({
  onEntityAdded: (entity) => entityLookup.track(entity),
  onEntityRemoved: (entity) => entityLookup.untrack(entity),
});
const renderKeyGenerator = createRenderKeyGenerator<Entity>();

export const { world } = worldController;

export const subscribeEntityChanges = entityLookup.subscribe;

export const notifyEntityChanged = (entity: Entity | undefined) =>
  entityLookup.notify(entity);

export const getEntityById = (id: number) => entityLookup.getById(id);

export function getRobots() {
  return Array.from(world.entities).filter((e) => e.team && e.rigid);
}

export function setPauseVel(entity: Entity, lin?: Vec3, ang?: Vec3) {
  setPauseVelocity(entity, lin, ang);
}

export function getPauseVel(entity: Entity) {
  return getPauseVelocity(entity);
}

export function clearPauseVel(entity: Entity) {
  clearPauseVelocity(entity);
}

export function createRobotEntity(init: Partial<Entity>): Entity {
  const entity: Entity = {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    ...ROBOT_BASE_STATS,
    ...init,
  };

  entityLookup.ensureEntityId(entity);
  const added = worldController.add(entity);
  entityLookup.track(added);
  return added;
}

export function removeEntity(entity: Entity) {
  worldController.remove(entity);
}

export function resetWorld() {
  worldController.reset();
  entityLookup.clear();
}

export function getRenderKey(entity: Entity, fallbackIndex?: number) {
  return renderKeyGenerator(entity, fallbackIndex);
}
