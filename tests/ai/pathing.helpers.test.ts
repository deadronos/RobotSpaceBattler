import { describe, expect, it } from 'vitest';
import { RobotEntity } from '../../src/ecs/world';
import { TEAM_CONFIGS } from '../../src/lib/teamConfig';
import { lengthVec3, Vec3 } from '../../src/lib/math/vec3';
import {
  clampVelocity,
  computeForwardDirection,
  resolveSpawnCenter,
} from '../../src/simulation/ai/pathing/helpers';

function createRobot(overrides: Partial<RobotEntity> = {}): RobotEntity {
  const base: RobotEntity = {
    id: 'robot',
    kind: 'robot',
    team: 'red',
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    orientation: 0,
    weapon: 'laser',
    speed: 0,
    fireCooldown: 0,
    fireRate: 1,
    health: 100,
    maxHealth: 100,
    ai: {
      mode: 'seek',
      targetId: undefined,
      directive: 'balanced',
      anchorPosition: null,
      anchorDistance: null,
      strafeSign: 1,
      targetDistance: null,
    },
    kills: 0,
    isCaptain: false,
    spawnIndex: 0,
    lastDamageTimestamp: 0,
  };

  return {
    ...base,
    ...overrides,
    position: overrides.position ?? { ...base.position },
    velocity: overrides.velocity ?? { ...base.velocity },
    ai: { ...base.ai, ...(overrides.ai ?? {}) },
  };
}

describe('pathing helpers', () => {
  it('uses the provided spawn center override', () => {
    const robot = createRobot();
    const override: Vec3 = { x: 10, y: 0, z: -20 };
    const context = { spawnCenter: override };

    expect(resolveSpawnCenter(robot, context)).toBe(override);
  });

  it('falls back to the team config spawn center when no override is provided', () => {
    const robot = createRobot({ team: 'blue' });
    const expectedCenter = TEAM_CONFIGS.blue.spawnCenter;

    expect(resolveSpawnCenter(robot)).toBe(expectedCenter);
  });

  it('normalizes planar direction between two points', () => {
    const from: Vec3 = { x: 0, y: 0, z: 0 };
    const to: Vec3 = { x: 3, y: 5, z: 4 };

    const direction = computeForwardDirection(from, to);
    expect(direction.y).toBe(0);
    expect(direction.x).toBeGreaterThan(0);
    expect(direction.z).toBeGreaterThan(0);
    expect(direction.x * direction.x + direction.z * direction.z).toBeCloseTo(1, 5);
  });

  it('clamps velocity to the specified max speed', () => {
    const velocity: Vec3 = { x: 0, y: 0, z: 10 };
    const clamped = clampVelocity(velocity, 5);

    expect(lengthVec3(clamped)).toBeCloseTo(5, 5);
    expect(clamped.z).toBeGreaterThan(0);
  });
});
