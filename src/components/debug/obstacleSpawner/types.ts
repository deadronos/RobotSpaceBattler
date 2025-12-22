export type ObstacleKind = 'barrier' | 'hazard' | 'destructible';

export type MovementKind = 'none' | 'linear' | 'oscillate' | 'rotation';

export interface FormState {
  id: string;
  counter: number;
  type: ObstacleKind;
  posX: number;
  posZ: number;
  halfWidth: number;
  halfDepth: number;
  radius: number;
  blocksVision: boolean;
  blocksMovement: boolean;
  active: boolean;
  movementEnabled: boolean;
  movementKind: MovementKind;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  pivotX: number;
  pivotZ: number;
  movementSpeed: number;
  hazardPeriod: number;
  hazardActive: number;
  hazardOffset: number;
  hazardDamage: number;
  durability: number;
}

export const initialForm: FormState = {
  id: 'debug-obstacle-1',
  counter: 1,
  type: 'barrier',
  posX: 0,
  posZ: 0,
  halfWidth: 1,
  halfDepth: 1,
  radius: 3,
  blocksVision: true,
  blocksMovement: true,
  active: true,
  movementEnabled: false,
  movementKind: 'none',
  startX: -2,
  startZ: 0,
  endX: 2,
  endZ: 0,
  pivotX: 0,
  pivotZ: 0,
  movementSpeed: 2,
  hazardPeriod: 2500,
  hazardActive: 800,
  hazardOffset: 0,
  hazardDamage: 4,
  durability: 8,
};
