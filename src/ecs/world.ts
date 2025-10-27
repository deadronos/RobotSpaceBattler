import { Query, World } from "miniplex";

export type TeamId = "red" | "blue";
export type WeaponType = "laser" | "gun" | "rocket";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface RobotAIState {
  mode: "seek" | "engage" | "retreat";
  targetId?: string;
  anchorPosition?: Vec3 | null;
  directive?: "offense" | "defense" | "balanced";
}

export interface RobotEntity {
  id: string;
  kind: "robot";
  team: TeamId;
  position: Vec3;
  velocity: Vec3;
  orientation: number;
  weapon: WeaponType;
  fireCooldown: number;
  fireRate: number;
  health: number;
  maxHealth: number;
  ai: RobotAIState;
  kills: number;
  isCaptain: boolean;
  spawnIndex: number;
  lastDamageTimestamp: number;
}

export interface ProjectileEntity {
  id: string;
  kind: "projectile";
  team: TeamId;
  position: Vec3;
  velocity: Vec3;
  damage: number;
  ttl: number;
  weapon: WeaponType;
  sourceId: string;
}

export type SimulationEntity = RobotEntity | ProjectileEntity;

export interface BattleWorld {
  world: World<SimulationEntity>;
  robots: Query<RobotEntity>;
  projectiles: Query<ProjectileEntity>;
}

export function createBattleWorld(): BattleWorld {
  const world = new World<SimulationEntity>();

  const robots = world.where<RobotEntity>(
    (entity): entity is RobotEntity => entity.kind === "robot",
  );
  const projectiles = world.where<ProjectileEntity>(
    (entity): entity is ProjectileEntity => entity.kind === "projectile",
  );

  return { world, robots, projectiles };
}

export function toVec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function cloneVec3(vec: Vec3): Vec3 {
  return { x: vec.x, y: vec.y, z: vec.z };
}
