import type { World as RapierWorld } from '@dimforge/rapier3d-compat';
import type { World as MiniplexWorld } from 'miniplex';

import type { Vec3 } from '../lib/math/vec3';
import type { TeamConfig, TeamId } from '../lib/teamConfig';
import type { VisualInstanceManager } from '../visuals/VisualInstanceManager';
import type { EffectPool } from './pools/EffectPool';
import type { ProjectilePool } from './pools/ProjectilePool';

export type WeaponType = 'laser' | 'gun' | 'rocket' | 'heal';

export type UnitRole = 'assault' | 'tank' | 'sniper' | 'medic';

export interface EnemyMemoryEntry {
  position: Vec3;
  timestamp: number;
}

export interface RobotAIState {
  mode: 'seek' | 'engage' | 'retreat';
  targetId?: string;
  directive?: 'offense' | 'defense' | 'balanced';
  anchorPosition?: Vec3 | null;
  anchorDistance?: number | null;
  strafeSign?: 1 | -1;
  targetDistance?: number | null;
  visibleEnemyIds?: string[];
  enemyMemory?: Record<string, EnemyMemoryEntry>;
  searchPosition?: Vec3 | null;
  roamTarget?: Vec3 | null;
  roamUntil?: number | null;
  blockedFrames?: number;
}

import type { PathComponent } from "../simulation/ai/pathfinding/integration/PathComponent";

export interface RobotEntity {
  id: string;
  kind: 'robot';
  team: TeamId;
  role: UnitRole;
  position: Vec3;
  velocity: Vec3;
  orientation: number;
  speed: number;
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
  slowMultiplier?: number;

  statusFlags?: string[];
  statusExpirations?: Array<{ flag: string; expiresAt: number }>;
  pathComponent: PathComponent;
}

export interface ProjectileEntity {
  id: string;
  kind: 'projectile';
  team: TeamId;
  shooterId: string;
  weapon: WeaponType;
  position: Vec3;
  velocity: Vec3;
  damage: number;
  maxLifetime: number;
  spawnTime: number;
  distanceTraveled: number;
  maxDistance: number;
  speed: number;
  targetId?: string;
  projectileSize?: number;
  projectileColor?: string;
  trailColor?: string;
  aoeRadius?: number;
  explosionDurationMs?: number;
  beamWidth?: number;
  impactDurationMs?: number;
  instanceIndex?: number;
}

export interface ObstacleEntity {
  id: string;
  kind: 'obstacle';
  obstacleType: 'barrier' | 'hazard' | 'destructible';
  position: Vec3;
  orientation?: number;
  shape?:
    | {
        kind: 'box';
        halfWidth: number;
        halfDepth: number;
        center?: { x: number; z: number };
      }
    | { kind: 'circle'; radius: number; center?: { x: number; z: number } };
  blocksVision?: boolean;
  blocksMovement?: boolean;
  active?: boolean;
  durability?: number;
  maxDurability?: number;
  movementPattern?: {
    patternType: 'linear' | 'rotation' | 'oscillate';
    points?: Vec3[];
    pivot?: Vec3;
    speed?: number;
    loop?: boolean;
    pingPong?: boolean;
    phase?: number;
    progress?: number;
    direction?: 1 | -1;
    originOffset?: Vec3;
  } | null;
  hazardSchedule?: {
    periodMs: number;
    activeMs: number;
    offsetMs?: number;
  } | null;
  hazardEffects?: Array<{
    kind: 'damage' | 'slow' | 'status';
    amount: number;
    perSecond?: boolean;
    durationMs?: number;
  }> | null;
}

export type EffectType = 'explosion' | 'impact' | 'laser-impact';

export interface EffectEntity {
  id: string;
  kind: 'effect';
  effectType: EffectType;
  position: Vec3;
  radius: number;
  color: string;
  secondaryColor?: string;
  createdAt: number;
  duration: number;
  instanceIndex?: number;
}

export type BattleEntity =
  | RobotEntity
  | ProjectileEntity
  | EffectEntity
  | ObstacleEntity;

export interface Store<T extends BattleEntity> {
  entities: T[];
}

export interface BattleWorldState {
  elapsedMs: number;
  nextProjectileId: number;
  nextEffectId: number;
  seed: number;
  frameIndex: number;
}

export interface BattleWorld {
  world: MiniplexWorld<BattleEntity>;
  robots: Store<RobotEntity>;
  projectiles: Store<ProjectileEntity>;
  effects: Store<EffectEntity>;
  obstacles: Store<ObstacleEntity>;
  teams: Record<TeamId, TeamConfig>;
  state: BattleWorldState;
  rapierWorld?: RapierWorld;
  clear: () => void;
  getRobotsByTeam(team: TeamId): RobotEntity[];
  visuals: {
    instanceManager: VisualInstanceManager;
  };
  pools: {
    projectiles: ProjectilePool;
    effects: EffectPool;
  };
  addProjectile: (projectile: ProjectileEntity) => void;
  removeProjectile: (projectile: ProjectileEntity) => void;
  addEffect: (effect: EffectEntity) => void;
  removeEffect: (effect: EffectEntity) => void;
}
