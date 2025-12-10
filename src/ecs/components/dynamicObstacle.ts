import { Vec3, vec3 } from '../../lib/math/vec3';
import { HazardEffect,HazardSchedule } from './hazardZone';
import { MovementPattern } from './movementPattern';

export type ObstacleShape =
  | { kind: 'box'; halfWidth: number; halfDepth: number; center?: Vec3 }
  | { kind: 'circle'; radius: number; center?: Vec3 };

export type ObstacleType = 'barrier' | 'hazard' | 'destructible';

export interface DynamicObstacle {
  id: string;
  kind: 'obstacle';
  obstacleType: ObstacleType;
  position: Vec3;
  orientation?: number;
  shape?: ObstacleShape;
  blocksVision?: boolean;
  blocksMovement?: boolean;
  active?: boolean;
  movementPattern?: MovementPattern | null;
  hazardSchedule?: HazardSchedule | null;
  hazardEffects?: HazardEffect[] | null;
  durability?: number;
  maxDurability?: number;
}

export function createDefaultDynamicObstacle(overrides: Partial<DynamicObstacle> = {}): DynamicObstacle {
  return {
    id: 'obstacle-default',
    kind: 'obstacle',
    obstacleType: 'barrier',
    position: vec3(0, 0, 0),
    orientation: 0,
    shape: { kind: 'box', halfWidth: 1, halfDepth: 1 },
    blocksVision: true,
    blocksMovement: true,
    active: true,
    movementPattern: null,
    hazardSchedule: null,
    hazardEffects: null,
    durability: undefined,
    maxDurability: undefined,
    ...overrides,
  } as DynamicObstacle;
}
