import { Vec3 } from '../../lib/math/vec3';

export type MovementPatternType = 'linear' | 'rotation' | 'oscillate';

export interface MovementPattern {
  patternType: MovementPatternType;
  // linear
  points?: Vec3[];
  // rotation
  pivot?: Vec3;
  // common
  speed?: number; // units/sec or radians/sec for rotation
  loop?: boolean;
  pingPong?: boolean;
  phase?: number; // 0..1 seed of progress
  progress?: number; // internal runtime progress (0..1)
  originOffset?: Vec3; // internal runtime: vector from pivot/origin used by rotation
  direction?: 1 | -1;
}

export function createDefaultMovementPattern(overrides: Partial<MovementPattern> = {}): MovementPattern {
  return {
    patternType: 'linear',
    points: [],
    pivot: undefined,
    speed: 1,
    loop: true,
    pingPong: false,
    phase: 0,
    progress: 0,
    direction: 1,
    ...overrides,
  } as MovementPattern;
}
