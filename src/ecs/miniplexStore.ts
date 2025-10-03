import { createEntityLookup } from "./entityLookup";
import {
  createRobotComponent,
  type RobotComponent,
  type RobotInit,
} from "./components/robot";
import type { BeamComponent } from "./components/beam";
import type { ProjectileComponent } from "./components/projectile";
import type { FxComponent } from "./fx";
import { ensureGameplayId, normalizeTeam } from "./id";
import type { Team } from "./id";
import {
  clearPauseVelocity,
  getPauseVelocity,
  setPauseVelocity,
} from "./pauseVelocity";
import { createRenderKeyGenerator } from "./renderKey";
import type { WeaponComponent, WeaponStateComponent } from "./weapons";
import { createWorldController } from "./worldFactory";

export type { Team } from "./id";

export type Vec3 = [number, number, number];

export interface Transform {
  position: Vec3;
  rotation: Vec3; // Euler in radians
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
  speed: 3,
  turnSpeed: 4,
} as const;

export interface Entity extends Partial<Transform>, RigidBodyRef, RenderRef {
  id?: number;
  gameplayId?: string;
  team?: Team;
  hp?: number;
  maxHp?: number;
  alive?: boolean;
  speed?: number;
  turnSpeed?: number;
  targetId?: number | string;
  pauseVel?: { lin?: Vec3; ang?: Vec3 };
  beam?: BeamComponent;
  projectile?: ProjectileComponent;
  weapon?: WeaponComponent;
  weaponState?: WeaponStateComponent;
  fx?: FxComponent;
  robot?: RobotComponent;
  invulnerableUntil?: number;
}

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

export function getGameplayId(entity: Entity): string | undefined {
  return entity.gameplayId ?? entity.robot?.id;
}

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

function cloneVec3(vec: Vec3 | undefined): Vec3 {
  if (!vec) {
    return [0, 0, 0];
  }
  return [vec[0], vec[1], vec[2]];
}

export function createRobotEntity(init: Partial<Entity> = {}): Entity {
  const position = cloneVec3(init.position);
  const rotation = cloneVec3(init.rotation);

  const team = init.team ? normalizeTeam(init.team) : ("red" as Team);

  const baseHp = typeof init.hp === "number" ? init.hp : ROBOT_BASE_STATS.hp;
  const baseMaxHp =
    typeof init.maxHp === "number" ? init.maxHp : ROBOT_BASE_STATS.maxHp;
  const baseAlive = typeof init.alive === "boolean" ? init.alive : baseHp > 0;

  const entity: Entity = {
    position,
    rotation,
    hp: baseHp,
    maxHp: baseMaxHp,
    alive: baseAlive,
    speed: init.speed ?? ROBOT_BASE_STATS.speed,
    turnSpeed: init.turnSpeed ?? ROBOT_BASE_STATS.turnSpeed,
    targetId: init.targetId,
    rigid: init.rigid,
    mesh: init.mesh,
    pauseVel: init.pauseVel,
    beam: init.beam,
    projectile: init.projectile,
    weapon: init.weapon ? { ...init.weapon } : undefined,
    weaponState: init.weaponState ? { ...init.weaponState } : undefined,
    fx: init.fx ? { ...init.fx } : undefined,
    invulnerableUntil:
      init.invulnerableUntil ?? init.robot?.invulnerableUntil ?? 0,
    gameplayId: init.gameplayId,
    team,
  };

  const assignedId = entityLookup.ensureEntityId(entity);
  const numericId = assignedId ?? (entity.id as number);

  const gameplayId = ensureGameplayId(
    entity.gameplayId ?? init.robot?.id ?? numericId,
  );
  entity.gameplayId = gameplayId;

  const robotInit: RobotInit = {
    id: gameplayId,
    team,
    health: {
      current: entity.hp ?? baseHp,
      max: entity.maxHp ?? baseMaxHp,
      alive: entity.alive ?? baseAlive,
    },
    weapon: init.robot?.weapon,
    weaponState: init.robot?.weaponState ?? entity.weaponState,
    invulnerableUntil: entity.invulnerableUntil,
  };

  entity.robot = createRobotComponent(robotInit);
  entity.invulnerableUntil = entity.robot.invulnerableUntil;
  entity.hp = entity.robot.health.current;
  entity.maxHp = entity.robot.health.max;
  entity.alive = entity.robot.health.alive;
  entity.team = entity.robot.team as Team;

  if (entity.weapon) {
    const ownerGameplayId = entity.gameplayId ?? String(numericId);
    if (!entity.weapon.ownerId || entity.weapon.ownerId === "-1") {
      entity.weapon.ownerId = ownerGameplayId;
    } else {
      entity.weapon.ownerId = ensureGameplayId(entity.weapon.ownerId);
    }
    entity.weapon.team = entity.robot.team as Team;
  }

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

export function getInvulnerableUntil(entity: Entity): number {
  return entity.robot?.invulnerableUntil ?? entity.invulnerableUntil ?? 0;
}

export function setInvulnerableUntil(entity: Entity, timestamp: number) {
  entity.invulnerableUntil = timestamp;
  if (entity.robot) {
    entity.robot.invulnerableUntil = timestamp;
  }
}

export function clearInvulnerable(entity: Entity) {
  setInvulnerableUntil(entity, 0);
}
